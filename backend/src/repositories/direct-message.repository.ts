import { Types, type UpdateQuery } from "mongoose";
import { DirectMessage, type IDirectMessage, type DirectMessageDocument } from "../models/direct-message.model.js";
import { Conversation } from "../models/conversation.model.js";

export interface CreateDirectMessageData {
  conversationId: string;
  senderId: string;
  content: string;
  messageType: IDirectMessage["messageType"];
  attachments: IDirectMessage["attachments"];
  replyTo?: string;
  clientMessageId?: string;
  delivered?: boolean;
  deliveredAt?: Date;
  isForwarded?: boolean;
  forwardedFrom?: string;
}

export interface DirectMessageListOptions {
  conversationId: string;
  page: number;
  limit: number;
  order: "latest" | "oldest";
  search?: string;
  userId?: string;
}

export class DirectMessageRepository {
  create(input: CreateDirectMessageData): Promise<DirectMessageDocument> {
    return DirectMessage.create(input);
  }

  findById(id: string): Promise<DirectMessageDocument | null> {
    return DirectMessage.findById(id)
      .populate("senderId", "fullName rollNumber profilePicture")
      .populate("deletedBy", "fullName rollNumber")
      .populate("pinnedBy", "fullName rollNumber")
      .populate({
        path: "replyTo",
        select: "content senderId deleted isDeletedForEveryone messageType attachments",
        populate: { path: "senderId", select: "fullName" }
      })
      .populate({
        path: "forwardedFrom",
        select: "content senderId messageType",
        populate: { path: "senderId", select: "fullName" }
      })
      .exec();
  }

  async findByClientMessageId(conversationId: string, clientMessageId: string): Promise<DirectMessageDocument | null> {
    return DirectMessage.findOne({ conversationId, clientMessageId })
      .populate("senderId", "fullName rollNumber profilePicture")
      .populate("deletedBy", "fullName rollNumber")
      .populate("pinnedBy", "fullName rollNumber")
      .populate({
        path: "replyTo",
        select: "content senderId deleted isDeletedForEveryone messageType attachments",
        populate: { path: "senderId", select: "fullName" }
      })
      .populate({
        path: "forwardedFrom",
        select: "content senderId messageType",
        populate: { path: "senderId", select: "fullName" }
      })
      .exec();
  }

  async list({ conversationId, page, limit, order, search, userId }: DirectMessageListOptions) {
    const sortDirection = order === "latest" ? -1 : 1;
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = { conversationId, deleted: { $ne: true } };
    if (search) filter.content = { $regex: search, $options: "i" };
    if (userId) filter.deletedFor = { $ne: userId };
    const [items, total] = await Promise.all([
      DirectMessage.find(filter)
        .sort({ createdAt: sortDirection, _id: sortDirection })
        .skip(skip)
        .limit(limit)
        .populate("senderId", "fullName rollNumber profilePicture")
        .populate("deletedBy", "fullName rollNumber")
        .populate("pinnedBy", "fullName rollNumber")
        .populate({
          path: "replyTo",
          select: "content senderId deleted isDeletedForEveryone messageType",
          populate: { path: "senderId", select: "fullName" }
        })
        .populate({
          path: "forwardedFrom",
          select: "content senderId messageType",
          populate: { path: "senderId", select: "fullName" }
        })
        .exec(),
      DirectMessage.countDocuments(filter)
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) || 1, order };
  }

