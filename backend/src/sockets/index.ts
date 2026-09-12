import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { isOriginAllowed } from "../config/cors.js";
import { env } from "../config/env.js";
import { USER_STATUS } from "../constants/user-status.js";
import { userRepository } from "../repositories/user.repository.js";
import { chatBus } from "../services/chat-bus.service.js";
import { dmBus } from "../services/dm-bus.service.js";
import { notificationBus } from "../services/notification-bus.service.js";
import { notificationService } from "../services/notification.service.js";
import { ApiError } from "../utils/api-error.js";
import { verifyAccessToken } from "../utils/tokens.js";
import { notificationIdParamsSchema } from "../validators/notification.validator.js";
import {
  type SocketRegistry,
  type VoicePeer,
  registerPresenceHandlers
} from "./presence.socket.js";
import { registerChatHandlers } from "./chat.socket.js";
import { registerDmHandlers } from "./dm.socket.js";
import { registerVoiceHandlers } from "./voice.socket.js";
import { registerAdminBroadcastHandlers } from "./admin.socket.js";

const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_MAX_EVENTS = 15;
const socketRateLimits = new Map<string, { count: number; resetAt: number }>();

export const isSocketRateLimited = (socketId: string): boolean => {
  const now = Date.now();
  const entry = socketRateLimits.get(socketId);
  if (!entry || now >= entry.resetAt) {
    socketRateLimits.set(socketId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX_EVENTS;
};

export interface SocketUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  rollNumber?: string;
  academicYear?: number | string;
  batchYear?: number | string;
}

export interface ChatSocketData {
  userId: string;
  role: string;
  user: SocketUser;
}

export const futureSocketModules = [
  "community-chat",
  "direct-message-gateway",
  "voice-signaling-gateway",
  "video-signaling-gateway"
] as const;

/**
 * Global in-memory registry for online tabs and active WebRTC stages
 */
export const socketRegistry: SocketRegistry = {
  onlineUsersMap: new Map<string, Set<string>>(),
  activeVoiceRooms: new Map<string, Set<VoicePeer>>()
};

const tokenFrom = (socket: Socket): string | undefined => {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === "string") return authToken;
  const header = socket.handshake.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return undefined;
};

