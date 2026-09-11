import type { Server, Socket } from "socket.io";
import { chatService } from "../services/chat.service.js";
import { Message } from "../models/message.model.js";
import { Community } from "../models/community.model.js";
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
  };
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
        const { communityId, channelId, content, replyTo } = payload;
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
        let isStrict = true;
        let academicTags: string[] = ["algorithms", "code", "homework", "exam", "syllabus", "lecture", "assignment"];
        let strictnessThreshold = 0.40;
        let allowCodeSnippetsOnly = false;
        let strikeLimitBeforeTimeout = 3;
        let timeoutDurationMinutes = 5;

        const chanLower = chanKey.toLowerCase();
        if (
          chanLower === "general" ||
          chanLower === "campus-lounge" ||
          chanLower === "random" ||
          chanLower.includes("lounge")
        ) {
          isStrict = false;
        }

        try {
          const community = await Community.findById(communityId, { channels: 1 }).lean();
          if (community?.channels && community.channels.length > 0) {
            const ch = community.channels.find(
              (c: any) => c._id?.toString() === chanKey || c.name?.toLowerCase() === chanLower
            );
            if (ch) {
              isStrict = ch.isStrictStudyMode ?? isStrict;
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
          { content: content || "", replyTo },
          []
        );

        const roomName = communityRoomFor(communityId, channelId);

        const messageData = {
          ...(created.toJSON?.() ?? created),
          senderName: socket.data.user?.name || "Student",
          senderDepartment: socket.data.user?.department,
          senderRoll: socket.data.user?.rollNumber,
          channelId
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
        { content: input.content, replyTo: input.replyTo },
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
    async (payload: ReactionPayload, acknowledge?: (res: unknown) => void) => {
      try {
        const { messageId, communityId, emoji } = payload;
        if (!messageId || !communityId || !emoji) {
          throw new Error("messageId, communityId, and emoji are required");
        }

        const message = await Message.findById(messageId);
        if (!message || message.deleted) {
          throw new Error("Message not found or deleted");
        }

        const roomName = `room:${communityId}`;
        const reactionData = {
          messageId,
          communityId,
          userId,
          name: socket.data.user?.name || "Student",
          emoji
        };
        io.to(roomName).emit("chat:reactionUpdated", reactionData);
        io.to(`community:${communityId}`).emit("chat:reactionUpdated", reactionData);

        if (typeof acknowledge === "function") {
          acknowledge({ success: true });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update reaction";
        if (typeof acknowledge === "function") {
          acknowledge({ success: false, message });
        }
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
};
