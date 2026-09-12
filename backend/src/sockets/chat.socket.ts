import type { Server, Socket } from "socket.io";
import { Types } from "mongoose";
import { chatService } from "../services/chat.service.js";
import { Message } from "../models/message.model.js";
import { Community } from "../models/community.model.js";
import { User } from "../models/user.model.js";
import { academicClassifierService } from "../services/academic-classifier.service.js";
import {
  socketCommunitySchema,
  socketDeleteMessageSchema,
  socketEditMessageSchema,
  socketSendMessageSchema
} from "../validators/chat.validator.js";
import type { SocketRegistry } from "./presence.socket.js";

// ── In-Memory Strict Study Mode Strike & Timeout Tracking ───────────────────
export const channelTimeouts = new Map<string, number>(); // `${userId}:${channelId}` -> expiration ms
export const violationStrikes = new Map<string, { count: number; lastViolation: number }>();

export interface FocusInterceptionRecord {
  id: string;
  userId: string;
  userName: string;
  userRoll: string;
  userDepartment: string;
  communityId: string;
  channelId: string;
  originalContent: string;
  reason: string;
  confidence: number;
  matchedKeywords: string[];
  flaggedViolations: string[];
  strikes: number;
  timestamp: string;
}

export const recentFocusInterceptions: FocusInterceptionRecord[] = [];

interface JoinRoomPayload {
  communityId: string;
  channelId?: string;
}

interface SendMessagePayload {
  communityId: string;
  channelId?: string;
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
    title?: string;
  };
  intent?: "chat" | "question" | "solution" | "code";
  replyTo?: string;
}

interface ReactionPayload {
  messageId: string;
  communityId: string;
  emoji: string;
}

const communityRoomFor = (communityId: string, channelId?: string) =>
  channelId ? `room:${communityId}:${channelId}` : `room:${communityId}`;

/**
 * Community Study Rooms Socket Controller
 * Real-time group collaboration, rich message broadcast, live typing, and reactions.
 */
