import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { env } from "../config/env.js";
import { USER_STATUS } from "../constants/user-status.js";
import { userRepository } from "../repositories/user.repository.js";
import { chatBus } from "../services/chat-bus.service.js";
import { chatService } from "../services/chat.service.js";
import { directMessageService } from "../services/direct-message.service.js";
import { dmBus } from "../services/dm-bus.service.js";
import { notificationBus } from "../services/notification-bus.service.js";
import { notificationService } from "../services/notification.service.js";
import { ApiError } from "../utils/api-error.js";
import { verifyAccessToken } from "../utils/tokens.js";
import {
  socketCommunitySchema,
  socketDeleteMessageSchema,
  socketEditMessageSchema,
  socketSendMessageSchema
} from "../validators/chat.validator.js";
import {
  socketConversationSchema,
  socketDeleteDirectMessageSchema,
  socketEditDirectMessageSchema,
  socketMarkAsReadSchema,
  socketSendDirectMessageSchema,
  socketStartConversationSchema
} from "../validators/direct-message.validator.js";
import { notificationIdParamsSchema } from "../validators/notification.validator.js";

interface ChatSocketData {
  userId: string;
  role: string;
}

interface ServerToClientEvents {
  messageCreated: (message: unknown) => void;
  messageUpdated: (message: unknown) => void;
  messageDeleted: (message: unknown) => void;
  userTyping: (payload: { communityId?: string; conversationId?: string; userId: string }) => void;
  userStoppedTyping: (payload: { communityId?: string; conversationId?: string; userId: string }) => void;
  userJoined: (payload: { communityId: string; userId: string; onlineUserIds: string[] }) => void;
  userLeft: (payload: { communityId: string; userId: string; onlineUserIds: string[] }) => void;
  chatError: (payload: { message: string }) => void;
  conversationCreated: (payload: unknown) => void;
  directMessageCreated: (payload: unknown) => void;
  directMessageUpdated: (payload: unknown) => void;
  directMessageDeleted: (payload: unknown) => void;
  messageRead: (payload: unknown) => void;
  dmError: (payload: { message: string }) => void;
  notificationCreated: (payload: unknown) => void;
  notificationUpdated: (payload: unknown) => void;
  notificationDeleted: (payload: unknown) => void;
  notificationError: (payload: { message: string }) => void;
  unreadCountUpdate: (payload: { count: number }) => void;
}

interface ClientToServerEvents {
  joinCommunity: (payload: unknown, acknowledge?: (response: unknown) => void) => void;
  leaveCommunity: (payload: unknown, acknowledge?: (response: unknown) => void) => void;
  sendMessage: (payload: unknown, acknowledge?: (response: unknown) => void) => void;
  editMessage: (payload: unknown, acknowledge?: (response: unknown) => void) => void;
  deleteMessage: (payload: unknown, acknowledge?: (response: unknown) => void) => void;
  typingStart: (payload: unknown) => void;
  typingStop: (payload: unknown) => void;
  startConversation: (payload: unknown, acknowledge?: (response: unknown) => void) => void;
  joinConversation: (payload: unknown, acknowledge?: (response: unknown) => void) => void;
  leaveConversation: (payload: unknown, acknowledge?: (response: unknown) => void) => void;
  sendDirectMessage: (payload: unknown, acknowledge?: (response: unknown) => void) => void;
  editDirectMessage: (payload: unknown, acknowledge?: (response: unknown) => void) => void;
  deleteDirectMessage: (payload: unknown, acknowledge?: (response: unknown) => void) => void;
  markAsRead: (payload: unknown, acknowledge?: (response: unknown) => void) => void;
  subscribeNotifications: (acknowledge?: (response: unknown) => void) => void;
  markNotificationRead: (payload: unknown, acknowledge?: (response: unknown) => void) => void;
}

type ChatSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, ChatSocketData>;
type ChatServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, ChatSocketData>;

const onlineUsers = new Map<string, Map<string, Set<string>>>();

export const futureSocketModules = [
  "community-chat",
  "direct-message-gateway",
  "voice-signaling-gateway",
  "video-signaling-gateway"
] as const;

