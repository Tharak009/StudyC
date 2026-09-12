import type { Server, Socket } from "socket.io";
import { Types } from "mongoose";
import { directMessageService } from "../services/direct-message.service.js";
import { DirectMessage } from "../models/direct-message.model.js";
import { Conversation } from "../models/conversation.model.js";
import {
  socketConversationSchema,
  socketDeleteDirectMessageSchema,
  socketEditDirectMessageSchema,
  socketMarkAsReadSchema,
  socketSendDirectMessageSchema,
  socketStartConversationSchema
} from "../validators/direct-message.validator.js";
import type { SocketRegistry } from "./presence.socket.js";

interface SendDirectMessagePayload {
  conversationId: string;
  recipientId: string;
  content: string;
  attachments?: Array<{
    key: string;
    url: string;
    originalName: string;
    mimeType: string;
    size: number;
  }>;
  codeSnippet?: {
    language: string;
    code: string;
  };
  replyTo?: string;
}

const dmRoomFor = (conversationId: string) => `dm:${conversationId}`;
const userRoomFor = (userId: string) => `user:${userId}`;

/**
 * Direct Messaging Socket Controller
 * 1-on-1 student messaging, WhatsApp delivery checkmarks, read receipts, and typing states.
 */
export const registerDmHandlers = (
  io: Server,
  socket: Socket,
  registry: SocketRegistry
): void => {
  const userId = socket.data.userId as string;

  // ── 1. Send Direct Message ────────────────────────────────────────────────
  socket.on(
    "dm:sendMessage",
    async (payload: SendDirectMessagePayload, acknowledge?: (res: unknown) => void) => {
      try {
        const { conversationId, recipientId, content, replyTo } = payload;
        if (!conversationId || !recipientId) {
          throw new Error("conversationId and recipientId are required");
        }

        const { message } = await directMessageService.sendMessage(
          conversationId,
          userId,
          { content: content || "", replyTo },
          []
        );

        const messageData = {
          ...(message.toJSON?.() ?? message),
          senderName: socket.data.user?.name || "Student",
          senderDepartment: socket.data.user?.department,
          senderRoll: socket.data.user?.rollNumber,
          isDelivered: registry.onlineUsersMap.has(recipientId),
          isRead: false
        };

        // dmBus automatically broadcasts to dm room & recipient user room

        // Optimistic single-checkmark response to sender
        if (typeof acknowledge === "function") {
          acknowledge({
            success: true,
            data: messageData,
            delivered: registry.onlineUsersMap.has(recipientId)
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to send direct message";
        if (typeof acknowledge === "function") {
          acknowledge({ success: false, message });
        }
        socket.emit("dmError", { message });
      }
    }
  );

  // Backward-compatible sendDirectMessage
  socket.on("sendDirectMessage", async (payload: unknown, acknowledge?: unknown) => {
    try {
      const input = socketSendDirectMessageSchema.parse(payload);
      const { message } = await directMessageService.sendMessage(
        input.conversationId,
        userId,
        { content: input.content, replyTo: input.replyTo },
        []
      );

      const data = message.toJSON?.() ?? message;

      if (typeof acknowledge === "function") {
        acknowledge({ success: true, data });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send direct message";
      if (typeof acknowledge === "function") {
        acknowledge({ success: false, message });
      }
      socket.emit("dmError", { message });
    }
  });

  // ── 2. Delivery Receipt (Double Grey Checkmark) ───────────────────────────
  socket.on(
    "dm:delivered",
    (payload: { messageId: string; conversationId: string; senderId: string }) => {
      const { messageId, conversationId, senderId } = payload;
      if (!messageId || !senderId) return;

      const deliveryData = {
        messageId,
        conversationId,
        deliveredAt: new Date().toISOString()
      };

      // Notify message author across their active tabs
      io.to(userRoomFor(senderId)).emit("dm:messageDelivered", deliveryData);
    }
  );

  // ── 3. Read Receipt (Double Cyan Checkmark) ───────────────────────────────
  socket.on(
    "dm:read",
    async (
      payload: { conversationId: string; senderId: string; messageId?: string },
      acknowledge?: (res: unknown) => void
    ) => {
      try {
        const { conversationId, senderId, messageId } = payload;
        if (!conversationId) throw new Error("conversationId is required");

        await directMessageService.markAsRead(conversationId, userId);

        const readData = {
          conversationId,
          messageId,
          readBy: userId,
          readAt: new Date().toISOString()
        };

        io.to(dmRoomFor(conversationId)).emit("dm:messageRead", readData);
        io.to(dmRoomFor(conversationId)).emit("messageRead", readData);

        if (senderId) {
          io.to(userRoomFor(senderId)).emit("dm:messageRead", readData);
        }

        if (typeof acknowledge === "function") {
          acknowledge({ success: true, data: readData, ...readData });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to mark as read";
        if (typeof acknowledge === "function") {
          acknowledge({ success: false, message });
        }
      }
    }
  );

  // Backward-compatible markAsRead
  socket.on("markAsRead", async (payload: unknown, acknowledge?: unknown) => {
    try {
      const input = socketMarkAsReadSchema.parse(payload);
      await directMessageService.markAsRead(input.conversationId, userId);
      const readData = {
        conversationId: input.conversationId,
        messageId: input.messageId,
        readAt: new Date().toISOString()
      };
      io.to(dmRoomFor(input.conversationId)).emit("messageRead", readData);
      io.to(dmRoomFor(input.conversationId)).emit("dm:messageRead", readData);
      if (typeof acknowledge === "function") {
        acknowledge({ success: true, data: readData, ...readData });
      }
    } catch (error) {
      if (typeof acknowledge === "function") {
        acknowledge({ success: false });
      }
    }
  });

  // ── 4. Scoped Typing Indicators ───────────────────────────────────────────
  socket.on(
    "dm:typing",
    (payload: { conversationId: string; recipientId: string }) => {
      const { conversationId, recipientId } = payload;
      if (!recipientId) return;

      io.to(userRoomFor(recipientId)).emit("dm:userTyping", {
        conversationId,
        senderId: userId,
        name: socket.data.user?.name || "Classmate"
      });
      io.to(userRoomFor(recipientId)).emit("typing", {
        conversationId,
        userId
      });
    }
  );

  socket.on(
    "dm:stopTyping",
    (payload: { conversationId: string; recipientId: string }) => {
      const { conversationId, recipientId } = payload;
      if (!recipientId) return;

      io.to(userRoomFor(recipientId)).emit("dm:userStoppedTyping", {
        conversationId,
        senderId: userId
      });
      io.to(userRoomFor(recipientId)).emit("stopTyping", {
        conversationId,
        userId
      });
    }
  );

  // Legacy typingStart and typingStop for integration tests
  socket.on("typingStart", (payload: { conversationId?: string }) => {
    if (!payload?.conversationId) return;
    socket.to(dmRoomFor(payload.conversationId)).emit("userTyping", {
      conversationId: payload.conversationId,
      userId
    });
  });

  socket.on("typingStop", (payload: { conversationId?: string }) => {
    if (!payload?.conversationId) return;
    socket.to(dmRoomFor(payload.conversationId)).emit("userStoppedTyping", {
      conversationId: payload.conversationId,
      userId
    });
  });

  // Legacy typing and stopTyping for web client
  socket.on("typing", (payload: { conversationId?: string; receiverId?: string; recipientId?: string }) => {
    const targetRecipient = payload?.receiverId || payload?.recipientId;
    if (targetRecipient) {
      io.to(userRoomFor(targetRecipient)).emit("typing", {
        conversationId: payload.conversationId,
        userId
      });
      io.to(userRoomFor(targetRecipient)).emit("dm:userTyping", {
        conversationId: payload.conversationId,
        senderId: userId,
        name: socket.data.user?.name || "Classmate"
      });
    }
    if (payload?.conversationId) {
      socket.to(dmRoomFor(payload.conversationId)).emit("typing", {
        conversationId: payload.conversationId,
        userId
      });
    }
  });

  socket.on("stopTyping", (payload: { conversationId?: string; receiverId?: string; recipientId?: string }) => {
    const targetRecipient = payload?.receiverId || payload?.recipientId;
    if (targetRecipient) {
      io.to(userRoomFor(targetRecipient)).emit("stopTyping", {
        conversationId: payload.conversationId,
        userId
      });
      io.to(userRoomFor(targetRecipient)).emit("dm:userStoppedTyping", {
        conversationId: payload.conversationId,
        senderId: userId
      });
    }
    if (payload?.conversationId) {
      socket.to(dmRoomFor(payload.conversationId)).emit("stopTyping", {
        conversationId: payload.conversationId,
        userId
      });
    }
  });

  // ── 5. Conversation Lifecycle Handlers ────────────────────────────────────
  socket.on("startConversation", async (payload: unknown, acknowledge?: unknown) => {
    try {
      const { receiverId } = socketStartConversationSchema.parse(payload);
      const conversation = await directMessageService.startConversation(userId, receiverId);
      const conversationId = conversation!._id.toString();

      await socket.join(dmRoomFor(conversationId));
      io.to(dmRoomFor(conversationId)).emit("conversationCreated", conversation);
      io.to(userRoomFor(receiverId)).emit("conversationCreated", conversation);

      if (typeof acknowledge === "function") {
        acknowledge({ success: true, data: conversation });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start conversation";
      if (typeof acknowledge === "function") acknowledge({ success: false, message });
    }
  });

  socket.on("joinConversation", async (payload: unknown, acknowledge?: unknown) => {
    try {
      const { conversationId } = socketConversationSchema.parse(payload);
      await directMessageService.getConversation(conversationId, userId);
      await socket.join(dmRoomFor(conversationId));
      if (typeof acknowledge === "function") acknowledge({ success: true, conversationId, data: { conversationId } });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to join conversation";
      if (typeof acknowledge === "function") acknowledge({ success: false, message });
      socket.emit("dmError", { message });
    }
  });

  socket.on("leaveConversation", async (payload: unknown, acknowledge?: unknown) => {
    try {
      const { conversationId } = socketConversationSchema.parse(payload);
      await socket.leave(dmRoomFor(conversationId));
      if (typeof acknowledge === "function") acknowledge({ success: true, conversationId, data: { conversationId } });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to leave conversation";
      if (typeof acknowledge === "function") acknowledge({ success: false, message });
    }
  });

  socket.on("editDirectMessage", async (payload: unknown, acknowledge?: unknown) => {
    try {
      const input = socketEditDirectMessageSchema.parse(payload);
      const updated = await directMessageService.editMessage(
        input.messageId,
        userId,
        input.content
      );
      const data = updated.toJSON?.() ?? updated;
      io.to(dmRoomFor(input.conversationId)).emit("directMessageUpdated", data);
      if (typeof acknowledge === "function") acknowledge({ success: true, data });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to edit direct message";
      if (typeof acknowledge === "function") acknowledge({ success: false, message });
      socket.emit("dmError", { message });
    }
  });

  socket.on("deleteDirectMessage", async (payload: unknown, acknowledge?: unknown) => {
    try {
      const input = socketDeleteDirectMessageSchema.parse(payload);
      const deleted = await directMessageService.deleteMessage(input.messageId, userId);
      const data = deleted.toJSON?.() ?? deleted;
      io.to(dmRoomFor(input.conversationId)).emit("directMessageDeleted", data);
      if (typeof acknowledge === "function") acknowledge({ success: true, data });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete direct message";
      if (typeof acknowledge === "function") acknowledge({ success: false, message });
      socket.emit("dmError", { message });
    }
  });

  // ── 6. Direct Message Emoji Reaction ─────────────────────────────────────
  socket.on(
    "dm:reaction",
    async (
      payload: {
        messageId: string;
        conversationId: string;
        emoji: string;
        category?: "STANDARD" | "CAMPUS_CUSTOM";
      },
      acknowledge?: (res: unknown) => void
    ) => {
      try {
        const { messageId, conversationId, emoji, category = "STANDARD" } = payload;
        if (!messageId || !conversationId || !emoji) {
          throw new Error("messageId, conversationId, and emoji are required");
        }

        const message = await DirectMessage.findById(messageId);
        if (!message || message.deleted || message.isDeletedForEveryone) {
          throw new Error("Direct message not found or deleted");
        }

        if (!message.reactions) message.reactions = [];
        const existingIdx = message.reactions.findIndex((r) => r.emoji === emoji);

        if (existingIdx !== -1 && message.reactions[existingIdx]) {
          const rx = message.reactions[existingIdx];
          const userIdx = rx.users.findIndex((u) => u.toString() === userId);
          if (userIdx !== -1) {
            rx.users.splice(userIdx, 1);
            rx.count = rx.users.length;
            if (rx.users.length === 0) {
              message.reactions.splice(existingIdx, 1);
            }
          } else {
            rx.users.push(new Types.ObjectId(userId));
            rx.count = rx.users.length;
          }
        } else {
          message.reactions.push({
            emoji,
            count: 1,
            users: [new Types.ObjectId(userId)],
            category
          });
        }

        await message.save();

        const reactionData = {
          messageId,
          conversationId,
          reactions: message.reactions,
          userId,
          name: socket.data.user?.name || "Student",
          emoji
        };

        io.to(dmRoomFor(conversationId)).emit("dm:reactionUpdated", reactionData);
        if (typeof acknowledge === "function") acknowledge({ success: true, reactions: message.reactions });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update reaction";
        if (typeof acknowledge === "function") acknowledge({ success: false, message });
      }
    }
  );

  // ── 7. Dual-Tier Deletion: Delete For Me ──────────────────────────────────
  socket.on(
    "dm:deleteForMe",
    async (
      payload: { messageId: string; conversationId: string },
      acknowledge?: (res: unknown) => void
    ) => {
      try {
        const { messageId, conversationId } = payload;
        await directMessageService.getConversation(conversationId, userId);
        await DirectMessage.findByIdAndUpdate(messageId, {
          $addToSet: { deletedFor: new Types.ObjectId(userId) }
        });

        socket.emit("dm:messageDeletedForMe", { messageId, conversationId });
        if (typeof acknowledge === "function") acknowledge({ success: true, messageId });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to delete direct message for me";
        if (typeof acknowledge === "function") acknowledge({ success: false, message });
        socket.emit("dmError", { message });
      }
    }
  );

  // ── 8. Dual-Tier Deletion: Delete For Everyone ────────────────────────────
  socket.on(
    "dm:deleteForEveryone",
    async (
      payload: { messageId: string; conversationId: string },
      acknowledge?: (res: unknown) => void
    ) => {
      try {
        const { messageId, conversationId } = payload;
        const message = await DirectMessage.findById(messageId);
        if (!message || message.deleted) throw new Error("Direct message not found");

        if (message.senderId.toString() !== userId && socket.data.user?.role !== "ADMIN") {
          throw new Error("You can only delete your own messages for everyone");
        }

        if (message.senderId.toString() === userId && socket.data.user?.role !== "ADMIN") {
          const timeDiff = Date.now() - new Date(message.createdAt).getTime();
          if (timeDiff > 24 * 60 * 60 * 1000) {
            throw new Error("Messages can only be deleted for everyone within 24 hours of sending");
          }
        }

        message.isDeletedForEveryone = true;
        message.deletedBy = new Types.ObjectId(userId);
        message.deletedAt = new Date();
        message.content = "";
        message.attachments = [];
        await message.save();

        const purgeData = {
          messageId,
          conversationId,
          isDeletedForEveryone: true,
          deletedBy: userId,
          deletedByName: socket.data.user?.name || "Sender",
          deletedAt: message.deletedAt.toISOString()
        };

        io.to(dmRoomFor(conversationId)).emit("dm:messagePurged", purgeData);
        // Backward compatibility
        io.to(dmRoomFor(conversationId)).emit("directMessageDeleted", { _id: messageId, conversationId, isDeletedForEveryone: true });

        if (typeof acknowledge === "function") acknowledge({ success: true, data: purgeData });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to delete direct message for everyone";
        if (typeof acknowledge === "function") acknowledge({ success: false, message });
        socket.emit("dmError", { message });
      }
    }
  );

  // ── 9. Direct Message Lock Toggle ─────────────────────────────────────────
  socket.on(
    "dm:toggleLock",
    async (
      payload: { conversationId: string; isLocked: boolean; lockedReason?: string },
      acknowledge?: (res: unknown) => void
    ) => {
      try {
        const { conversationId, isLocked, lockedReason } = payload;
        const conversation = await directMessageService.getConversation(conversationId, userId);
        if (!conversation) throw new Error("Conversation not found");

        conversation.isLocked = isLocked;
        conversation.lockedBy = new Types.ObjectId(userId);
        conversation.lockedReason = lockedReason || "";
        conversation.lockedAt = new Date();
        await conversation.save();

        const lockData = {
          conversationId,
          isLocked,
          lockedBy: userId,
          lockedByName: socket.data.user?.name || "Classmate",
          lockedReason: lockedReason || "",
          lockedAt: conversation.lockedAt.toISOString()
        };

        io.to(dmRoomFor(conversationId)).emit("dm:lockStateChanged", lockData);
        conversation.participants.forEach((p: any) => {
          io.to(userRoomFor(p._id?.toString() || p.toString())).emit("dm:lockStateChanged", lockData);
        });

        if (typeof acknowledge === "function") acknowledge({ success: true, data: lockData });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to toggle direct message lock";
        if (typeof acknowledge === "function") acknowledge({ success: false, message });
        socket.emit("dmError", { message });
      }
    }
  );
};