const registerNotificationHandlers = (_io: Server, socket: Socket): void => {
  socket.on("subscribeNotifications", async (acknowledge?: (res: unknown) => void) => {
    try {
      await socket.join(`user:${socket.data.userId}`);
      if (typeof acknowledge === "function") acknowledge({ success: true });
    } catch {
      if (typeof acknowledge === "function") {
        acknowledge({ success: false, message: "Failed to subscribe" });
      }
    }
  });

  socket.on("markNotificationRead", async (payload: unknown, acknowledge?: (res: unknown) => void) => {
    try {
      const rawId =
        typeof payload === "string" ? payload : (payload as Record<string, unknown>)?.notificationId;
      const {
        params: { notificationId }
      } = notificationIdParamsSchema.parse({ params: { notificationId: rawId } });

      const notification = await notificationService.markAsRead(notificationId, socket.data.userId);
      if (typeof acknowledge === "function") {
        acknowledge({ success: true, data: notification });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to mark notification read";
      if (typeof acknowledge === "function") {
        acknowledge({ success: false, message });
      }
      socket.emit("notificationError", { message });
    }
  });
};

let socketServerInstance: Server | null = null;

export const getSocketServer = (): Server | null => socketServerInstance;

/**
 * Main Socket.IO Server Initialization & Dispatch Gateway
 */
export const initializeSockets = (server: HttpServer): Server => {
  const io = new Server(server, {
    cors: {
      origin(origin, callback) {
        if (isOriginAllowed(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Socket CORS origin '${origin}' not allowed`));
        }
      },
      credentials: true
    },
    transports: ["websocket", "polling"],
    maxHttpBufferSize: 1e6
  });

  // Handshake authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = tokenFrom(socket);
      if (!token) {
        throw new ApiError(401, "Socket authentication is required", [], "UNAUTHORIZED_SOCKET");
      }
      const payload = verifyAccessToken(token);
      if (payload.type !== "access") {
        throw new ApiError(401, "Invalid socket token type", [], "UNAUTHORIZED_SOCKET");
      }
      const user = await userRepository.findById(payload.sub);
      if (!user || user.status !== USER_STATUS.ACTIVE) {
        throw new ApiError(401, "User is unavailable", [], "USER_UNAVAILABLE");
      }

      socket.data.userId = user.id;
      socket.data.role = user.role;
      socket.data.user = {
        id: user.id,
        name: user.fullName,
        email: user.email,
        role: user.role,
        department: user.department,
        rollNumber: user.rollNumber,
        academicYear: user.academicYear
      };

      next();
    } catch (error) {
      next(error instanceof Error ? error : new Error("UNAUTHORIZED_SOCKET"));
    }
  });

  // Client Connection Handler
  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    const user = socket.data.user as SocketUser | undefined;

    // Join personal user room
    socket.join(`user:${userId}`);

    // Join department room if available (for targeted campus alerts)
    if (user?.department) {
      socket.join(`dept:${user.department.toLowerCase().trim()}`);
    }

    // Join role room if available
    if (user?.role) {
      socket.join(`role:${user.role.toLowerCase().trim()}`);
    }

    // Register all modular controllers
    registerPresenceHandlers(io, socket, socketRegistry);
    registerChatHandlers(io, socket, socketRegistry);
    registerDmHandlers(io, socket, socketRegistry);
    registerVoiceHandlers(io, socket, socketRegistry);
    registerAdminBroadcastHandlers(io, socket, socketRegistry);
    registerNotificationHandlers(io, socket);

    socket.on("disconnect", () => {
      socketRateLimits.delete(socket.id);
    });
  });

  // ── Global Event Bus Bridges ───────────────────────────────────────────────
  chatBus.onCreated((communityId, message) => {
    io.to(`community:${communityId}`).emit("messageCreated", message);
    io.to(`room:${communityId}`).emit("messageCreated", message);
    io.to(`room:${communityId}`).emit("newMessage", message);
    io.to(`room:${communityId}`).emit("chat:messageReceived", message);
    const channelId = (message as any)?.channelId;
    if (channelId) {
      io.to(`room:${communityId}:${channelId}`).emit("chat:messageReceived", message);
      io.to(`room:${communityId}:${channelId}`).emit("newMessage", message);
      io.to(`room:${communityId}:${channelId}`).emit("messageCreated", message);
    }
  });
  chatBus.onUpdated((communityId, message) => {
    io.to(`community:${communityId}`).emit("messageUpdated", message);
    io.to(`room:${communityId}`).emit("messageUpdated", message);
  });
  chatBus.onDeleted((communityId, message) => {
    io.to(`community:${communityId}`).emit("messageDeleted", message);
    io.to(`room:${communityId}`).emit("messageDeleted", message);
  });

  dmBus.onCreated((conversationId, message) => {
    io.to(`dm:${conversationId}`).emit("directMessageCreated", message);
    io.to(`dm:${conversationId}`).emit("dm:messageReceived", message);
    io.to(`dm:${conversationId}`).emit("directMessageReceived", message);

    const receiverId = (message as any)?.receiverId;
    if (receiverId) {
      io.to(`user:${receiverId}`).emit("directMessageReceived", message);
      io.to(`user:${receiverId}`).emit("directMessageCreated", message);
    }
  });
  dmBus.onUpdated((conversationId, message) => {
    io.to(`dm:${conversationId}`).emit("directMessageUpdated", message);
  });
  dmBus.onDeleted((conversationId, message) => {
    io.to(`dm:${conversationId}`).emit("directMessageDeleted", message);
  });
  dmBus.onRead((conversationId, message) => {
    io.to(`dm:${conversationId}`).emit("messageRead", message as Record<string, unknown>);
    io.to(`dm:${conversationId}`).emit("dm:messageRead", message as Record<string, unknown>);
  });

  notificationBus.onCreated((userId, notification) => {
    io.to(`user:${userId}`).emit("notificationCreated", notification);
    io.to(`user:${userId}`).emit("unreadCountUpdate", { count: 1 });
  });
  notificationBus.onUpdated((userId, notification) => {
    io.to(`user:${userId}`).emit("notificationUpdated", notification);
  });
  notificationBus.onDeleted((userId, notification) => {
    io.to(`user:${userId}`).emit("notificationDeleted", notification);
  });

  socketServerInstance = io;
  return io;
};
