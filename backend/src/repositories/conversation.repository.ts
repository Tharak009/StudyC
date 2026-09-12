import type { UpdateQuery } from "mongoose";
import { Conversation, type IConversation, type ConversationDocument } from "../models/conversation.model.js";
import { DirectMessage } from "../models/direct-message.model.js";

export interface CreateConversationData {
  participants: string[];
}

export interface ConversationListOptions {
  userId: string;
  page: number;
  limit: number;
  search?: string;
  archived?: boolean;
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

  async list({ userId, page, limit, search, archived }: ConversationListOptions) {
    const filter: Record<string, unknown> = { participants: userId };
    if (archived) {
      filter.archivedBy = userId;
    } else {
      filter.archivedBy = { $ne: userId };
    }

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

    // Enrich with computed unreadCount, isPinned, isMuted, isArchived
    const enrichedItems = await Promise.all(
      items.map(async (c) => {
        const rawCount = await DirectMessage.countDocuments({
          conversationId: c._id,
          senderId: { $ne: userId },
          read: false,
          deleted: { $ne: true }
        }).exec();

        const isManualUnread = c.unreadBy?.some((p: any) => p.toString() === userId) || false;
        const unreadCount = rawCount > 0 ? rawCount : isManualUnread ? 1 : 0;
        const isPinned = c.pinnedBy?.some((p: any) => p.toString() === userId) || false;
        const isMuted = c.mutedBy?.some((p: any) => p.toString() === userId) || false;
        const isArchived = c.archivedBy?.some((p: any) => p.toString() === userId) || false;

        // Find latest valid message for this user (filtering out deleted and deletedFor)
        const latestMsg = await DirectMessage.findOne({
          conversationId: c._id,
          deleted: { $ne: true },
          deletedFor: { $ne: userId }
        })
          .sort({ createdAt: -1 })
          .exec();

        let effectiveLastMessage = null;
        if (latestMsg) {
          effectiveLastMessage = {
            content: latestMsg.isDeletedForEveryone
              ? "🗑️ This message was deleted"
              : latestMsg.content || (latestMsg.attachments?.length ? "📎 Attachment" : ""),
            senderId: latestMsg.senderId,
            createdAt: latestMsg.createdAt
          };
        }

        const obj = c.toObject ? c.toObject() : c;
        return {
          ...obj,
          lastMessage: effectiveLastMessage,
          unreadCount,
          isPinned,
          isMuted,
          isArchived
        };
      })
    );

    // Sticky pinned conversations to top, then sorted by lastMessageAt: -1
    enrichedItems.sort((a, b) => {
      const aPinned = a.isPinned ? 1 : 0;
      const bPinned = b.isPinned ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });

    return { items: enrichedItems, total, page, limit, pages: Math.ceil(total / limit) || 1 };
  }

  async listByParticipants(userIdA: string, userIdB: string) {
    return Conversation.findOne({
      participants: { $all: [userIdA, userIdB], $size: 2 }
    }).exec();
  }

  async togglePin(conversationId: string, userId: string): Promise<boolean> {
    const conv = await Conversation.findById(conversationId);
    if (!conv) return false;
    const isPinned = conv.pinnedBy?.some((id) => id.toString() === userId);
    if (isPinned) {
      await Conversation.findByIdAndUpdate(conversationId, {
        $pull: { pinnedBy: userId }
      });
      return false;
    } else {
      await Conversation.findByIdAndUpdate(conversationId, {
        $addToSet: { pinnedBy: userId }
      });
      return true;
    }
  }

  async toggleMute(conversationId: string, userId: string): Promise<boolean> {
    const conv = await Conversation.findById(conversationId);
    if (!conv) return false;
    const isMuted = conv.mutedBy?.some((id) => id.toString() === userId);
    if (isMuted) {
      await Conversation.findByIdAndUpdate(conversationId, {
        $pull: { mutedBy: userId }
      });
      return false;
    } else {
      await Conversation.findByIdAndUpdate(conversationId, {
        $addToSet: { mutedBy: userId }
      });
      return true;
    }
  }

  async toggleArchive(conversationId: string, userId: string): Promise<boolean> {
    const conv = await Conversation.findById(conversationId);
    if (!conv) return false;
    const isArchived = conv.archivedBy?.some((id) => id.toString() === userId);
    if (isArchived) {
      await Conversation.findByIdAndUpdate(conversationId, {
        $pull: { archivedBy: userId }
      });
      return false;
    } else {
      await Conversation.findByIdAndUpdate(conversationId, {
        $addToSet: { archivedBy: userId }
      });
      return true;
    }
  }

  async markAsUnread(conversationId: string, userId: string): Promise<void> {
    await Conversation.findByIdAndUpdate(conversationId, {
      $addToSet: { unreadBy: userId }
    });
  }

  async clearUnread(conversationId: string, userId: string): Promise<void> {
    await Conversation.findByIdAndUpdate(conversationId, {
      $pull: { unreadBy: userId }
    });
  }

  updateById(id: string, update: UpdateQuery<IConversation>): Promise<ConversationDocument | null> {
    return Conversation.findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .populate("participants", "fullName rollNumber profilePicture department")
      .exec();
  }
}

export const conversationRepository = new ConversationRepository();
