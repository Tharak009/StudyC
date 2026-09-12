import type { Express } from "express";
import { MESSAGE_TYPES, type MessageType } from "../constants/message-types.js";
import { conversationRepository, type ConversationRepository } from "../repositories/conversation.repository.js";
import { directMessageRepository, type DirectMessageRepository } from "../repositories/direct-message.repository.js";
import { userRepository, type UserRepository } from "../repositories/user.repository.js";
import { LocalStorageProvider } from "../uploads/local-storage.provider.js";
import { ApiError } from "../utils/api-error.js";
import { DirectMessage } from "../models/direct-message.model.js";
import { dmBus } from "./dm-bus.service.js";
import { StorageService, type StoredFile } from "./storage.service.js";

export class DirectMessageService {
  constructor(
    private readonly conversations: ConversationRepository,
    private readonly messages: DirectMessageRepository,
    private readonly users: UserRepository,
    private readonly storage: StorageService
  ) {}

  async startConversation(userId: string, receiverId: string) {
    if (userId === receiverId) {
      throw new ApiError(422, "Cannot start conversation with yourself", [], "SELF_CONVERSATION");
    }
    const receiver = await this.users.findById(receiverId);
    if (!receiver) {
      throw new ApiError(404, "User not found", [], "USER_NOT_FOUND");
    }

    const existing = await this.conversations.findExisting(userId, receiverId);
    if (existing) {
      return this.conversations.findById(existing.id);
    }

    const conversation = await this.conversations.create({
      participants: [userId, receiverId]
    });
    return this.conversations.findById(conversation.id);
  }

  async getConversation(conversationId: string, userId: string) {
    const conversation = await this.conversations.findById(conversationId);
    if (!conversation) {
      throw new ApiError(404, "Conversation not found", [], "CONVERSATION_NOT_FOUND");
    }
    this.ensureParticipant(conversation, userId);
    return conversation;
  }

  async listConversations(userId: string, query: { page: number; limit: number; search?: string; archived?: boolean }) {
    return this.conversations.list({ userId, ...query });
  }

  async sendMessage(
    conversationId: string,
    userId: string,
    input: { content: string; replyTo?: string; clientMessageId?: string; delivered?: boolean; duration?: number; waveform?: number[] | string },
    files: Express.Multer.File[] = []
  ) {
    const conversation = await this.conversations.findById(conversationId);
    if (!conversation) {
      throw new ApiError(404, "Conversation not found", [], "CONVERSATION_NOT_FOUND");
    }
    this.ensureParticipant(conversation, userId);
    if (conversation.isLocked) {
      throw new ApiError(403, "This conversation is locked in read-only mode", [], "CONVERSATION_LOCKED");
    }

    if (!input.content && files.length === 0) {
      throw new ApiError(422, "Message content or attachment is required", [], "MESSAGE_EMPTY");
    }

    const receiverId = conversation.participants.find(
      (p) => p._id.toString() !== userId
    )!._id.toString();

    // Duplicate prevention for retry / reconnection
    if (input.clientMessageId) {
      const existing = await this.messages.findByClientMessageId(conversationId, input.clientMessageId);
      if (existing) {
        return { message: existing, receiverId };
      }
    }

    const attachments = await Promise.all(
      files.map(async (file) => {
        const stored = await this.storeAttachment(file);
        const isAudio = stored.mimeType.startsWith("audio/");
        let parsedWaveform: number[] | undefined;
        if (input.waveform) {
          try {
            parsedWaveform = typeof input.waveform === "string" ? JSON.parse(input.waveform) : (input.waveform as number[]);
          } catch {
            parsedWaveform = undefined;
          }
        }
        return {
          ...stored,
          duration: isAudio && input.duration !== undefined ? Number(input.duration) : undefined,
          waveform: isAudio ? parsedWaveform : undefined
        };
      })
    );
    const msgType = this.messageTypeFor(attachments);
    const created = await this.messages.create({
      conversationId,
      senderId: userId,
      content: input.content,
      messageType: msgType,
      attachments,
      replyTo: input.replyTo,
      clientMessageId: input.clientMessageId,
      delivered: input.delivered ?? false,
      deliveredAt: input.delivered ? new Date() : undefined
    });

    let previewText = input.content;
    if (!previewText && attachments.length > 0) {
      if (msgType === MESSAGE_TYPES.IMAGE) previewText = attachments.length > 1 ? `📷 ${attachments.length} photos` : "📷 Photo";
      else if (msgType === MESSAGE_TYPES.AUDIO) previewText = "🎙️ Voice message";
      else if (msgType === MESSAGE_TYPES.PDF) previewText = "📄 PDF document";
      else previewText = `📎 ${attachments[0]?.originalName || "Attachment"}`;
    }

    await this.conversations.updateById(conversationId, {
      $set: {
        lastMessage: {
          content: previewText || "",
          senderId: userId,
          createdAt: new Date()
        },
        lastMessageAt: new Date()
      }
    });

    const hydrated = await this.messages.findById(created.id);
    if (!hydrated) throw new ApiError(500, "Message could not be loaded", [], "MESSAGE_LOAD_FAILED");

    const messagePayload = hydrated.toJSON?.() ?? hydrated;
    dmBus.messageCreated(conversationId, {
      ...messagePayload,
      conversationId,
      receiverId,
      clientMessageId: input.clientMessageId
    });

    return { message: hydrated, receiverId };
  }