export const initializeSockets = (server: HttpServer) => {
  const io: ChatServer = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    ChatSocketData
  >(server, {
    cors: {
      origin: env.CLIENT_URL.split(",").map((url) => url.trim()),
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = tokenFrom(socket);
      if (!token) throw new ApiError(401, "Socket authentication is required", [], "SOCKET_AUTH_REQUIRED");
      const payload = verifyAccessToken(token);
      if (payload.type !== "access") throw new Error("Wrong token type");
      const user = await userRepository.findById(payload.sub);
      if (!user || user.status !== USER_STATUS.ACTIVE) {
        throw new ApiError(401, "User is unavailable", [], "USER_UNAVAILABLE");
      }
      socket.data.userId = user.id;
      socket.data.role = user.role;
      next();
    } catch (error) {
      next(error instanceof Error ? error : new Error("Socket authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const chatSocket = socket as ChatSocket;
    const userId = chatSocket.data.userId;

    chatSocket.join(userRoomFor(userId));

    registerCommunityChatHandlers(io, chatSocket);
    registerDirectMessageHandlers(io, chatSocket);
    registerTypingHandler(io, chatSocket);
    registerNotificationHandlers(io, chatSocket);
  });

  chatBus.onCreated((communityId, message) => {
    io.to(roomFor(communityId)).emit("messageCreated", message);
  });
  chatBus.onUpdated((communityId, message) => {
    io.to(roomFor(communityId)).emit("messageUpdated", message);
  });
  chatBus.onDeleted((communityId, message) => {
    io.to(roomFor(communityId)).emit("messageDeleted", message);
  });

  dmBus.onCreated((conversationId, message) => {
    io.to(dmRoomFor(conversationId)).emit("directMessageCreated", message);
  });
  dmBus.onUpdated((conversationId, message) => {
    io.to(dmRoomFor(conversationId)).emit("directMessageUpdated", message);
  });
  dmBus.onDeleted((conversationId, message) => {
    io.to(dmRoomFor(conversationId)).emit("directMessageDeleted", message);
  });
  dmBus.onRead((conversationId, message) => {
    io.to(dmRoomFor(conversationId)).emit("messageRead", message as Record<string, unknown>);
  });

  notificationBus.onCreated((userId, notification) => {
    io.to(userRoomFor(userId)).emit("notificationCreated", notification);
    io.to(userRoomFor(userId)).emit("unreadCountUpdate", { count: 1 });
  });
  notificationBus.onUpdated((userId, notification) => {
    io.to(userRoomFor(userId)).emit("notificationUpdated", notification);
  });
  notificationBus.onDeleted((userId, notification) => {
    io.to(userRoomFor(userId)).emit("notificationDeleted", notification);
  });

  return io;
};

const registerCommunityChatHandlers = (io: ChatServer, socket: ChatSocket) => {
  socket.on("joinCommunity", async (payload: unknown, acknowledge: unknown) => {
    await handleSocketAction(socket, acknowledge, async () => {
      const { communityId } = socketCommunitySchema.parse(payload);
      await chatService.requireMembership(communityId, socket.data.userId);
      await socket.join(roomFor(communityId));
      addOnlineUser(communityId, socket.data.userId, socket.id);
      socket.to(roomFor(communityId)).emit("userJoined", {
        communityId,
        userId: socket.data.userId,
        onlineUserIds: onlineUserIdsFor(communityId)
      });
      return { communityId, onlineUserIds: onlineUserIdsFor(communityId) };
    });
  });

  socket.on("leaveCommunity", async (payload: unknown, acknowledge: unknown) => {
    await handleSocketAction(socket, acknowledge, async () => {
      const { communityId } = socketCommunitySchema.parse(payload);
      await socket.leave(roomFor(communityId));
      removeOnlineUser(communityId, socket.data.userId, socket.id);
      socket.to(roomFor(communityId)).emit("userLeft", {
        communityId,
        userId: socket.data.userId,
        onlineUserIds: onlineUserIdsFor(communityId)
      });
      return { communityId, onlineUserIds: onlineUserIdsFor(communityId) };
    });
  });

  socket.on("sendMessage", async (payload: unknown, acknowledge: unknown) => {
    await handleSocketAction(socket, acknowledge, async () => {
      const input = socketSendMessageSchema.parse(payload);
      return chatService.createMessage(
        input.communityId,
        socket.data.userId,
        { content: input.content, replyTo: input.replyTo },
        []
      );
    });
  });

  socket.on("editMessage", async (payload: unknown, acknowledge: unknown) => {
    await handleSocketAction(socket, acknowledge, async () => {
      const input = socketEditMessageSchema.parse(payload);
      return chatService.editMessage(input.communityId, input.messageId, socket.data.userId, input.content);
    });
  });

  socket.on("deleteMessage", async (payload: unknown, acknowledge: unknown) => {
    await handleSocketAction(socket, acknowledge, async () => {
      const input = socketDeleteMessageSchema.parse(payload);
      return chatService.deleteMessage(input.communityId, input.messageId, socket.data.userId);
    });
  });

  socket.on("disconnect", () => {
    for (const [communityId] of onlineUsers) {
      const removed = removeOnlineUser(communityId, socket.data.userId, socket.id);
      if (removed) {
        io.to(roomFor(communityId)).emit("userLeft", {
          communityId,
          userId: socket.data.userId,
          onlineUserIds: onlineUserIdsFor(communityId)
        });
      }
    }
  });
};

const registerDirectMessageHandlers = (io: ChatServer, socket: ChatSocket) => {
  socket.on("startConversation", async (payload: unknown, acknowledge: unknown) => {
    await handleSocketAction(socket, acknowledge, async () => {
      const { receiverId } = socketStartConversationSchema.parse(payload);
      const conversation = await directMessageService.startConversation(
        socket.data.userId,
        receiverId
      );
      const conversationId = conversation!._id.toString();
      await socket.join(dmRoomFor(conversationId));
      io.to(dmRoomFor(conversationId)).emit("conversationCreated", conversation);
      return conversation;
    });
  });

  socket.on("joinConversation", async (payload: unknown, acknowledge: unknown) => {
    await handleSocketAction(socket, acknowledge, async () => {
      const { conversationId } = socketConversationSchema.parse(payload);
      await directMessageService.getConversation(conversationId, socket.data.userId);
      await socket.join(dmRoomFor(conversationId));
      return { conversationId };
    });
  });

  socket.on("leaveConversation", async (payload: unknown, acknowledge: unknown) => {
    await handleSocketAction(socket, acknowledge, async () => {
      const { conversationId } = socketConversationSchema.parse(payload);
      await socket.leave(dmRoomFor(conversationId));
      return { conversationId };
    });
  });

  socket.on("sendDirectMessage", async (payload: unknown, acknowledge: unknown) => {
    await handleSocketAction(socket, acknowledge, async () => {
      const input = socketSendDirectMessageSchema.parse(payload);
      const { message } = await directMessageService.sendMessage(
        input.conversationId,
        socket.data.userId,
        { content: input.content, replyTo: input.replyTo },
        []
      );
      const conversationRoom = dmRoomFor(input.conversationId);
      io.to(conversationRoom).emit("directMessageCreated", message.toJSON?.() ?? message);
      return message;
    });
  });

  socket.on("editDirectMessage", async (payload: unknown, acknowledge: unknown) => {
    await handleSocketAction(socket, acknowledge, async () => {
      const input = socketEditDirectMessageSchema.parse(payload);
      const updated = await directMessageService.editMessage(
        input.messageId,
        socket.data.userId,
        input.content
      );
      io.to(dmRoomFor(input.conversationId)).emit("directMessageUpdated", updated.toJSON?.() ?? updated);
      return updated;
    });
  });

  socket.on("deleteDirectMessage", async (payload: unknown, acknowledge: unknown) => {
    await handleSocketAction(socket, acknowledge, async () => {
      const input = socketDeleteDirectMessageSchema.parse(payload);
      const deleted = await directMessageService.deleteMessage(
        input.messageId,
        socket.data.userId
      );
      io.to(dmRoomFor(input.conversationId)).emit("directMessageDeleted", deleted.toJSON?.() ?? deleted);
      return deleted;
    });
  });

  socket.on("markAsRead", async (payload: unknown, acknowledge: unknown) => {
    await handleSocketAction(socket, acknowledge, async () => {
      const input = socketMarkAsReadSchema.parse(payload);
      await directMessageService.markAsRead(input.conversationId, socket.data.userId);
      io.to(dmRoomFor(input.conversationId)).emit("messageRead", {
        conversationId: input.conversationId,
        messageId: input.messageId,
        readAt: new Date().toISOString()
      });
      return { conversationId: input.conversationId, readAt: new Date().toISOString() };
    });
  });
};

// Combined typing handler for both community chat and DM
const registerTypingHandler = (io: ChatServer, socket: ChatSocket) => {
  socket.on("typingStart", async (payload: unknown) => {
    const payloadObj = payload as Record<string, unknown> | undefined;
    if (!payloadObj) return;

    if (typeof payloadObj.communityId === "string") {
      const parsed = socketCommunitySchema.safeParse(payload);
      if (!parsed.success) return;
      if (!(await hasMembership(parsed.data.communityId, socket.data.userId))) return;
      socket.to(roomFor(parsed.data.communityId)).emit("userTyping", {
        communityId: parsed.data.communityId,
        userId: socket.data.userId
      });
    } else if (typeof payloadObj.conversationId === "string") {
      const parsed = socketConversationSchema.safeParse(payload);
      if (!parsed.success) return;
      try {
        await directMessageService.getConversation(parsed.data.conversationId, socket.data.userId);
        socket.to(dmRoomFor(parsed.data.conversationId)).emit("userTyping", {
          conversationId: parsed.data.conversationId,
          userId: socket.data.userId
        });
      } catch {
        // ignore
      }
    }
  });

  socket.on("typingStop", async (payload: unknown) => {
    const payloadObj = payload as Record<string, unknown> | undefined;
    if (!payloadObj) return;

    if (typeof payloadObj.communityId === "string") {
      const parsed = socketCommunitySchema.safeParse(payload);
      if (!parsed.success) return;
      if (!(await hasMembership(parsed.data.communityId, socket.data.userId))) return;
      socket.to(roomFor(parsed.data.communityId)).emit("userStoppedTyping", {
        communityId: parsed.data.communityId,
        userId: socket.data.userId
      });
    } else if (typeof payloadObj.conversationId === "string") {
      const parsed = socketConversationSchema.safeParse(payload);
      if (!parsed.success) return;
      try {
        await directMessageService.getConversation(parsed.data.conversationId, socket.data.userId);
        socket.to(dmRoomFor(parsed.data.conversationId)).emit("userStoppedTyping", {
          conversationId: parsed.data.conversationId,
          userId: socket.data.userId
        });
      } catch {
        // ignore
      }
    }
  });
};
// The DM typing handlers above will shadow the community ones on the same socket.
// To support both, we wrap them: if the payload has communityId, use community path;
// if it has conversationId, use DM path. Since both emit different event names,
// the typingStart/typingStop socket events should check payload shape.

const registerNotificationHandlers = (_io: ChatServer, socket: ChatSocket) => {
  socket.on("subscribeNotifications", async (acknowledge: unknown) => {
    try {
      await socket.join(userRoomFor(socket.data.userId));
      if (typeof acknowledge === "function") acknowledge({ success: true });
    } catch {
      if (typeof acknowledge === "function") acknowledge({ success: false, message: "Failed to subscribe" });
    }
  });

  socket.on("markNotificationRead", async (payload: unknown, acknowledge: unknown) => {
    try {
      const rawId = typeof payload === "string" ? payload : (payload as Record<string, unknown>).notificationId;
      const { params: { notificationId } } = notificationIdParamsSchema.parse({ params: { notificationId: rawId } });
      const notification = await notificationService.markAsRead(notificationId, socket.data.userId);
      if (typeof acknowledge === "function") acknowledge({ success: true, data: notification });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to mark notification read";
      if (typeof acknowledge === "function") acknowledge({ success: false, message });
      socket.emit("notificationError", { message });
    }
  });
};

const handleSocketAction = async (
  socket: ChatSocket,
  acknowledge: unknown,
  action: () => Promise<unknown>
) => {
  try {
    const result = await action();
    if (typeof acknowledge === "function") acknowledge({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Socket event failed";
    if (typeof acknowledge === "function") acknowledge({ success: false, message });
    socket.emit("chatError", { message });
  }
};

const tokenFrom = (socket: Socket) => {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === "string") return authToken;
  const header = socket.handshake.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return undefined;
};

const hasMembership = async (communityId: string, userId: string) => {
  try {
    await chatService.requireMembership(communityId, userId);
    return true;
  } catch {
    return false;
  }
};

const roomFor = (communityId: string) => `community:${communityId}`;

const dmRoomFor = (conversationId: string) => `dm:${conversationId}`;

const userRoomFor = (userId: string) => `user:${userId}`;

const addOnlineUser = (communityId: string, userId: string, socketId: string) => {
  const room = onlineUsers.get(communityId) ?? new Map<string, Set<string>>();
  const sockets = room.get(userId) ?? new Set<string>();
  sockets.add(socketId);
  room.set(userId, sockets);
  onlineUsers.set(communityId, room);
};

const removeOnlineUser = (communityId: string, userId: string, socketId: string) => {
  const room = onlineUsers.get(communityId);
  const sockets = room?.get(userId);
  if (!room || !sockets) return false;
  sockets.delete(socketId);
  if (sockets.size === 0) room.delete(userId);
  if (room.size === 0) onlineUsers.delete(communityId);
  return true;
};

const onlineUserIdsFor = (communityId: string) => [...(onlineUsers.get(communityId)?.keys() ?? [])];
