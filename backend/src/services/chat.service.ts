import type { Express } from "express";
import { COMMUNITY_ROLES } from "../constants/community-roles.js";
import { MESSAGE_TYPES, type MessageType } from "../constants/message-types.js";
import { communityMemberRepository, type CommunityMemberRepository } from "../repositories/community-member.repository.js";
import { messageRepository, type MessageRepository } from "../repositories/message.repository.js";
import { LocalStorageProvider } from "../uploads/local-storage.provider.js";
import { ApiError } from "../utils/api-error.js";
import type { CreateMessageInput, ListMessagesQuery } from "../validators/chat.validator.js";
import { chatBus } from "./chat-bus.service.js";
import { StorageService, type StoredFile } from "./storage.service.js";

export class ChatService {
  constructor(
    private readonly messages: MessageRepository,
    private readonly members: CommunityMemberRepository,
    private readonly storage: StorageService
  ) {}

  async listMessages(communityId: string, userId: string, query: ListMessagesQuery) {
    await this.requireMembership(communityId, userId);
    return this.messages.list({ communityId, ...query });
  }

  async createMessage(
    communityId: string,
    userId: string,
    input: CreateMessageInput,
    files: Express.Multer.File[] = [],
    emit = true
  ) {
    await this.requireMembership(communityId, userId);
    if (!input.content && files.length === 0) {
      throw new ApiError(422, "Message content or attachment is required", [], "MESSAGE_EMPTY");
    }
    const attachments = await Promise.all(files.map((file) => this.storeAttachment(file)));
    const created = await this.messages.create({
      communityId,
      senderId: userId,
      content: input.content,
      messageType: this.messageTypeFor(attachments),
      attachments,
      replyTo: input.replyTo
    });
    const hydrated = await this.messages.findById(created.id);
    if (!hydrated) throw new ApiError(500, "Message could not be loaded", [], "MESSAGE_LOAD_FAILED");
    if (emit) chatBus.messageCreated(communityId, hydrated);
    return hydrated;
  }

  async editMessage(communityId: string, messageId: string, userId: string, content: string, emit = true) {
    await this.requireMembership(communityId, userId);
    const message = await this.messages.findById(messageId);
    if (!message || message.communityId.toString() !== communityId || message.deleted) {
      throw new ApiError(404, "Message not found", [], "MESSAGE_NOT_FOUND");
    }
    if (message.senderId._id.toString() !== userId) {
      throw new ApiError(403, "Only the sender can edit this message", [], "MESSAGE_EDIT_FORBIDDEN");
    }
    const updated = await this.messages.updateById(messageId, {
      $set: { content, edited: true, editedAt: new Date() }
    });
    if (!updated) throw new ApiError(404, "Message not found", [], "MESSAGE_NOT_FOUND");
    if (emit) chatBus.messageUpdated(communityId, updated);
    return updated;
  }

  async deleteMessage(communityId: string, messageId: string, userId: string, emit = true) {
    const membership = await this.requireMembership(communityId, userId);
    const message = await this.messages.findById(messageId);
    if (!message || message.communityId.toString() !== communityId || message.deleted) {
      throw new ApiError(404, "Message not found", [], "MESSAGE_NOT_FOUND");
    }
    const isSender = message.senderId._id.toString() === userId;
    const canModerate = membership.role === COMMUNITY_ROLES.OWNER || membership.role === COMMUNITY_ROLES.MODERATOR;
    if (!isSender && !canModerate) {
      throw new ApiError(403, "Only the sender or community moderators can delete this message", [], "MESSAGE_DELETE_FORBIDDEN");
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
    if (emit) chatBus.messageDeleted(communityId, deleted);
    return deleted;
  }

  async requireMembership(communityId: string, userId: string) {
    const membership = await this.members.findMembership(communityId, userId);
    if (!membership) throw new ApiError(403, "Community membership is required for chat", [], "CHAT_MEMBERSHIP_REQUIRED");
    return membership;
  }

  private async storeAttachment(file: Express.Multer.File) {
    const stored = await this.storage.uploadChatAttachment(file);
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

export const chatService = new ChatService(
  messageRepository,
  communityMemberRepository,
  new StorageService(new LocalStorageProvider())
);
