import type { Server, Socket } from "socket.io";
import mongoose from "mongoose";
import { User } from "../models/user.model.js";

export interface VoicePeer {
  socketId: string;
  userId: string;
  name: string;
  isSpeaking: boolean;
  isMuted: boolean;
  isScreenSharing?: boolean;
}

export interface SocketRegistry {
  onlineUsersMap: Map<string, Set<string>>;
  activeVoiceRooms: Map<string, Set<VoicePeer>>;
}

/**
 * Peer Presence & Connection Lifecycle Controller
 * Manages multi-tab online user registries, friends status broadcasts, and auto-cleanup.
 */
export const registerPresenceHandlers = (
  io: Server,
  socket: Socket,
  registry: SocketRegistry
): void => {
  const userId = socket.data.userId as string;
  if (!userId) return;

  // ── 1. Connect Event / Multi-Tab Online Registry ───────────────────────────
  const userSockets = registry.onlineUsersMap.get(userId) ?? new Set<string>();
  const isFirstTab = userSockets.size === 0;

  userSockets.add(socket.id);
  registry.onlineUsersMap.set(userId, userSockets);

  if (isFirstTab) {
    // Notify peer contacts and study circles that user came online
    socket.broadcast.emit("friendOnline", { userId });

    // Update lastLogin asynchronously in background
    if (mongoose.isValidObjectId(userId)) {
      User.findByIdAndUpdate(userId, { lastLogin: new Date() }).catch((err) => {
        console.error("Failed to update user lastLogin on socket connect:", err);
      });
    }
  }

  // ── 2. Request Online Users Roster ─────────────────────────────────────────
  socket.on(
    "presence:getOnlineUsers",
    (acknowledge?: (response: { onlineUserIds: string[] }) => void) => {
      const onlineUserIds = Array.from(registry.onlineUsersMap.keys());
      if (typeof acknowledge === "function") {
        acknowledge({ onlineUserIds });
      }
    }
  );

  // ── 3. Heartbeat Keep-Alive ───────────────────────────────────────────────
  socket.on(
    "presence:heartbeat",
    (acknowledge?: (response: { success: boolean; timestamp: number }) => void) => {
      if (typeof acknowledge === "function") {
        acknowledge({ success: true, timestamp: Date.now() });
      }
    }
  );

  // ── 4. Disconnect & Cleanup ────────────────────────────────────────────────
  socket.on("disconnect", () => {
    const activeSockets = registry.onlineUsersMap.get(userId);
    if (activeSockets) {
      activeSockets.delete(socket.id);
      if (activeSockets.size === 0) {
        registry.onlineUsersMap.delete(userId);
        const lastSeen = new Date().toISOString();
        socket.broadcast.emit("friendOffline", { userId, lastSeen });
      }
    }

    // Clean up any active voice stages the socket participated in
    for (const [stageId, peers] of registry.activeVoiceRooms.entries()) {
      let removedPeer: VoicePeer | null = null;
      for (const peer of peers) {
        if (peer.socketId === socket.id) {
          removedPeer = peer;
          peers.delete(peer);
          break;
        }
      }

      if (removedPeer) {
        if (peers.size === 0) {
          registry.activeVoiceRooms.delete(stageId);
        }
        socket.to(`voice:${stageId}`).emit("voice:peerLeft", {
          stageId,
          socketId: socket.id,
          userId: socket.data.userId
        });
      }
    }
  });
};
