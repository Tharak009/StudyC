import type { Server, Socket } from "socket.io";
import type { SocketRegistry, VoicePeer } from "./presence.socket.js";

interface JoinStagePayload {
  communityId?: string;
  stageId: string;
}

interface SignalPayload {
  toSocketId: string;
  stageId: string;
  signalData: unknown;
}

interface SpeakingStatePayload {
  stageId: string;
  isSpeaking: boolean;
}

interface MuteStatePayload {
  stageId: string;
  isMuted: boolean;
}

const voiceRoomFor = (stageId: string) => `voice:${stageId}`;

/**
 * Drop-in Voice Stage Signaling Controller
 * WebRTC mesh signaling (offer/answer/ICE), real-time audio presence, and speaking detection.
 */
export const registerVoiceHandlers = (
  io: Server,
  socket: Socket,
  registry: SocketRegistry
): void => {
  const userId = socket.data.userId as string;
  const userName = socket.data.user?.name || "Student";

  // ── 1. Join Voice Stage ───────────────────────────────────────────────────
  socket.on(
    "voice:joinStage",
    async (payload: JoinStagePayload, acknowledge?: (res: unknown) => void) => {
      try {
        const { stageId } = payload;
        if (!stageId) throw new Error("stageId is required");

        const roomName = voiceRoomFor(stageId);
        await socket.join(roomName);

        const roomPeers = registry.activeVoiceRooms.get(stageId) ?? new Set<VoicePeer>();

        // Remove any previous registration for the same socket or user in this stage
        for (const peer of roomPeers) {
          if (peer.socketId === socket.id || peer.userId === userId) {
            roomPeers.delete(peer);
          }
        }

        const newPeer: VoicePeer = {
          socketId: socket.id,
          userId,
          name: userName,
          isSpeaking: false,
          isMuted: false
        };

        roomPeers.add(newPeer);
        registry.activeVoiceRooms.set(stageId, roomPeers);

        // Notify existing stage peers of new attendee
        socket.to(roomName).emit("voice:peerJoined", {
          stageId,
          peer: newPeer
        });

        // Acknowledge sender with roster of active stage participants
        if (typeof acknowledge === "function") {
          acknowledge({
            success: true,
            stageId,
            participants: Array.from(roomPeers)
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to join voice stage";
        if (typeof acknowledge === "function") {
          acknowledge({ success: false, message });
        }
      }
    }
  );

  // ── 2. WebRTC Signaling Dispatcher (Offer, Answer, ICE Candidates) ────────
  socket.on("voice:signal", (payload: SignalPayload) => {
    const { toSocketId, stageId, signalData } = payload;
    if (!toSocketId || !signalData) return;

    // Relay peer-to-peer WebRTC signal packet
    io.to(toSocketId).emit("voice:signal", {
      fromSocketId: socket.id,
      fromUserId: userId,
      fromName: userName,
      stageId,
      signalData
    });
  });

  // ── 3. Speaking Energy Indicator (Waveform & Avatar Aura) ──────────────────
  socket.on("voice:speakingState", (payload: SpeakingStatePayload) => {
    const { stageId, isSpeaking } = payload;
    if (!stageId) return;

    const peers = registry.activeVoiceRooms.get(stageId);
    if (peers) {
      for (const peer of peers) {
        if (peer.socketId === socket.id) {
          peer.isSpeaking = Boolean(isSpeaking);
          break;
        }
      }
    }

    socket.to(voiceRoomFor(stageId)).emit("voice:peerSpeaking", {
      stageId,
      socketId: socket.id,
      userId,
      isSpeaking: Boolean(isSpeaking)
    });
  });

  // ── 4. Microphone Mute State Synchronization ──────────────────────────────
  socket.on("voice:muteState", (payload: MuteStatePayload) => {
    const { stageId, isMuted } = payload;
    if (!stageId) return;

    const peers = registry.activeVoiceRooms.get(stageId);
    if (peers) {
      for (const peer of peers) {
        if (peer.socketId === socket.id) {
          peer.isMuted = Boolean(isMuted);
          break;
        }
      }
    }

    socket.to(voiceRoomFor(stageId)).emit("voice:peerMuted", {
      stageId,
      socketId: socket.id,
      userId,
      isMuted: Boolean(isMuted)
    });
  });

  // ── 5. Leave Voice Stage ──────────────────────────────────────────────────
  socket.on(
    "voice:leaveStage",
    async (payload: { stageId: string }, acknowledge?: (res: unknown) => void) => {
      const { stageId } = payload;
      if (!stageId) return;

      const roomName = voiceRoomFor(stageId);
      await socket.leave(roomName);

      const peers = registry.activeVoiceRooms.get(stageId);
      if (peers) {
        for (const peer of peers) {
          if (peer.socketId === socket.id) {
            peers.delete(peer);
            break;
          }
        }
        if (peers.size === 0) {
          registry.activeVoiceRooms.delete(stageId);
        }
      }

      socket.to(roomName).emit("voice:peerLeft", {
        stageId,
        socketId: socket.id,
        userId
      });

      if (typeof acknowledge === "function") {
        acknowledge({ success: true, stageId });
      }
    }
  );
};