  async getMessages(
    conversationId: string,
    userId: string,
    query: { page: number; limit: number; order: "latest" | "oldest"; search?: string }
  ) {
    const conversation = await this.conversations.findById(conversationId);
    if (!conversation) {
      throw new ApiError(404, "Conversation not found", [], "CONVERSATION_NOT_FOUND");
    }
    this.ensureParticipant(conversation, userId);

    return this.messages.list({ conversationId, userId, ...query });
  }

  async editMessage(messageId: string, userId: string, content: string) {
    const message = await this.messages.findById(messageId);
    if (!message || message.deleted || message.isDeletedForEveryone) {
      throw new ApiError(404, "Message not found", [], "MESSAGE_NOT_FOUND");
    }
    if (message.senderId._id.toString() !== userId) {
      throw new ApiError(403, "Only the sender can edit this message", [], "MESSAGE_EDIT_FORBIDDEN");
    }

    const conversation = await this.conversations.findById(message.conversationId.toString());
    if (conversation?.isLocked) {
      throw new ApiError(403, "This conversation is locked in read-only mode", [], "CONVERSATION_LOCKED");
    }

    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    if (Date.now() - new Date(message.createdAt).getTime() > TWENTY_FOUR_HOURS_MS) {
      throw new ApiError(400, "Messages can only be edited within 24 hours of sending", [], "MESSAGE_EDIT_EXPIRED");
    }

    const updated = await this.messages.updateById(messageId, {
      $set: { content, edited: true, editedAt: new Date() }
    });
    if (!updated) throw new ApiError(404, "Message not found", [], "MESSAGE_NOT_FOUND");
    dmBus.messageUpdated(message.conversationId.toString(), updated.toJSON?.() ?? updated);
    return updated;
  }

  async deleteMessageForMe(messageId: string, userId: string) {
    const message = await this.messages.findById(messageId);
    if (!message) {
      throw new ApiError(404, "Message not found", [], "MESSAGE_NOT_FOUND");
    }
    const conversation = await this.conversations.findById(message.conversationId.toString());
    if (!conversation) throw new ApiError(404, "Conversation not found", [], "CONVERSATION_NOT_FOUND");
    this.ensureParticipant(conversation, userId);

    await this.messages.bulkDeleteForMe(message.conversationId.toString(), [messageId], userId);
    dmBus.deletedForMe(userId, { messageId, conversationId: message.conversationId.toString() });
    return { success: true, messageId, conversationId: message.conversationId.toString() };
  }

