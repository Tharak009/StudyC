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
    return this.messages.list({ communityId, userId, ...query });
  }

  async createMessage(
    communityId: string,
    userId: string,
    input: CreateMessageInput,
    files: Express.Multer.File[] = [],
    emit = true
  ) {
    await this.requireMembership(communityId, userId);
    if (!input.content && files.length === 0 && !input.codeSnippet) {
      throw new ApiError(422, "Message content, code snippet, or attachment is required", [], "MESSAGE_EMPTY");
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
    const created = await this.messages.create({
      communityId,
      channelId: input.channelId,
      senderId: userId,
      content: input.content || "",
      messageType: this.messageTypeFor(attachments),
      attachments,
      replyTo: input.replyTo,
      intent: input.intent || "chat",
      codeSnippet: input.codeSnippet
    });
    const hydrated = await this.messages.findById(created.id);
    if (!hydrated) throw new ApiError(500, "Message could not be loaded", [], "MESSAGE_LOAD_FAILED");
    if (emit) chatBus.messageCreated(communityId, hydrated);
    return hydrated;
  }

  async editMessage(communityId: string, messageId: string, userId: string, content: string, emit = true) {
    await this.requireMembership(communityId, userId);
    const message = await this.messages.findById(messageId);
    if (!message || message.communityId.toString() !== communityId || message.deleted || message.isDeletedForEveryone) {
      throw new ApiError(404, "Message not found", [], "MESSAGE_NOT_FOUND");
    }
    if (message.senderId._id.toString() !== userId) {
      throw new ApiError(403, "Only the sender can edit this message", [], "MESSAGE_EDIT_FORBIDDEN");
    }

    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    if (Date.now() - new Date(message.createdAt).getTime() > TWENTY_FOUR_HOURS_MS) {
      throw new ApiError(400, "Messages can only be edited within 24 hours of sending", [], "MESSAGE_EDIT_EXPIRED");
    }

    const updated = await this.messages.updateById(messageId, {
      $set: { content, edited: true, editedAt: new Date() }
    });
    if (!updated) throw new ApiError(404, "Message not found", [], "MESSAGE_NOT_FOUND");
    if (emit) chatBus.messageUpdated(communityId, updated);
    return updated;
  }

  async deleteMessageForMe(communityId: string, messageId: string, userId: string) {
    await this.requireMembership(communityId, userId);
    const message = await this.messages.findById(messageId);
    if (!message || message.communityId.toString() !== communityId) {
      throw new ApiError(404, "Message not found", [], "MESSAGE_NOT_FOUND");
    }

    await this.messages.bulkDeleteForMe(communityId, [messageId], userId);
    return { success: true, messageId, communityId };
  }

  async deleteMessageForEveryone(communityId: string, messageId: string, userId: string, emit = true) {
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

    if (isSender && !canModerate) {
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
    if (emit) {
      chatBus.messageDeleted(communityId, purged);
    }
    return purged;
  }

  async deleteMessage(communityId: string, messageId: string, userId: string, emit = true) {
    return this.deleteMessageForEveryone(communityId, messageId, userId, emit);
  }

  async toggleReaction(communityId: string, messageId: string, userId: string, emoji: string) {
    await this.requireMembership(communityId, userId);
    const message = await this.messages.findById(messageId);
    if (!message || message.communityId.toString() !== communityId || message.deleted || message.isDeletedForEveryone) {
      throw new ApiError(404, "Message not found", [], "MESSAGE_NOT_FOUND");
    }

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
        category: "STANDARD"
      });
    }

    const updated = await this.messages.updateById(messageId, {
      $set: { reactions: message.reactions }
    });
    return updated?.reactions || message.reactions;
  }

  async toggleStar(communityId: string, messageId: string, userId: string) {
    await this.requireMembership(communityId, userId);
    const message = await this.messages.findById(messageId);
    if (!message || message.communityId.toString() !== communityId || message.deleted || message.isDeletedForEveryone) {
      throw new ApiError(404, "Message not found", [], "MESSAGE_NOT_FOUND");
    }
    return this.messages.toggleStar(messageId, userId);
  }

  async togglePin(communityId: string, messageId: string, userId: string) {
    const membership = await this.requireMembership(communityId, userId);
    const canModerate = membership.role === COMMUNITY_ROLES.OWNER || membership.role === COMMUNITY_ROLES.MODERATOR;
    if (!canModerate) {
      throw new ApiError(403, "Only moderators or owners can pin messages in study circles", [], "PIN_FORBIDDEN");
    }
    const message = await this.messages.findById(messageId);
    if (!message || message.communityId.toString() !== communityId || message.deleted || message.isDeletedForEveryone) {
      throw new ApiError(404, "Message not found", [], "MESSAGE_NOT_FOUND");
    }
    return this.messages.togglePin(messageId, userId);
  }

  async listStarred(communityId: string, userId: string, channelId?: string) {
    await this.requireMembership(communityId, userId);
    return this.messages.listStarred(communityId, userId, channelId);
  }

  async listPinned(communityId: string, userId: string, channelId?: string) {
    await this.requireMembership(communityId, userId);
    const result = await this.messages.list({
      communityId,
      channelId,
      pinnedOnly: true,
      page: 1,
      limit: 50,
      order: "latest",
      userId
    });
    return result.items;
  }

  async forwardMessages(
    sourceMessageIds: string[],
    targetCommunityId: string,
    targetChannelId: string | undefined,
    senderId: string
  ) {
    await this.requireMembership(targetCommunityId, senderId);
    const results = [];

    for (const sourceId of sourceMessageIds) {
      const sourceMsg = await this.messages.findById(sourceId);
      if (!sourceMsg || sourceMsg.deleted || sourceMsg.isDeletedForEveryone) continue;

      const created = await this.createMessage(
        targetCommunityId,
        senderId,
        {
          channelId: targetChannelId,
          content: sourceMsg.content,
          intent: sourceMsg.intent,
          codeSnippet: sourceMsg.codeSnippet
        },
        [],
        true
      );

      await this.messages.updateById(created.id, {
        $set: {
          isForwarded: true,
          forwardedFrom: sourceMsg._id as any,
          attachments: sourceMsg.attachments,
          messageType: sourceMsg.messageType
        }
      });

      const hydrated = await this.messages.findById(created.id);
      if (hydrated) results.push(hydrated);
    }
    return results;
  }

  async bulkDeleteForMe(communityId: string, messageIds: string[], userId: string) {
    await this.requireMembership(communityId, userId);
    const count = await this.messages.bulkDeleteForMe(communityId, messageIds, userId);
    return { count };
  }

  async bulkDeleteForEveryone(communityId: string, messageIds: string[], userId: string) {
    await this.requireMembership(communityId, userId);
    const deletedIds: string[] = [];
    for (const id of messageIds) {
      try {
        await this.deleteMessageForEveryone(communityId, id, userId, true);
        deletedIds.push(id);
      } catch {
        // Ignore ineligible messages
      }
    }
    return { deletedIds };
  }

  async bulkStar(communityId: string, messageIds: string[], userId: string, star: boolean) {
    await this.requireMembership(communityId, userId);
    const count = await this.messages.bulkStar(communityId, messageIds, userId, star);
    return { count };
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
    if (first.mimeType.startsWith("audio/")) return MESSAGE_TYPES.AUDIO;
    if (first.mimeType === "application/pdf") return MESSAGE_TYPES.PDF;
    return MESSAGE_TYPES.DOCUMENT;
  }
}

export const chatService = new ChatService(
  messageRepository,
  communityMemberRepository,
  new StorageService(new LocalStorageProvider())
);
