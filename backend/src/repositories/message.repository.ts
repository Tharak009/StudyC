import { Types, type UpdateQuery } from "mongoose";
import { Message, type IMessage, type MessageDocument } from "../models/message.model.js";

export interface CreateMessageData {
  communityId: string;
  channelId?: string;
  senderId: string;
  content: string;
  messageType: IMessage["messageType"];
  attachments: IMessage["attachments"];
  replyTo?: string;
  intent?: IMessage["intent"];
  codeSnippet?: IMessage["codeSnippet"];
  isForwarded?: boolean;
  forwardedFrom?: string;
}

export interface MessageListOptions {
  communityId: string;
  channelId?: string;
  pinnedOnly?: boolean;
  page: number;
  limit: number;
  order: "latest" | "oldest";
  userId?: string;
}

export class MessageRepository {
  create(input: CreateMessageData): Promise<MessageDocument> {
    return Message.create(input);
  }

  findById(id: string): Promise<MessageDocument | null> {
    return Message.findById(id)
      .populate("senderId", "fullName rollNumber profilePicture karma")
      .populate("deletedBy", "fullName rollNumber")
      .populate({
        path: "replyTo",
        select: "content senderId deleted isDeletedForEveryone codeSnippet intent messageType attachments",
        populate: { path: "senderId", select: "fullName karma" }
      })
      .populate({
        path: "forwardedFrom",
        select: "content senderId messageType",
        populate: { path: "senderId", select: "fullName" }
      })
      .exec();
  }

  async list({ communityId, channelId, pinnedOnly, page, limit, order, userId }: MessageListOptions) {
    const sortDirection = order === "latest" ? -1 : 1;
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = { communityId, deleted: { $ne: true } };
    if (channelId) {
      filter.channelId = channelId;
    }
    if (pinnedOnly) {
      filter.isPinned = true;
    }
    if (userId) {
      filter.deletedFor = { $ne: userId };
    }
    const [items, total] = await Promise.all([
      Message.find(filter)
        .sort({ createdAt: sortDirection, _id: sortDirection })
        .skip(skip)
        .limit(limit)
        .populate("senderId", "fullName rollNumber profilePicture karma")
        .populate("deletedBy", "fullName rollNumber")
        .populate({
          path: "replyTo",
          select: "content senderId deleted isDeletedForEveryone codeSnippet intent messageType",
          populate: { path: "senderId", select: "fullName karma" }
        })
        .populate({
          path: "forwardedFrom",
          select: "content senderId messageType",
          populate: { path: "senderId", select: "fullName" }
        })
        .exec(),
      Message.countDocuments(filter)
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) || 1, order };
  }

  updateById(id: string, update: UpdateQuery<IMessage>): Promise<MessageDocument | null> {
    return Message.findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .populate("senderId", "fullName rollNumber profilePicture")
      .populate("deletedBy", "fullName rollNumber")
      .populate({
        path: "replyTo",
        select: "content senderId deleted isDeletedForEveryone codeSnippet intent messageType attachments",
        populate: { path: "senderId", select: "fullName" }
      })
      .populate({
        path: "forwardedFrom",
        select: "content senderId messageType",
        populate: { path: "senderId", select: "fullName" }
      })
      .exec();
  }

  async toggleStar(messageId: string, userId: string): Promise<{ isStarred: boolean; message: MessageDocument | null }> {
    const userObjectId = new Types.ObjectId(userId);
    const existing = await Message.findById(messageId).exec();
    if (!existing) return { isStarred: false, message: null };

    const isStarred = existing.starredBy?.some((id) => id.toString() === userId) ?? false;
    const update = isStarred
      ? { $pull: { starredBy: userObjectId } }
      : { $addToSet: { starredBy: userObjectId } };

    const updated = await Message.findByIdAndUpdate(messageId, update, { new: true })
      .populate("senderId", "fullName rollNumber profilePicture karma")
      .populate("deletedBy", "fullName rollNumber")
      .populate({
        path: "replyTo",
        select: "content senderId deleted isDeletedForEveryone codeSnippet intent messageType attachments",
        populate: { path: "senderId", select: "fullName" }
      })
      .populate({
        path: "forwardedFrom",
        select: "content senderId messageType",
        populate: { path: "senderId", select: "fullName" }
      })
      .exec();

    return { isStarred: !isStarred, message: updated };
  }

  async togglePin(messageId: string, userId?: string): Promise<{ isPinned: boolean; message: MessageDocument | null }> {
    const existing = await Message.findById(messageId).exec();
    if (!existing) return { isPinned: false, message: null };

    const newPinned = !existing.isPinned;
    const updated = await Message.findByIdAndUpdate(
      messageId,
      {
        $set: {
          isPinned: newPinned,
          pinnedAt: newPinned ? new Date() : null,
          pinnedBy: newPinned && userId ? userId : null
        }
      },
      { new: true }
    )
      .populate("senderId", "fullName rollNumber profilePicture karma")
      .populate("deletedBy", "fullName rollNumber")
      .populate({
        path: "replyTo",
        select: "content senderId deleted isDeletedForEveryone codeSnippet intent messageType attachments",
        populate: { path: "senderId", select: "fullName" }
      })
      .populate({
        path: "forwardedFrom",
        select: "content senderId messageType",
        populate: { path: "senderId", select: "fullName" }
      })
      .exec();

    return { isPinned: newPinned, message: updated };
  }

  async listStarred(communityId: string, userId: string, channelId?: string): Promise<MessageDocument[]> {
    const userObjectId = new Types.ObjectId(userId);
    const filter: Record<string, unknown> = {
      communityId,
      starredBy: userObjectId,
      deleted: { $ne: true },
      deletedFor: { $ne: userObjectId }
    };
    if (channelId) filter.channelId = channelId;

    return Message.find(filter)
      .sort({ createdAt: -1 })
      .populate("senderId", "fullName rollNumber profilePicture karma")
      .populate({
        path: "replyTo",
        select: "content senderId deleted isDeletedForEveryone codeSnippet intent messageType attachments",
        populate: { path: "senderId", select: "fullName" }
      })
      .populate({
        path: "forwardedFrom",
        select: "content senderId messageType",
        populate: { path: "senderId", select: "fullName" }
      })
      .exec();
  }

  async bulkDeleteForMe(communityId: string, messageIds: string[], userId: string): Promise<number> {
    const userObjectId = new Types.ObjectId(userId);
    const result = await Message.updateMany(
      {
        communityId,
        _id: { $in: messageIds },
        deletedFor: { $ne: userObjectId }
      },
      {
        $addToSet: { deletedFor: userObjectId }
      }
    ).exec();
    return result.modifiedCount;
  }

  async bulkStar(communityId: string, messageIds: string[], userId: string, star: boolean): Promise<number> {
    const userObjectId = new Types.ObjectId(userId);
    const update = star
      ? { $addToSet: { starredBy: userObjectId } }
      : { $pull: { starredBy: userObjectId } };

    const result = await Message.updateMany(
      {
        communityId,
        _id: { $in: messageIds },
        deleted: { $ne: true }
      },
      update
    ).exec();
    return result.modifiedCount;
  }
}

export const messageRepository = new MessageRepository();
