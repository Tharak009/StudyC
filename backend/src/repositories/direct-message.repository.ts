import type { UpdateQuery } from "mongoose";
import { DirectMessage, type IDirectMessage, type DirectMessageDocument } from "../models/direct-message.model.js";
import { Conversation } from "../models/conversation.model.js";

export interface CreateDirectMessageData {
  conversationId: string;
  senderId: string;
  content: string;
  messageType: IDirectMessage["messageType"];
  attachments: IDirectMessage["attachments"];
  replyTo?: string;
}

export interface DirectMessageListOptions {
  conversationId: string;
  page: number;
  limit: number;
  order: "latest" | "oldest";
  search?: string;
}

export class DirectMessageRepository {
  create(input: CreateDirectMessageData): Promise<DirectMessageDocument> {
    return DirectMessage.create(input);
  }

  findById(id: string): Promise<DirectMessageDocument | null> {
    return DirectMessage.findById(id)
      .populate("senderId", "fullName rollNumber profilePicture")
      .populate({
        path: "replyTo",
        select: "content senderId deleted",
        populate: { path: "senderId", select: "fullName" }
      })
      .exec();
  }

  async list({ conversationId, page, limit, order, search }: DirectMessageListOptions) {
    const sortDirection = order === "latest" ? -1 : 1;
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = { conversationId, deleted: { $ne: true } };
    if (search) filter.content = { $regex: search, $options: "i" };
    const [items, total] = await Promise.all([
      DirectMessage.find(filter)
        .sort({ createdAt: sortDirection, _id: sortDirection })
        .skip(skip)
        .limit(limit)
        .populate("senderId", "fullName rollNumber profilePicture")
        .populate({
          path: "replyTo",
          select: "content senderId deleted",
          populate: { path: "senderId", select: "fullName" }
        })
        .exec(),
      DirectMessage.countDocuments(filter)
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) || 1, order };
  }

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    await DirectMessage.updateMany(
      { conversationId, senderId: { $ne: userId }, read: false },
      { $set: { read: true, readAt: new Date() } }
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
      .populate({
        path: "replyTo",
        select: "content senderId deleted",
        populate: { path: "senderId", select: "fullName" }
      })
      .exec();
  }
}

export const directMessageRepository = new DirectMessageRepository();