  async deleteMessageForEveryone(messageId: string, userId: string, isAdmin = false) {
    const message = await this.messages.findById(messageId);
    if (!message || message.deleted) {
      throw new ApiError(404, "Message not found", [], "MESSAGE_NOT_FOUND");
    }
    const isSender = message.senderId._id.toString() === userId;
    if (!isSender && !isAdmin) {
      throw new ApiError(403, "Only the sender can delete this message for everyone", [], "MESSAGE_DELETE_FORBIDDEN");
    }

    if (!isAdmin) {
      const timeDiff = Date.now() - new Date(message.createdAt).getTime();
      if (timeDiff > 24 * 60 * 60 * 1000) {
        throw new ApiError(400, "Messages can only be deleted for everyone within 24 hours of sending", [], "MESSAGE_DELETE_EXPIRED");
      }
    }

    const purged = await this.messages.updateById(messageId, {
      $set: {
        content: "",
        attachments: [],
        isDeletedForEveryone: true,
        deletedBy: userId as any,
        deletedAt: new Date(),
        edited: false,
        editedAt: undefined
      }
    });

    if (!purged) throw new ApiError(404, "Message not found", [], "MESSAGE_NOT_FOUND");

    // Sync Conversation.lastMessage if this was the last message
    const latestActiveMsg = await DirectMessage.findOne({
      conversationId: message.conversationId,
      deleted: { $ne: true }
    })
      .sort({ createdAt: -1 })
      .exec();

    if (latestActiveMsg) {
      await this.conversations.updateById(message.conversationId.toString(), {
        $set: {
          lastMessage: {
            content: latestActiveMsg.isDeletedForEveryone
              ? "🗑️ This message was deleted"
              : latestActiveMsg.content || (latestActiveMsg.attachments?.length ? "📎 Attachment" : ""),
            senderId: latestActiveMsg.senderId,
            createdAt: latestActiveMsg.createdAt
          }
        }
      });
    }

    const purgeData = {
      messageId,
      conversationId: message.conversationId.toString(),
      isDeletedForEveryone: true,
      deletedBy: userId,
      deletedAt: purged.deletedAt || new Date()
    };
    dmBus.messagePurged(message.conversationId.toString(), purgeData);
    return purged;
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.messages.findById(messageId);
    if (!message || message.deleted) {
      throw new ApiError(404, "Message not found", [], "MESSAGE_NOT_FOUND");
    }
    if (message.senderId._id.toString() !== userId) {
      throw new ApiError(403, "Only the sender can delete this message", [], "MESSAGE_DELETE_FORBIDDEN");
    }

    const deleted = await this.messages.updateById(messageId, {
      $set: {
        content: "",
        attachments: [],
        deleted: true,
        deletedAt: new Date(),
        edited: false,
        editedAt: undefined
      }
    });
    if (!deleted) throw new ApiError(404, "Message not found", [], "MESSAGE_NOT_FOUND");

    // Sync Conversation.lastMessage with latest non-deleted message
    const latestMsg = await DirectMessage.findOne({
      conversationId: message.conversationId,
      deleted: { $ne: true }
    })
      .sort({ createdAt: -1 })
      .exec();

    if (latestMsg) {
      await this.conversations.updateById(message.conversationId.toString(), {
        $set: {
          lastMessage: {
            content: latestMsg.isDeletedForEveryone
              ? "🗑️ This message was deleted"
              : latestMsg.content || (latestMsg.attachments?.length ? "📎 Attachment" : ""),
            senderId: latestMsg.senderId,
            createdAt: latestMsg.createdAt
          }
        }
      });
    } else {
      await this.conversations.updateById(message.conversationId.toString(), {
        $set: { lastMessage: null }
      });
    }

    dmBus.messageDeleted(message.conversationId.toString(), {
      messageId,
      conversationId: message.conversationId.toString()
    });
    return deleted;
  }

  async toggleReaction(
    messageId: string,
    userId: string,
    emoji: string,
    category: "STANDARD" | "CAMPUS_CUSTOM" = "STANDARD"
  ) {
    const message = await this.messages.findById(messageId);
    if (!message || message.deleted || message.isDeletedForEveryone) {
      throw new ApiError(404, "Message not found", [], "MESSAGE_NOT_FOUND");
    }
    const conversation = await this.conversations.findById(message.conversationId.toString());
    if (!conversation) throw new ApiError(404, "Conversation not found", [], "CONVERSATION_NOT_FOUND");
    this.ensureParticipant(conversation, userId);

    if (!message.reactions) message.reactions = [];
    const existingIdx = message.reactions.findIndex((r) => r.emoji === emoji);

    if (existingIdx !== -1 && message.reactions[existingIdx]) {
      const rx = message.reactions[existingIdx]!;
      const userIdx = rx.users.findIndex((u) => u.toString() === userId);
      if (userIdx !== -1) {
        rx.users.splice(userIdx, 1);
        rx.count = rx.users.length;
        if (rx.users.length === 0) {
          message.reactions.splice(existingIdx, 1);
        }
      } else {
        rx.users.push(userId as any);
        rx.count = rx.users.length;
      }
    } else {
      message.reactions.push({
        emoji,
        count: 1,
        users: [userId as any],
        category
      });
    }

    const updated = await this.messages.updateById(messageId, {
      $set: { reactions: message.reactions }
    });

    const reactionData = {
      messageId,
      conversationId: message.conversationId.toString(),
      reactions: updated?.reactions || message.reactions,
      userId,
      emoji
    };
    dmBus.reactionUpdated(message.conversationId.toString(), reactionData);
    return updated?.reactions || message.reactions;
  }

