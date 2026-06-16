import type { UpdateQuery } from "mongoose";
import { Conversation, type IConversation, type ConversationDocument } from "../models/conversation.model.js";

export interface CreateConversationData {
  participants: string[];
}

export interface ConversationListOptions {
  userId: string;
  page: number;
  limit: number;
  search?: string;
}

export class ConversationRepository {
  async create(input: CreateConversationData): Promise<ConversationDocument> {
    return Conversation.create(input);
  }

  async findExisting(userIdA: string, userIdB: string): Promise<ConversationDocument | null> {
    return Conversation.findOne({
      participants: { $all: [userIdA, userIdB], $size: 2 }
    }).exec();
  }

  findById(id: string): Promise<ConversationDocument | null> {
    return Conversation.findById(id)
      .populate("participants", "fullName rollNumber profilePicture department")
      .exec();
  }

  async list({ userId, page, limit, search }: ConversationListOptions) {
    const filter: Record<string, unknown> = { participants: userId };
    if (search) {
      filter["lastMessage.content"] = { $regex: search, $options: "i" };
    }
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Conversation.find(filter)
        .sort({ lastMessageAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate("participants", "fullName rollNumber profilePicture department")
        .exec(),
      Conversation.countDocuments(filter)
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) || 1 };
  }

  async listByParticipants(userIdA: string, userIdB: string) {
    return Conversation.findOne({
      participants: { $all: [userIdA, userIdB], $size: 2 }
    }).exec();
  }

  updateById(id: string, update: UpdateQuery<IConversation>): Promise<ConversationDocument | null> {
    return Conversation.findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .populate("participants", "fullName rollNumber profilePicture department")
      .exec();
  }
}

export const conversationRepository = new ConversationRepository();