  async markAsDelivered(conversationId: string, userId: string): Promise<void> {
    await DirectMessage.updateMany(
      { conversationId, senderId: { $ne: userId }, delivered: false },
      { $set: { delivered: true, deliveredAt: new Date() } }
    ).exec();
  }

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    await DirectMessage.updateMany(
      { conversationId, senderId: { $ne: userId }, read: false },
      { $set: { read: true, readAt: new Date(), delivered: true, deliveredAt: new Date() } }
    ).exec();
  }

  async markMessageRead(messageId: string): Promise<DirectMessageDocument | null> {
    return DirectMessage.findByIdAndUpdate(
      messageId,
      { $set: { read: true, readAt: new Date() } },
      { new: true }
    ).exec();
  }

  async countUnread(conversationId: string, userId: string): Promise<number> {
    return DirectMessage.countDocuments({
      conversationId,
      senderId: { $ne: userId },
      read: false,
      deleted: { $ne: true }
    }).exec();
  }

  async countUnreadByUser(userId: string): Promise<number> {
    const conversations = await Conversation.find(
      { participants: userId },
      { _id: 1 }
    ).lean().exec();
    const conversationIds = conversations.map((c) => c._id);
    if (conversationIds.length === 0) return 0;
    return DirectMessage.countDocuments({
      conversationId: { $in: conversationIds },
      senderId: { $ne: userId },
      read: false,
      deleted: { $ne: true }
    }).exec();
  }

  updateById(id: string, update: UpdateQuery<IDirectMessage>): Promise<DirectMessageDocument | null> {
    return DirectMessage.findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .populate("senderId", "fullName rollNumber profilePicture")
      .populate("deletedBy", "fullName rollNumber")
      .populate("pinnedBy", "fullName rollNumber")
      .populate({
        path: "replyTo",
        select: "content senderId deleted isDeletedForEveryone messageType attachments",
        populate: { path: "senderId", select: "fullName" }
      })
      .populate({
        path: "forwardedFrom",
        select: "content senderId messageType",
        populate: { path: "senderId", select: "fullName" }
      })
      .exec();
  }

  async toggleStar(messageId: string, userId: string): Promise<{ isStarred: boolean; message: DirectMessageDocument | null }> {
    const userObjectId = new Types.ObjectId(userId);
    const existing = await DirectMessage.findById(messageId).exec();
    if (!existing) return { isStarred: false, message: null };

    const isStarred = existing.starredBy?.some((id) => id.toString() === userId) ?? false;
    const update = isStarred
      ? { $pull: { starredBy: userObjectId } }
      : { $addToSet: { starredBy: userObjectId } };

    const updated = await DirectMessage.findByIdAndUpdate(messageId, update, { new: true })
      .populate("senderId", "fullName rollNumber profilePicture")
      .populate("deletedBy", "fullName rollNumber")
      .populate("pinnedBy", "fullName rollNumber")
      .populate({
        path: "replyTo",
        select: "content senderId deleted isDeletedForEveryone messageType attachments",
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

  async togglePin(messageId: string, userId: string): Promise<{ isPinned: boolean; message: DirectMessageDocument | null }> {
    const existing = await DirectMessage.findById(messageId).exec();
    if (!existing) return { isPinned: false, message: null };

    const newPinned = !existing.isPinned;
    const update = newPinned
      ? { $set: { isPinned: true, pinnedAt: new Date(), pinnedBy: new Types.ObjectId(userId) } }
      : { $set: { isPinned: false }, $unset: { pinnedAt: 1, pinnedBy: 1 } };

    const updated = await DirectMessage.findByIdAndUpdate(messageId, update, { new: true })
      .populate("senderId", "fullName rollNumber profilePicture")
      .populate("deletedBy", "fullName rollNumber")
      .populate("pinnedBy", "fullName rollNumber")
      .populate({
        path: "replyTo",
        select: "content senderId deleted isDeletedForEveryone messageType attachments",
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

  async listStarred(conversationId: string, userId: string): Promise<DirectMessageDocument[]> {
    const userObjectId = new Types.ObjectId(userId);
    return DirectMessage.find({
      conversationId,
      starredBy: userObjectId,
      deleted: { $ne: true },
      deletedFor: { $ne: userObjectId }
    })
      .sort({ createdAt: -1 })
      .populate("senderId", "fullName rollNumber profilePicture")
      .populate({
        path: "replyTo",
        select: "content senderId deleted isDeletedForEveryone messageType attachments",
        populate: { path: "senderId", select: "fullName" }
      })
      .populate({
        path: "forwardedFrom",
        select: "content senderId messageType",
        populate: { path: "senderId", select: "fullName" }
      })
      .exec();
  }

  async listPinned(conversationId: string): Promise<DirectMessageDocument[]> {
    return DirectMessage.find({
      conversationId,
      isPinned: true,
      deleted: { $ne: true }
    })
      .sort({ pinnedAt: -1, createdAt: -1 })
      .populate("senderId", "fullName rollNumber profilePicture")
      .populate("pinnedBy", "fullName rollNumber")
      .populate({
        path: "replyTo",
        select: "content senderId deleted isDeletedForEveryone messageType attachments",
        populate: { path: "senderId", select: "fullName" }
      })
      .populate({
        path: "forwardedFrom",
        select: "content senderId messageType",
        populate: { path: "senderId", select: "fullName" }
      })
      .exec();
  }

  async bulkDeleteForMe(conversationId: string, messageIds: string[], userId: string): Promise<number> {
    const userObjectId = new Types.ObjectId(userId);
    const result = await DirectMessage.updateMany(
      {
        conversationId,
        _id: { $in: messageIds },
        deletedFor: { $ne: userObjectId }
      },
      {
        $addToSet: { deletedFor: userObjectId }
      }
    ).exec();
    return result.modifiedCount;
  }

  async bulkStar(conversationId: string, messageIds: string[], userId: string, star: boolean): Promise<number> {
    const userObjectId = new Types.ObjectId(userId);
    const update = star
      ? { $addToSet: { starredBy: userObjectId } }
      : { $pull: { starredBy: userObjectId } };

    const result = await DirectMessage.updateMany(
      {
        conversationId,
        _id: { $in: messageIds },
        deleted: { $ne: true }
      },
      update
    ).exec();
    return result.modifiedCount;
  }
}

export const directMessageRepository = new DirectMessageRepository();
