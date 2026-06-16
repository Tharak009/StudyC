import type { Express } from "express";
import { MESSAGE_TYPES, type MessageType } from "../constants/message-types.js";
import { conversationRepository, type ConversationRepository } from "../repositories/conversation.repository.js";
import { directMessageRepository, type DirectMessageRepository } from "../repositories/direct-message.repository.js";
import { userRepository, type UserRepository } from "../repositories/user.repository.js";
import { LocalStorageProvider } from "../uploads/local-storage.provider.js";
import { ApiError } from "../utils/api-error.js";
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

  async listConversations(userId: string, query: { page: number; limit: number; search?: string }) {
    return this.conversations.list({ userId, ...query });
  }

  async sendMessage(
    conversationId: string,
    userId: string,
    input: { content: string; replyTo?: string },
    files: Express.Multer.File[] = []
  ) {
    const conversation = await this.conversations.findById(conversationId);
    if (!conversation) {
      throw new ApiError(404, "Conversation not found", [], "CONVERSATION_NOT_FOUND");
    }
    this.ensureParticipant(conversation, userId);

    if (!input.content && files.length === 0) {
      throw new ApiError(422, "Message content or attachment is required", [], "MESSAGE_EMPTY");
    }

    const receiverId = conversation.participants.find(
      (p) => p._id.toString() !== userId
    )!._id.toString();

    const attachments = await Promise.all(files.map((file) => this.storeAttachment(file)));
    const created = await this.messages.create({
      conversationId,
      senderId: userId,
      content: input.content,
      messageType: this.messageTypeFor(attachments),
      attachments,
      replyTo: input.replyTo
    });

    await this.conversations.updateById(conversationId, {
      $set: {
        lastMessage: {
          content: input.content || (attachments.length > 0 ? `Sent ${attachments.length} file(s)` : ""),
          senderId: userId,
          createdAt: new Date()
        },
        lastMessageAt: new Date()
      }
    });

    const hydrated = await this.messages.findById(created.id);
    if (!hydrated) throw new ApiError(500, "Message could not be loaded", [], "MESSAGE_LOAD_FAILED");

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

    return this.messages.list({ conversationId, ...query });
  }

  async editMessage(messageId: string, userId: string, content: string) {
    const message = await this.messages.findById(messageId);
    if (!message || message.deleted) {
      throw new ApiError(404, "Message not found", [], "MESSAGE_NOT_FOUND");
    }
    if (message.senderId._id.toString() !== userId) {
      throw new ApiError(403, "Only the sender can edit this message", [], "MESSAGE_EDIT_FORBIDDEN");
    }

    const updated = await this.messages.updateById(messageId, {
      $set: { content, edited: true, editedAt: new Date() }
    });
    if (!updated) throw new ApiError(404, "Message not found", [], "MESSAGE_NOT_FOUND");
    return updated;
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
    return deleted;
  }

  async markAsRead(conversationId: string, userId: string) {
    const conversation = await this.conversations.findById(conversationId);
    if (!conversation) {
      throw new ApiError(404, "Conversation not found", [], "CONVERSATION_NOT_FOUND");
    }
    this.ensureParticipant(conversation, userId);
    await this.messages.markAsRead(conversationId, userId);
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