  async toggleStar(messageId: string, userId: string) {
    const message = await this.messages.findById(messageId);
    if (!message || message.deleted || message.isDeletedForEveryone) {
      throw new ApiError(404, "Message not found", [], "MESSAGE_NOT_FOUND");
    }
    const conversation = await this.conversations.findById(message.conversationId.toString());
    if (!conversation) throw new ApiError(404, "Conversation not found", [], "CONVERSATION_NOT_FOUND");
    this.ensureParticipant(conversation, userId);

    const result = await this.messages.toggleStar(messageId, userId);
    dmBus.starUpdated(userId, {
      messageId,
      conversationId: message.conversationId.toString(),
      isStarred: result.isStarred
    });
    return result;
  }

  async togglePinMessage(messageId: string, userId: string) {
    const message = await this.messages.findById(messageId);
    if (!message || message.deleted || message.isDeletedForEveryone) {
      throw new ApiError(404, "Message not found", [], "MESSAGE_NOT_FOUND");
    }
    const conversation = await this.conversations.findById(message.conversationId.toString());
    if (!conversation) throw new ApiError(404, "Conversation not found", [], "CONVERSATION_NOT_FOUND");
    this.ensureParticipant(conversation, userId);

    const result = await this.messages.togglePin(messageId, userId);
    dmBus.pinUpdated(message.conversationId.toString(), {
      messageId,
      conversationId: message.conversationId.toString(),
      isPinned: result.isPinned,
      message: result.message
    });
    return result;
  }

  async getStarredMessages(conversationId: string, userId: string) {
    const conversation = await this.conversations.findById(conversationId);
    if (!conversation) throw new ApiError(404, "Conversation not found", [], "CONVERSATION_NOT_FOUND");
    this.ensureParticipant(conversation, userId);
    return this.messages.listStarred(conversationId, userId);
  }

  async getPinnedMessages(conversationId: string, userId: string) {
    const conversation = await this.conversations.findById(conversationId);
    if (!conversation) throw new ApiError(404, "Conversation not found", [], "CONVERSATION_NOT_FOUND");
    this.ensureParticipant(conversation, userId);
    return this.messages.listPinned(conversationId);
  }

  async forwardMessages(sourceMessageIds: string[], targetConversationIds: string[], senderId: string) {
    const results = [];
    for (const sourceId of sourceMessageIds) {
      const sourceMsg = await this.messages.findById(sourceId);
      if (!sourceMsg || sourceMsg.deleted || sourceMsg.isDeletedForEveryone) continue;

      for (const targetId of targetConversationIds) {
        const targetConv = await this.conversations.findById(targetId);
        if (!targetConv) continue;
        const isParticipant = targetConv.participants.some((p) => p._id.toString() === senderId);
        if (!isParticipant || targetConv.isLocked) continue;

        const receiverId = targetConv.participants.find((p) => p._id.toString() !== senderId)!._id.toString();

        const created = await this.messages.create({
          conversationId: targetId,
          senderId,
          content: sourceMsg.content,
          messageType: sourceMsg.messageType,
          attachments: sourceMsg.attachments,
          isForwarded: true,
          forwardedFrom: sourceMsg._id.toString()
        });

        await this.conversations.updateById(targetId, {
          $set: {
            lastMessage: {
              content: sourceMsg.content || (sourceMsg.attachments.length > 0 ? `Sent ${sourceMsg.attachments.length} file(s)` : ""),
              senderId,
              createdAt: new Date()
            },
            lastMessageAt: new Date()
          }
        });

        const hydrated = await this.messages.findById(created.id);
        if (hydrated) {
          dmBus.messageCreated(targetId, {
            ...(hydrated.toJSON?.() ?? hydrated),
            conversationId: targetId,
            receiverId,
            isForwarded: true
          });
          results.push(hydrated);
        }
      }
    }
    return results;
  }

  async bulkDeleteForMe(conversationId: string, messageIds: string[], userId: string) {
    const conversation = await this.conversations.findById(conversationId);
    if (!conversation) throw new ApiError(404, "Conversation not found", [], "CONVERSATION_NOT_FOUND");
    this.ensureParticipant(conversation, userId);

    const count = await this.messages.bulkDeleteForMe(conversationId, messageIds, userId);
    messageIds.forEach((id) => {
      dmBus.deletedForMe(userId, { messageId: id, conversationId });
    });
    return { count };
  }

  async bulkDeleteForEveryone(conversationId: string, messageIds: string[], userId: string, isAdmin = false) {
    const conversation = await this.conversations.findById(conversationId);
    if (!conversation) throw new ApiError(404, "Conversation not found", [], "CONVERSATION_NOT_FOUND");
    this.ensureParticipant(conversation, userId);

    const deletedIds: string[] = [];
    for (const id of messageIds) {
      try {
        await this.deleteMessageForEveryone(id, userId, isAdmin);
        deletedIds.push(id);
      } catch {
        // Skip messages not eligible
      }
    }
    return { deletedIds };
  }

