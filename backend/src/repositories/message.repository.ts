import type { UpdateQuery } from "mongoose";
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
}

export interface MessageListOptions {
  communityId: string;
  channelId?: string;
  pinnedOnly?: boolean;
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
      .populate("senderId", "fullName rollNumber profilePicture karma")
      .populate({
        path: "replyTo",
        select: "content senderId deleted codeSnippet intent",
        populate: { path: "senderId", select: "fullName karma" }
      })
      .exec();
  }

  async list({ communityId, channelId, pinnedOnly, page, limit, order }: MessageListOptions) {
    const sortDirection = order === "latest" ? -1 : 1;
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = { communityId, deleted: { $ne: true } };
    if (channelId) {
      filter.channelId = channelId;
    }
    if (pinnedOnly) {
      filter.isPinned = true;
    }
    const [items, total] = await Promise.all([
      Message.find(filter)
        .sort({ createdAt: sortDirection, _id: sortDirection })
        .skip(skip)
        .limit(limit)
        .populate("senderId", "fullName rollNumber profilePicture karma")
        .populate({
          path: "replyTo",
          select: "content senderId deleted codeSnippet intent",
          populate: { path: "senderId", select: "fullName karma" }
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
