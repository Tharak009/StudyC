import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { env } from "../config/env.js";
import { USER_STATUS } from "../constants/user-status.js";
import { userRepository } from "../repositories/user.repository.js";
import { ApiError } from "../utils/api-error.js";
import { verifyAccessToken } from "../utils/tokens.js";

interface PresenceSocketData {
  userId: string;
  role: string;
}

interface ServerToClientEvents {
  userOnline: (payload: { userId: string }) => void;
  userOffline: (payload: { userId: string; lastSeen: string }) => void;
  friendOnline: (payload: { userId: string }) => void;
  friendOffline: (payload: { userId: string; lastSeen: string }) => void;
}

interface ClientToServerEvents {
  presencePing: () => void;
}

type PresenceSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, PresenceSocketData>;
type PresenceServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, PresenceSocketData>;

const onlineUsers = new Map<string, { userId: string; sockets: Set<string>; lastSeen: Date }>();

export class PresenceService {
  private io: PresenceServer | null = null;

  initialize(httpServer: HttpServer): PresenceServer {
    const io: PresenceServer = new Server<
      ClientToServerEvents,
      ServerToClientEvents,
      Record<string, never>,
      PresenceSocketData
    >(httpServer, {
      cors: {
        origin: env.CLIENT_URL.split(",").map((url) => url.trim()),
        credentials: true
      },
      path: "/ws/presence"
    });

    io.use(async (socket, next) => {
      try {
        const token = this.tokenFrom(socket);
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

    io.on("connection", (socket) => this.registerHandlers(io, socket as PresenceSocket));

    this.io = io;
    return io;
  }

  private registerHandlers(io: PresenceServer, socket: PresenceSocket) {
    const userId = socket.data.userId;

    socket.join(`user:${userId}`);
    this.setOnline(userId, socket.id);

    socket.broadcast.emit("friendOnline", { userId });

    socket.on("presencePing", () => {
      this.setOnline(userId, socket.id);
    });

    socket.on("disconnect", () => {
      this.removeSocket(userId, socket.id);
      if (!this.isOnline(userId)) {
        const lastSeen = new Date().toISOString();
        socket.broadcast.emit("friendOffline", { userId, lastSeen });
      }
    });
  }

  private setOnline(userId: string, socketId: string) {
    const existing = onlineUsers.get(userId);
    if (existing) {
      existing.sockets.add(socketId);
      existing.lastSeen = new Date();
    } else {
      const sockets = new Set<string>([socketId]);
      onlineUsers.set(userId, { userId, sockets, lastSeen: new Date() });
    }
  }

  private removeSocket(userId: string, socketId: string) {
    const entry = onlineUsers.get(userId);
    if (!entry) return;
    entry.sockets.delete(socketId);
    if (entry.sockets.size === 0) {
      entry.lastSeen = new Date();
    }
  }

  isOnline(userId: string): boolean {
    const entry = onlineUsers.get(userId);
    if (!entry) return false;
    if (entry.sockets.size === 0) {
      onlineUsers.delete(userId);
      return false;
    }
    return true;
  }

  getOnlineUserIds(): string[] {
    return [...onlineUsers.keys()].filter((id) => this.isOnline(id));
  }

  getLastSeen(userId: string): Date | null {
    return onlineUsers.get(userId)?.lastSeen ?? null;
  }

  private tokenFrom(socket: Socket) {
    const authToken = socket.handshake.auth?.token;
    if (typeof authToken === "string") return authToken;
    const header = socket.handshake.headers.authorization;
    if (header?.startsWith("Bearer ")) return header.slice(7);
    return undefined;
  }
}

export const presenceService = new PresenceService();