  async bulkStar(conversationId: string, messageIds: string[], userId: string, star: boolean) {
    const conversation = await this.conversations.findById(conversationId);
    if (!conversation) throw new ApiError(404, "Conversation not found", [], "CONVERSATION_NOT_FOUND");
    this.ensureParticipant(conversation, userId);

    const count = await this.messages.bulkStar(conversationId, messageIds, userId, star);
    messageIds.forEach((id) => {
      dmBus.starUpdated(userId, { messageId: id, conversationId, isStarred: star });
    });
    return { count };
  }

  async markAsRead(conversationId: string, userId: string) {
    const conversation = await this.conversations.findById(conversationId);
    if (!conversation) {
      throw new ApiError(404, "Conversation not found", [], "CONVERSATION_NOT_FOUND");
    }
    this.ensureParticipant(conversation, userId);
    await this.messages.markAsRead(conversationId, userId);
    await this.conversations.clearUnread(conversationId, userId);
    dmBus.messageRead(conversationId, { conversationId, readerId: userId });
  }

  async togglePin(conversationId: string, userId: string): Promise<boolean> {
    const conversation = await this.conversations.findById(conversationId);
    if (!conversation) throw new ApiError(404, "Conversation not found", [], "CONVERSATION_NOT_FOUND");
    this.ensureParticipant(conversation, userId);
    return this.conversations.togglePin(conversationId, userId);
  }

  async toggleMute(conversationId: string, userId: string): Promise<boolean> {
    const conversation = await this.conversations.findById(conversationId);
    if (!conversation) throw new ApiError(404, "Conversation not found", [], "CONVERSATION_NOT_FOUND");
    this.ensureParticipant(conversation, userId);
    return this.conversations.toggleMute(conversationId, userId);
  }

  async toggleArchive(conversationId: string, userId: string): Promise<boolean> {
    const conversation = await this.conversations.findById(conversationId);
    if (!conversation) throw new ApiError(404, "Conversation not found", [], "CONVERSATION_NOT_FOUND");
    this.ensureParticipant(conversation, userId);
    return this.conversations.toggleArchive(conversationId, userId);
  }

  async markAsUnread(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.conversations.findById(conversationId);
    if (!conversation) throw new ApiError(404, "Conversation not found", [], "CONVERSATION_NOT_FOUND");
    this.ensureParticipant(conversation, userId);
    await this.conversations.markAsUnread(conversationId, userId);
  }

  async markAsDelivered(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.conversations.findById(conversationId);
    if (!conversation) throw new ApiError(404, "Conversation not found", [], "CONVERSATION_NOT_FOUND");
    this.ensureParticipant(conversation, userId);
    await this.messages.markAsDelivered(conversationId, userId);
  }

  async markMessageRead(messageId: string, userId: string) {
    const message = await this.messages.findById(messageId);
    if (!message || message.deleted) return null;
    if (message.senderId._id.toString() === userId) return message;

    const updated = await this.messages.markMessageRead(messageId);
    return updated;
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.messages.countUnreadByUser(userId);
  }

  private ensureParticipant(conversation: { participants: Array<{ _id: { toString(): string } }> }, userId: string) {
    const isParticipant = conversation.participants.some((p) => p._id.toString() === userId);
    if (!isParticipant) {
      throw new ApiError(403, "You are not a participant in this conversation", [], "CONVERSATION_ACCESS_DENIED");
    }
  }

  private async storeAttachment(file: Express.Multer.File) {
    const stored = await this.storage.uploadDirectMessageAttachment(file);
    return {
      ...stored,
      originalName: file.originalname
    };
  }

  private messageTypeFor(attachments: Array<StoredFile & { originalName: string }>): MessageType {
    const first = attachments[0];
    if (!first) return MESSAGE_TYPES.TEXT;
    if (first.mimeType.startsWith("image/")) return MESSAGE_TYPES.IMAGE;
    if (first.mimeType.startsWith("audio/")) return MESSAGE_TYPES.AUDIO;
    if (first.mimeType === "application/pdf") return MESSAGE_TYPES.PDF;
    return MESSAGE_TYPES.DOCUMENT;
  }
}

export const directMessageService = new DirectMessageService(
  conversationRepository,
  directMessageRepository,
  userRepository,
  new StorageService(new LocalStorageProvider())
);
