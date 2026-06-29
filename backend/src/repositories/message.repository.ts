import type { UpdateQuery } from "mongoose";
import { Message, type IMessage, type MessageDocument } from "../models/message.model.js";

export interface CreateMessageData {
  communityId: string;
  senderId: string;
  content: string;
  messageType: IMessage["messageType"];
  attachments: IMessage["attachments"];
  replyTo?: string;
}

export interface MessageListOptions {
  communityId: string;
  page: number;
  limit: number;
  order: "latest" | "oldest";
}

export class MessageRepository {
  create(input: CreateMessageData): Promise<MessageDocument> {
    return Message.create(input);
  }

  findById(id: string): Promise<MessageDocument | null> {
    return Message.findById(id)
      .populate("senderId", "fullName rollNumber profilePicture")
      .populate({
        path: "replyTo",
        select: "content senderId deleted",
        populate: { path: "senderId", select: "fullName" }
      })
      .exec();
  }

  async list({ communityId, page, limit, order }: MessageListOptions) {
    const sortDirection = order === "latest" ? -1 : 1;
    const skip = (page - 1) * limit;
    const filter = { communityId, deleted: { $ne: true } };
    const [items, total] = await Promise.all([
      Message.find(filter)
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
      Message.countDocuments(filter)
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) || 1, order };
  }

  updateById(id: string, update: UpdateQuery<IMessage>): Promise<MessageDocument | null> {
    return Message.findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .populate("senderId", "fullName rollNumber profilePicture")
      .populate({
        path: "replyTo",
        select: "content senderId deleted",
        populate: { path: "senderId", select: "fullName" }
      })
      .exec();
  }
}

export const messageRepository = new MessageRepository();