export const registerChatHandlers = (
  io: Server,
  socket: Socket,
  registry: SocketRegistry
): void => {
  const userId = socket.data.userId as string;

  // ── 1. Join Community / Channel Study Room ────────────────────────────────
  socket.on(
    "chat:joinRoom",
    async (payload: JoinRoomPayload, acknowledge?: (res: unknown) => void) => {
      try {
        const { communityId, channelId } = payload;
        if (!communityId) throw new Error("communityId is required");

        await chatService.requireMembership(communityId, userId);
        const roomName = communityRoomFor(communityId, channelId);

        await socket.join(roomName);
        await socket.join(`room:${communityId}`);
        await socket.join(`community:${communityId}`);

        // Compute room roster count
        const socketsInRoom = await io.in(roomName).fetchSockets();
        const participantCount = socketsInRoom.length;

        socket.to(roomName).emit("chat:userJoined", {
          communityId,
          channelId,
          userId,
          name: socket.data.user?.name || "Student",
          participantCount
        });

        if (typeof acknowledge === "function") {
          acknowledge({ success: true, communityId, channelId, participantCount });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to join room";
        if (typeof acknowledge === "function") {
          acknowledge({ success: false, message });
        }
        socket.emit("chatError", { message });
      }
    }
  );

  // Backward compatibility alias for joinCommunity
  socket.on("joinCommunity", async (payload: unknown, acknowledge?: unknown) => {
    try {
      const { communityId } = socketCommunitySchema.parse(payload);
      await chatService.requireMembership(communityId, userId);
      await socket.join(`room:${communityId}`);
      await socket.join(`community:${communityId}`);

      const onlineUserIds = Array.from(registry.onlineUsersMap.keys());

      socket.to(`room:${communityId}`).emit("userJoined", {
        communityId,
        userId,
        onlineUserIds
      });
      socket.to(`community:${communityId}`).emit("userJoined", {
        communityId,
        userId,
        onlineUserIds
      });

      if (typeof acknowledge === "function") {
        acknowledge({
          success: true,
          communityId,
          data: { communityId, onlineUserIds }
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to join community";
      if (typeof acknowledge === "function") {
        acknowledge({ success: false, message });
      }
      socket.emit("chatError", { message });
    }
  });

  // Alias for chat.page.tsx joinRoom
  socket.on("joinRoom", async (payload: { roomId?: string; communityId?: string }, acknowledge?: unknown) => {
    try {
      const targetId = payload?.roomId || payload?.communityId;
      if (targetId) {
        await socket.join(`room:${targetId}`);
        await socket.join(`community:${targetId}`);
      }
      if (typeof acknowledge === "function") {
        acknowledge({ success: true, data: { roomId: targetId } });
      }
    } catch {
      if (typeof acknowledge === "function") {
        acknowledge({ success: false });
      }
    }
  });

  // ── 2. Leave Room ─────────────────────────────────────────────────────────
  socket.on(
    "chat:leaveRoom",
    async (payload: JoinRoomPayload, acknowledge?: (res: unknown) => void) => {
      try {
        const { communityId, channelId } = payload;
        const roomName = communityRoomFor(communityId, channelId);

        await socket.leave(roomName);

        socket.to(roomName).emit("chat:userLeft", {
          communityId,
          channelId,
          userId
        });

        if (typeof acknowledge === "function") {
          acknowledge({ success: true });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to leave room";
        if (typeof acknowledge === "function") {
          acknowledge({ success: false, message });
        }
      }
    }
  );

  socket.on("leaveCommunity", async (payload: unknown, acknowledge?: unknown) => {
    try {
      const { communityId } = socketCommunitySchema.parse(payload);
      await socket.leave(`room:${communityId}`);
      await socket.leave(`community:${communityId}`);

      const onlineUserIds = Array.from(registry.onlineUsersMap.keys());
      socket.to(`room:${communityId}`).emit("userLeft", { communityId, userId, onlineUserIds });
      socket.to(`community:${communityId}`).emit("userLeft", { communityId, userId, onlineUserIds });

      if (typeof acknowledge === "function") {
        acknowledge({ success: true, data: { communityId, onlineUserIds } });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to leave community";
      if (typeof acknowledge === "function") {
        acknowledge({ success: false, message });
      }
    }
  });

  socket.on("leaveRoom", async (payload: { roomId?: string; communityId?: string }, acknowledge?: unknown) => {
    try {
      const targetId = payload?.roomId || payload?.communityId;
      if (targetId) {
        await socket.leave(`room:${targetId}`);
        await socket.leave(`community:${targetId}`);
      }
      if (typeof acknowledge === "function") {
        acknowledge({ success: true });
      }
    } catch {
      if (typeof acknowledge === "function") {
        acknowledge({ success: false });
      }
    }
  });

  // ── 3. Send Message ───────────────────────────────────────────────────────
  socket.on(
    "chat:sendMessage",
    async (payload: SendMessagePayload, acknowledge?: (res: unknown) => void) => {
      try {
        const { communityId, channelId, content, replyTo, intent, codeSnippet } = payload;
        await chatService.requireMembership(communityId, userId);

        const chanKey = channelId || "general";
        const strikeKey = `${userId}:${chanKey}`;

        // 1. Timeout Check
        const timeoutUntil = channelTimeouts.get(strikeKey);
        if (timeoutUntil && timeoutUntil > Date.now()) {
          const remainingSeconds = Math.ceil((timeoutUntil - Date.now()) / 1000);
          const msg = `You are timed out from #${chanKey} for ${remainingSeconds}s due to repeated off-topic messages.`;
          socket.emit("chat:userTimedOut", {
            channelId: chanKey,
            remainingSeconds,
            message: msg
          });
          if (typeof acknowledge === "function") {
            acknowledge({ success: false, timedOut: true, remainingSeconds, message: msg });
          }
          return;
        }

        // 2. Resolve Channel Strict Study Configuration
        let isStrict = false;
        let academicTags: string[] = ["algorithms", "code", "homework", "exam", "syllabus", "lecture", "assignment"];
        let strictnessThreshold = 0.40;
        let allowCodeSnippetsOnly = false;
        let strikeLimitBeforeTimeout = 3;
        let timeoutDurationMinutes = 5;

        const chanLower = chanKey.toLowerCase();
        try {
          const community = await Community.findById(communityId).lean();
          if (community?.channels && community.channels.length > 0) {
            const ch = community.channels.find(
              (c: any) => c._id?.toString() === chanKey || c.name?.toLowerCase() === chanLower
            );
            if (ch) {
              // 2a. Check if channel is administratively locked
              if (ch.isLocked) {
                const isModOrOwner =
                  community.owner?.toString() === userId ||
                  community.moderators?.some((m: any) => m.toString() === userId) ||
                  socket.data.user?.role === "ADMIN";
                if (!isModOrOwner) {
                  const reasonMsg = ch.lockedReason
                    ? `Channel is locked: "${ch.lockedReason}". Only moderators can post.`
                    : "This channel is locked in read-only mode.";
                  socket.emit("chatError", { message: reasonMsg });
                  if (typeof acknowledge === "function") {
                    acknowledge({ success: false, locked: true, message: reasonMsg });
                  }
                  return;
                }
              }

              isStrict = ch.isStrictStudyMode === true;
              if (Array.isArray(ch.academicContextTags) && ch.academicContextTags.length > 0) {
                academicTags = ch.academicContextTags;
              }
              strictnessThreshold = ch.strictnessThreshold ?? strictnessThreshold;
              allowCodeSnippetsOnly = ch.allowCodeSnippetsOnly ?? allowCodeSnippetsOnly;
              strikeLimitBeforeTimeout = ch.strikeLimitBeforeTimeout ?? strikeLimitBeforeTimeout;
              timeoutDurationMinutes = ch.timeoutDurationMinutes ?? timeoutDurationMinutes;
            }
          }
        } catch {}

        // 3. Evaluate Relevance via AcademicClassifierService
        const evaluation = academicClassifierService.evaluateAcademicRelevance(content || "", {
          isStrictStudyMode: isStrict,
          academicContextTags: academicTags,
          strictnessThreshold,
          allowCodeSnippetsOnly,
          channelName: chanKey
        });

        // 4. Handle Rejection
        if (!evaluation.isAllowed) {
          const now = Date.now();
          const existingStrike = violationStrikes.get(strikeKey);
          let currentStrikes = 1;
          if (existingStrike && now - existingStrike.lastViolation < 5 * 60 * 1000) {
            currentStrikes = existingStrike.count + 1;
          }
          violationStrikes.set(strikeKey, { count: currentStrikes, lastViolation: now });

          let isTimedOut = false;
          let timeoutSeconds = 0;
          if (currentStrikes >= strikeLimitBeforeTimeout) {
            isTimedOut = true;
            timeoutSeconds = timeoutDurationMinutes * 60;
            channelTimeouts.set(strikeKey, now + timeoutSeconds * 1000);
            socket.emit("chat:userTimedOut", {
              channelId: chanKey,
              remainingSeconds: timeoutSeconds,
              message: `Strict Study Mode: Strike limit (${strikeLimitBeforeTimeout}) reached. You are timed out from #${chanKey} for ${timeoutDurationMinutes} minutes.`
            });
          }

          const rejectionPayload = {
            originalContent: content,
            channelId: chanKey,
            reason: evaluation.reason || "Message not related to academic topics.",
            confidence: evaluation.confidence,
            matchedKeywords: evaluation.matchedKeywords,
            flaggedViolations: evaluation.flaggedViolations,
            strikes: currentStrikes,
            strikesRemaining: Math.max(0, strikeLimitBeforeTimeout - currentStrikes),
            isTimedOut,
            timeoutSeconds
          };

          // Emit private rejection event exclusively back to sender
          socket.emit("chat:messageRejected", rejectionPayload);

          // Append to recent focus interceptions for admin triage
          recentFocusInterceptions.unshift({
            id: `intercept-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            userId,
            userName: socket.data.user?.name || "Student",
            userRoll: socket.data.user?.rollNumber || "CS24-100",
            userDepartment: socket.data.user?.department || "Academic",
            communityId,
            channelId: chanKey,
            originalContent: content,
            reason: evaluation.reason || "Off-topic message intercepted",
            confidence: evaluation.confidence,
            matchedKeywords: evaluation.matchedKeywords,
            flaggedViolations: evaluation.flaggedViolations,
            strikes: currentStrikes,
            timestamp: new Date().toISOString()
          });
          if (recentFocusInterceptions.length > 100) recentFocusInterceptions.pop();

          if (typeof acknowledge === "function") {
            acknowledge({
              success: false,
              rejected: true,
              message: evaluation.reason,
              confidence: evaluation.confidence
            });
          }
          return; // DO NOT SAVE TO DB OR BROADCAST!
        }

        // 5. Approved message -> reset strikes
        violationStrikes.delete(strikeKey);

        const created = await chatService.createMessage(
          communityId,
          userId,
          { content: content || "", replyTo, channelId, intent, codeSnippet },
          []
        );

        const roomName = communityRoomFor(communityId, channelId);

        const messageData = {
          ...(created.toJSON?.() ?? created),
          senderName: socket.data.user?.name || "Student",
          senderDepartment: socket.data.user?.department,
          senderRoll: socket.data.user?.rollNumber,
          channelId,
          intent,
          codeSnippet
        };

        // Broadcast to all room members
        io.to(roomName).emit("chat:messageReceived", messageData);
        io.to(`room:${communityId}`).emit("messageCreated", messageData);
        io.to(`community:${communityId}`).emit("messageCreated", messageData);
        io.to(roomName).emit("newMessage", messageData);
        io.to(`room:${communityId}`).emit("newMessage", messageData);

        if (typeof acknowledge === "function") {
          acknowledge({ success: true, data: messageData });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to send message";
        if (typeof acknowledge === "function") {
          acknowledge({ success: false, message });
        }
        socket.emit("chatError", { message });
      }
    }
  );

  // Backward-compatible sendMessage
  socket.on("sendMessage", async (payload: unknown, acknowledge?: unknown) => {
    try {
      const input = socketSendMessageSchema.parse(payload);
      const created = await chatService.createMessage(
        input.communityId,
        userId,
        {
          content: input.content,
          replyTo: input.replyTo,
          channelId: input.channelId,
          intent: input.intent,
          codeSnippet: input.codeSnippet
        },
        []
      );

      const messageData = created.toJSON?.() ?? created;
      io.to(`room:${input.communityId}`).emit("messageCreated", messageData);
      io.to(`community:${input.communityId}`).emit("messageCreated", messageData);
      io.to(`room:${input.communityId}`).emit("newMessage", messageData);
      io.to(`community:${input.communityId}`).emit("newMessage", messageData);
      io.to(`room:${input.communityId}`).emit("chat:messageReceived", messageData);

      if (typeof acknowledge === "function") {
        acknowledge({ success: true, data: messageData });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send message";
      if (typeof acknowledge === "function") {
        acknowledge({ success: false, message });
      }
      socket.emit("chatError", { message });
    }
  });

  // ── 4. Live Typing Feedback ───────────────────────────────────────────────
  socket.on("chat:typing", (payload: JoinRoomPayload) => {
    const { communityId, channelId } = payload;
    if (!communityId) return;

    const roomName = communityRoomFor(communityId, channelId);
    const data = {
      communityId,
      channelId,
      userId,
      name: socket.data.user?.name || "Student"
    };
    socket.to(roomName).emit("chat:userTyping", data);
    socket.to(`room:${communityId}`).emit("userTyping", data);
    socket.to(`community:${communityId}`).emit("userTyping", data);
    socket.to(roomName).emit("typing", { userId, username: socket.data.user?.name || "Student" });
  });

  socket.on("chat:stopTyping", (payload: JoinRoomPayload) => {
    const { communityId, channelId } = payload;
    if (!communityId) return;

    const roomName = communityRoomFor(communityId, channelId);
    const data = {
      communityId,
      channelId,
      userId
    };
    socket.to(roomName).emit("chat:userStoppedTyping", data);
    socket.to(`room:${communityId}`).emit("userStoppedTyping", data);
    socket.to(`community:${communityId}`).emit("userStoppedTyping", data);
    socket.to(roomName).emit("stopTyping", { userId, username: socket.data.user?.name || "Student" });
  });

  // Legacy typingStart and typingStop for communities
  socket.on("typingStart", (payload: { communityId?: string; roomId?: string }) => {
    const communityId = payload?.communityId || payload?.roomId;
    if (!communityId) return;
    socket.to(`room:${communityId}`).emit("userTyping", { communityId, userId });
    socket.to(`community:${communityId}`).emit("userTyping", { communityId, userId });
    socket.to(`room:${communityId}`).emit("typing", { userId, username: socket.data.user?.name || "Student" });
  });

  socket.on("typingStop", (payload: { communityId?: string; roomId?: string }) => {
    const communityId = payload?.communityId || payload?.roomId;
    if (!communityId) return;
    socket.to(`room:${communityId}`).emit("userStoppedTyping", { communityId, userId });
    socket.to(`community:${communityId}`).emit("userStoppedTyping", { communityId, userId });
    socket.to(`room:${communityId}`).emit("stopTyping", { userId, username: socket.data.user?.name || "Student" });
  });

  // ── 5. Message Emoji Reaction ─────────────────────────────────────────────
  socket.on(
    "chat:reaction",
    async (
      payload: {
        messageId: string;
        communityId: string;
        channelId?: string;
        emoji: string;
        category?: "STANDARD" | "CAMPUS_CUSTOM";
      },
      acknowledge?: (res: unknown) => void
    ) => {
      try {
        const { messageId, communityId, channelId, emoji, category = "STANDARD" } = payload;
        if (!messageId || !communityId || !emoji) {
          throw new Error("messageId, communityId, and emoji are required");
        }

        const message = await Message.findById(messageId);
        if (!message || message.deleted || message.isDeletedForEveryone) {
          throw new Error("Message not found or deleted");
        }

        if (!message.reactions) message.reactions = [];
        const existingIdx = message.reactions.findIndex((r) => r.emoji === emoji);

        if (existingIdx !== -1) {
          const rx = message.reactions[existingIdx];
          const userIndex = rx.users.findIndex((u) => u.toString() === userId);
          if (userIndex !== -1) {
            rx.users.splice(userIndex, 1);
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

        const roomName = communityRoomFor(communityId, channelId || message.channelId);
        const reactionData = {
          messageId,
          communityId,
          channelId: channelId || message.channelId,
          reactions: message.reactions,
          userId,
          name: socket.data.user?.name || "Student",
          emoji
        };

        io.to(roomName).emit("chat:reactionUpdated", reactionData);
        io.to(`room:${communityId}`).emit("chat:reactionUpdated", reactionData);
        io.to(`community:${communityId}`).emit("chat:reactionUpdated", reactionData);

        if (typeof acknowledge === "function") {
          acknowledge({ success: true, reactions: message.reactions });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update reaction";
        if (typeof acknowledge === "function") {
          acknowledge({ success: false, message });
        }
      }
    }
  );

  // ── 5b. Dual-Tier Deletion: Delete For Me ──────────────────────────────────
  socket.on(
    "chat:deleteForMe",
    async (
      payload: { messageId: string; communityId: string },
      acknowledge?: (res: unknown) => void
    ) => {
      try {
        const { messageId, communityId } = payload;
        await chatService.requireMembership(communityId, userId);
        await Message.findByIdAndUpdate(messageId, {
          $addToSet: { deletedFor: new Types.ObjectId(userId) }
        });

        socket.emit("chat:messageDeletedForMe", { messageId, communityId });
        if (typeof acknowledge === "function") acknowledge({ success: true, messageId });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to delete message for me";
        if (typeof acknowledge === "function") acknowledge({ success: false, message });
        socket.emit("chatError", { message });
      }
    }
  );

  // ── 5c. Dual-Tier Deletion: Delete For Everyone ────────────────────────────
  socket.on(
    "chat:deleteForEveryone",
    async (
      payload: { messageId: string; communityId: string; channelId?: string },
      acknowledge?: (res: unknown) => void
    ) => {
      try {
        const { messageId, communityId, channelId } = payload;
        await chatService.requireMembership(communityId, userId);
        const message = await Message.findById(messageId);
        if (!message || message.deleted) throw new Error("Message not found");

        const isAuthor = message.senderId.toString() === userId;
        const community = await Community.findById(communityId);
        const isModOrOwner =
          community?.owner?.toString() === userId ||
          community?.moderators?.some((m: any) => m.toString() === userId) ||
          socket.data.user?.role === "ADMIN";

        if (!isAuthor && !isModOrOwner) {
          throw new Error("You do not have permission to delete this message for everyone");
        }

        if (isAuthor && !isModOrOwner) {
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
          communityId,
          channelId: channelId || message.channelId,
          isDeletedForEveryone: true,
          deletedBy: userId,
          deletedByName: socket.data.user?.name || (isModOrOwner && !isAuthor ? "Moderator" : "Sender"),
          deletedAt: message.deletedAt.toISOString()
        };

        const roomName = communityRoomFor(communityId, channelId || message.channelId);
        io.to(roomName).emit("chat:messagePurged", purgeData);
        io.to(`room:${communityId}`).emit("chat:messagePurged", purgeData);
        io.to(`community:${communityId}`).emit("chat:messagePurged", purgeData);

        // Backward compatibility
        io.to(roomName).emit("messageDeleted", { _id: messageId, communityId, isDeletedForEveryone: true });

        if (typeof acknowledge === "function") acknowledge({ success: true, data: purgeData });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to delete message for everyone";
        if (typeof acknowledge === "function") acknowledge({ success: false, message });
        socket.emit("chatError", { message });
      }
    }
  );

  // ── 5d. Chat/Channel Lock Toggle ──────────────────────────────────────────
  socket.on(
    "chat:toggleChannelLock",
    async (
      payload: { communityId: string; channelId: string; isLocked: boolean; lockedReason?: string },
      acknowledge?: (res: unknown) => void
    ) => {
      try {
        const { communityId, channelId, isLocked, lockedReason } = payload;
        const community = await Community.findById(communityId);
        if (!community) throw new Error("Community not found");

        const isModOrOwner =
          community.owner?.toString() === userId ||
          community.moderators?.some((m: any) => m.toString() === userId) ||
          socket.data.user?.role === "ADMIN";

        if (!isModOrOwner) {
          throw new Error("Only community owners or moderators can change channel lock state");
        }

        const channel = community.channels.find(
          (c: any) => c._id?.toString() === channelId || c.name === channelId
        );
        if (!channel) throw new Error("Channel not found");

        channel.isLocked = isLocked;
        channel.lockedBy = new Types.ObjectId(userId);
        channel.lockedReason = lockedReason || "";
        channel.lockedAt = new Date();
        await community.save();

        const lockData = {
          communityId,
          channelId: channel._id?.toString() || channelId,
          channelName: channel.name,
          isLocked,
          lockedBy: userId,
          lockedByName: socket.data.user?.name || "Moderator",
          lockedReason: lockedReason || "",
          lockedAt: channel.lockedAt.toISOString()
        };

        const roomName = communityRoomFor(communityId, channelId);
        io.to(roomName).emit("channel:lockStateChanged", lockData);
        io.to(`room:${communityId}`).emit("channel:lockStateChanged", lockData);
        io.to(`community:${communityId}`).emit("channel:lockStateChanged", lockData);

        if (typeof acknowledge === "function") acknowledge({ success: true, data: lockData });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to toggle channel lock";
        if (typeof acknowledge === "function") acknowledge({ success: false, message });
        socket.emit("chatError", { message });
      }
    }
  );

  // ── 6. Message Edit & Delete ──────────────────────────────────────────────
  socket.on("editMessage", async (payload: unknown, acknowledge?: unknown) => {
    try {
      const input = socketEditMessageSchema.parse(payload);
      const updated = await chatService.editMessage(
        input.communityId,
        input.messageId,
        userId,
        input.content
      );
      const data = updated.toJSON?.() ?? updated;
      io.to(`room:${input.communityId}`).emit("messageUpdated", data);
      io.to(`community:${input.communityId}`).emit("messageUpdated", data);
      if (typeof acknowledge === "function") acknowledge({ success: true, data });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to edit message";
      if (typeof acknowledge === "function") acknowledge({ success: false, message });
      socket.emit("chatError", { message });
    }
  });

  socket.on("deleteMessage", async (payload: unknown, acknowledge?: unknown) => {
    try {
      const input = socketDeleteMessageSchema.parse(payload);
      const deleted = await chatService.deleteMessage(
        input.communityId,
        input.messageId,
        userId
      );
      const data = deleted.toJSON?.() ?? deleted;
      io.to(`room:${input.communityId}`).emit("messageDeleted", data);
      io.to(`community:${input.communityId}`).emit("messageDeleted", data);
      if (typeof acknowledge === "function") acknowledge({ success: true, data });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete message";
      if (typeof acknowledge === "function") acknowledge({ success: false, message });
      socket.emit("chatError", { message });
    }
  });

  // ── 7. Get Recent Focus Interceptions (Admin / Moderator) ─────────────────
  socket.on(
    "chat:getFocusInterceptions",
    (_payload: unknown, acknowledge?: (res: unknown) => void) => {
      if (typeof acknowledge === "function") {
        acknowledge({
          success: true,
          data: recentFocusInterceptions
        });
      }
    }
  );
  // ── 8. Thread Discussion Handlers ─────────────────────────────────────────
  socket.on(
    "chat:sendThreadReply",
    async (
      payload: {
        communityId: string;
        channelId?: string;
        parentMessageId: string;
        content: string;
        codeSnippet?: { language: string; code: string; title?: string };
      },
      acknowledge?: (res: unknown) => void
    ) => {
      try {
        const { communityId, channelId, parentMessageId, content, codeSnippet } = payload;
        await chatService.requireMembership(communityId, userId);

        const parent = await Message.findById(parentMessageId);
        if (!parent || parent.deleted) {
          throw new Error("Parent message not found");
        }

        const reply = await chatService.createMessage(
          communityId,
          userId,
          {
            content: content || "",
            replyTo: parentMessageId,
            channelId,
            intent: "chat",
            codeSnippet
          },
          []
        );

        // Update parent metrics
        parent.threadCount = (parent.threadCount || 0) + 1;
        parent.threadLastReplyAt = new Date();
        await parent.save();

        const replyData = {
          ...(reply.toJSON?.() ?? reply),
          senderName: socket.data.user?.name || "Student",
          senderDepartment: socket.data.user?.department,
          senderRoll: socket.data.user?.rollNumber,
          parentMessageId
        };

        const roomName = communityRoomFor(communityId, channelId);
        io.to(roomName).emit("chat:threadReplyReceived", replyData);
        io.to(`room:${communityId}`).emit("chat:threadReplyReceived", replyData);
        io.to(`thread:${parentMessageId}`).emit("chat:threadReplyReceived", replyData);

        if (typeof acknowledge === "function") {
          acknowledge({ success: true, data: replyData });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to send thread reply";
        if (typeof acknowledge === "function") acknowledge({ success: false, message });
        socket.emit("chatError", { message });
      }
    }
  );

  socket.on(
    "chat:getThreadReplies",
    async (
      payload: { communityId: string; parentMessageId: string },
      acknowledge?: (res: unknown) => void
    ) => {
      try {
        const { communityId, parentMessageId } = payload;
        await chatService.requireMembership(communityId, userId);
        await socket.join(`thread:${parentMessageId}`);

        const replies = await Message.find({
          communityId,
          replyTo: parentMessageId,
          deleted: { $ne: true }
        })
          .sort({ createdAt: 1 })
          .populate("senderId", "fullName rollNumber profilePicture karma")
          .exec();

        if (typeof acknowledge === "function") {
          acknowledge({ success: true, replies });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get thread replies";
        if (typeof acknowledge === "function") acknowledge({ success: false, message });
      }
    }
  );

  // ── 9. Message Pinning & Academic Accepted Solution ───────────────────────
  socket.on(
    "chat:pinMessage",
    async (
      payload: { communityId: string; channelId?: string; messageId: string; isPinned: boolean },
      acknowledge?: (res: unknown) => void
    ) => {
      try {
        const { communityId, channelId, messageId, isPinned } = payload;
        await chatService.requireMembership(communityId, userId);

        const updated = await Message.findByIdAndUpdate(
          messageId,
          { isPinned },
          { new: true }
        ).populate("senderId", "fullName rollNumber profilePicture karma");

        if (!updated) throw new Error("Message not found");

        const roomName = communityRoomFor(communityId, channelId);
        const pinData = { messageId, isPinned, message: updated, pinnedBy: userId };
        io.to(roomName).emit("chat:messagePinned", pinData);
        io.to(`room:${communityId}`).emit("chat:messagePinned", pinData);

        if (typeof acknowledge === "function") acknowledge({ success: true, data: pinData });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to pin message";
        if (typeof acknowledge === "function") acknowledge({ success: false, message });
      }
    }
  );

  socket.on(
    "chat:markAcceptedSolution",
    async (
      payload: { communityId: string; channelId?: string; messageId: string },
      acknowledge?: (res: unknown) => void
    ) => {
      try {
        const { communityId, channelId, messageId } = payload;
        await chatService.requireMembership(communityId, userId);

        const message = await Message.findById(messageId);
        if (!message || message.deleted) throw new Error("Message not found");

        message.isAcceptedSolution = true;
        message.karmaAwarded = (message.karmaAwarded || 0) + 25;
        await message.save();

        // Award 25 karma to solution author
        await User.findByIdAndUpdate(message.senderId, { $inc: { karma: 25 } });

        const roomName = communityRoomFor(communityId, channelId);
        const solutionData = {
          messageId,
          channelId,
          solverId: message.senderId.toString(),
          karmaAwarded: 25
        };

        io.to(roomName).emit("chat:solutionAccepted", solutionData);
        io.to(`room:${communityId}`).emit("chat:solutionAccepted", solutionData);

        if (typeof acknowledge === "function") acknowledge({ success: true, data: solutionData });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to mark accepted solution";
        if (typeof acknowledge === "function") acknowledge({ success: false, message });
      }
    }
  );

  // ── 10. Synchronized Study Sprints (Pomodoro) ─────────────────────────────
  socket.on(
    "sprint:start",
    async (
      payload: { communityId: string; channelId?: string; durationMinutes?: number; topic?: string },
      acknowledge?: (res: unknown) => void
    ) => {
      try {
        const { communityId, channelId, durationMinutes = 25, topic = "Deep Work Focus Session" } = payload;
        await chatService.requireMembership(communityId, userId);

        const startedAt = new Date();
        const endsAt = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);

        const sprintData = {
          communityId,
          channelId,
          isActive: true,
          durationMinutes,
          startedAt: startedAt.toISOString(),
          endsAt: endsAt.toISOString(),
          topic,
          startedBy: userId,
          startedByName: socket.data.user?.name || "Student",
          participants: [userId]
        };

        await Community.findByIdAndUpdate(communityId, { sprintState: sprintData });

        const roomName = communityRoomFor(communityId, channelId);
        io.to(roomName).emit("sprint:started", sprintData);
        io.to(`room:${communityId}`).emit("sprint:started", sprintData);

        if (typeof acknowledge === "function") acknowledge({ success: true, sprint: sprintData });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to start sprint";
        if (typeof acknowledge === "function") acknowledge({ success: false, message });
      }
    }
  );

  socket.on(
    "sprint:join",
    async (
      payload: { communityId: string; channelId?: string },
      acknowledge?: (res: unknown) => void
    ) => {
      try {
        const { communityId, channelId } = payload;
        await chatService.requireMembership(communityId, userId);

        await Community.findByIdAndUpdate(communityId, {
          $addToSet: { "sprintState.participants": userId }
        });

        const data = { communityId, channelId, userId, userName: socket.data.user?.name || "Student" };
        const roomName = communityRoomFor(communityId, channelId);
        io.to(roomName).emit("sprint:joined", data);
        io.to(`room:${communityId}`).emit("sprint:joined", data);

        if (typeof acknowledge === "function") acknowledge({ success: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to join sprint";
        if (typeof acknowledge === "function") acknowledge({ success: false, message });
      }
    }
  );

  socket.on(
    "sprint:leave",
    async (
      payload: { communityId: string; channelId?: string },
      acknowledge?: (res: unknown) => void
    ) => {
      try {
        const { communityId, channelId } = payload;
        await Community.findByIdAndUpdate(communityId, {
          $pull: { "sprintState.participants": userId }
        });

        const data = { communityId, channelId, userId };
        const roomName = communityRoomFor(communityId, channelId);
        io.to(roomName).emit("sprint:left", data);
        io.to(`room:${communityId}`).emit("sprint:left", data);

        if (typeof acknowledge === "function") acknowledge({ success: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to leave sprint";
        if (typeof acknowledge === "function") acknowledge({ success: false, message });
      }
    }
  );

  socket.on(
    "sprint:complete",
    async (
      payload: { communityId: string; channelId?: string },
      acknowledge?: (res: unknown) => void
    ) => {
      try {
        const { communityId, channelId } = payload;
        const community = await Community.findById(communityId);
        const participantIds = community?.sprintState?.participants || [];

        if (participantIds.length > 0) {
          await User.updateMany(
            { _id: { $in: participantIds } },
            { $inc: { karma: 15 } }
          );
        }

        await Community.findByIdAndUpdate(communityId, {
          "sprintState.isActive": false
        });

        const roomName = communityRoomFor(communityId, channelId);
        const completeData = { communityId, channelId, karmaAwarded: 15, participants: participantIds };
        io.to(roomName).emit("sprint:completed", completeData);
        io.to(`room:${communityId}`).emit("sprint:completed", completeData);

        if (typeof acknowledge === "function") acknowledge({ success: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to complete sprint";
        if (typeof acknowledge === "function") acknowledge({ success: false, message });
      }
    }
  );

  socket.on(
    "sprint:getState",
    async (
      payload: { communityId: string },
      acknowledge?: (res: unknown) => void
    ) => {
      try {
        const community = await Community.findById(payload.communityId, { sprintState: 1 }).lean();
        if (typeof acknowledge === "function") {
          acknowledge({ success: true, sprint: community?.sprintState });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch sprint state";
        if (typeof acknowledge === "function") acknowledge({ success: false, message });
      }
    }
  );
};
