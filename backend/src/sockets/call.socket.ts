import type { Server, Socket } from "socket.io";
import mongoose from "mongoose";
import { BlockRepository } from "../repositories/block.repository.js";
import { friendshipRepository } from "../repositories/friendship.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { FRIENDSHIP_STATUS } from "../models/friendship.model.js";
import { callSessionService } from "../services/call-session.service.js";
import { callHistoryService } from "../services/call-history.service.js";
import { groupCallSessionService } from "../services/group-call-session.service.js";
import { liveKitService } from "../services/livekit.service.js";
import { iceConfigService } from "../services/ice-config.service.js";
import { type CallType, type RoomSessionMode, type ParticipantRole, type CallParticipant, getCallSummary } from "../types/call.types.js";
import { fromStreamUserId } from "../utils/stream-id.js";
import type { SocketRegistry } from "./presence.socket.js";

const blockRepository = new BlockRepository();

interface InitiateCallPayload {
  targetUserId: string;
  channelId?: string;
  isVideo?: boolean;
}

interface AcceptCallPayload {
  callId: string;
  callerSocketId?: string;
}

interface RejectCallPayload {
  callId: string;
  callerSocketId?: string;
  reason?: string;
}

interface CancelCallPayload {
  callId: string;
}

interface EndCallPayload {
  callId: string;
  toSocketId?: string;
  reason?: string;
}

interface SignalCallPayload {
  callId: string;
  toSocketId?: string;
  signalData: unknown;
}

let isGlobalListenersInitialized = false;

/**
 * WebRTC 1-to-1 & Group Call Signaling Gateway
 * Manages both direct calls and multi-participant group calls cleanly separated.
 */
export const registerCallHandlers = (
  io: Server,
  socket: Socket,
  registry: SocketRegistry
): void => {
  const currentUserId = String(socket.data.userId || "");
  const currentUserName = socket.data.user?.name || "Classmate";
  const currentUserAvatar =
    (socket.data.user as any)?.avatar || (socket.data.user as any)?.profilePicture;

  // Initialize global callbacks once
  if (!isGlobalListenersInitialized) {
    isGlobalListenersInitialized = true;

    // 1-to-1 Ring timeout without answer
    callSessionService.onRingTimeout((session, summary) => {
      io.to(session.callerSocketId).emit("call:missed", {
        callId: session.callId,
        reason: "MISSED",
        message: "No answer",
        summary
      });

      io.to(`user:${session.calleeId}`).emit("call:missed", {
        callId: session.callId,
        reason: "MISSED",
        callerName: session.callerName,
        summary
      });
    });

    // 1-to-1 Disconnect grace period expired
    callSessionService.onGracePeriodExpired((session, summary, peerSocketId) => {
      const target = peerSocketId || session.calleeSocketId || session.callerSocketId;
      if (target) {
        io.to(target).emit("call:ended", {
          callId: session.callId,
          reason: "reconnect_timeout",
          summary
        });
      }
    });

    // Group Call Participant Left broadcast
    groupCallSessionService.onParticipantLeft((callId, userId, reason, remaining) => {
      const activeSession = groupCallSessionService.getSession(callId);
      if (activeSession) {
        void callHistoryService.recordGroupProgress(activeSession, "connected");
        void liveKitService.removeParticipant(activeSession, userId).catch((error) => {
          console.warn("[CallSocket] Could not remove departed participant from LiveKit:", error);
        });
      }
      remaining.forEach((p) => {
        io.to(p.socketId).emit("call:group:participant_left", {
          callId,
          userId,
          reason,
          remainingParticipants: remaining
        });
      });
    });

    // Group Call Ended broadcast
    groupCallSessionService.onGroupCallEnded((callId, summary, session) => {
      io.to(`group-call-channel:${summary.channelId}`).emit("call:group:ended", {
        callId,
        channelId: summary.channelId,
        summary
      });
      void liveKitService.deleteRoom(session);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── PART A: 1-TO-1 DIRECT CALL SIGNALING (Preserved from Phases 1-3) ───────
  // ═══════════════════════════════════════════════════════════════════════════

  // ── 1. Initiate 1-on-1 Call ────────────────────────────────────────────────
  socket.on(
    "call:initiate",
    async (payload: InitiateCallPayload, acknowledge?: (res: unknown) => void) => {
      try {
        const { targetUserId, channelId, isVideo = false } = payload;
        if (!targetUserId) {
          throw new Error("targetUserId is required");
        }

        const cleanCallerId = fromStreamUserId(currentUserId);
        const cleanTargetId = fromStreamUserId(targetUserId);

        if (!mongoose.Types.ObjectId.isValid(cleanTargetId)) {
          acknowledge?.({ success: false, reason: "INVALID_TARGET", message: "Invalid call recipient" });
          return;
        }

        if (cleanCallerId === cleanTargetId) {
          if (typeof acknowledge === "function") {
            acknowledge({ success: false, reason: "SELF_CALL", message: "Cannot call yourself" });
          }
          return;
        }

        const friendship = await friendshipRepository.findBetweenUsers(cleanCallerId, cleanTargetId);
        if (friendship?.status !== FRIENDSHIP_STATUS.ACCEPTED) {
          acknowledge?.({ success: false, reason: "NOT_CONNECTED", message: "You can call connected friends only" });
          return;
        }

        const blocked = await blockRepository.isBlocked(cleanCallerId, cleanTargetId);
        if (blocked) {
          if (typeof acknowledge === "function") {
            acknowledge({ success: false, reason: "BLOCKED", message: "Call cannot be established" });
          }
          return;
        }

        const targetSockets = registry.onlineUsersMap.get(cleanTargetId);
        if (!targetSockets || targetSockets.size === 0) {
          if (typeof acknowledge === "function") {
            acknowledge({ success: false, reason: "OFFLINE", message: "User is currently offline" });
          }
          return;
        }

        if (groupCallSessionService.getUserActiveCall(cleanCallerId)) {
          acknowledge?.({ success: false, reason: "ALREADY_IN_CALL", message: "You are already in a call" });
          return;
        }
        if (groupCallSessionService.getUserActiveCall(cleanTargetId)) {
          acknowledge?.({ success: false, reason: "USER_BUSY", message: "User is currently busy in another call" });
          return;
        }

        const targetUser = await userRepository.findById(cleanTargetId);
        if (!targetUser) {
          acknowledge?.({ success: false, reason: "OFFLINE", message: "User is unavailable" });
          return;
        }

        const callType: CallType = isVideo ? "video" : "voice";

        const result = callSessionService.createSession({
          callerId: cleanCallerId,
          callerSocketId: socket.id,
          callerName: currentUserName,
          callerAvatar: currentUserAvatar,
          calleeId: cleanTargetId,
          calleeName: targetUser.fullName,
          calleeAvatar: targetUser.profilePicture,
          channelId,
          type: callType
        });

        if ("error" in result) {
          if (typeof acknowledge === "function") {
            acknowledge({ success: false, reason: result.code, message: result.error });
          }
          return;
        }

        const { session } = result;

        try {
          await callHistoryService.recordDirectProgress(session, "ringing");
        } catch (error) {
          callSessionService.failCall(session.callId, "call_history_unavailable");
          acknowledge?.({ success: false, reason: "CALL_SETUP_FAILED", message: "Could not prepare call history" });
          return;
        }

        io.to(`user:${cleanTargetId}`).emit("call:incoming", {
          callId: session.callId,
          callerId: cleanCallerId,
          callerName: currentUserName,
          callerAvatar: currentUserAvatar,
          channelId,
          isVideo: Boolean(isVideo),
          callerSocketId: socket.id
        });

        if (typeof acknowledge === "function") {
          acknowledge({ success: true, callId: session.callId, status: session.status });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to initiate call";
        if (typeof acknowledge === "function") {
          acknowledge({ success: false, message });
        }
      }
    }
  );

  // ── 2. Accept Call ─────────────────────────────────────────────────────────
  socket.on("call:accept", async (payload: AcceptCallPayload, acknowledge?: (res: unknown) => void) => {
    const callId = payload?.callId;
    if (typeof callId !== "string" || callId.length > 100) {
      acknowledge?.({ success: false, message: "Invalid call session" });
      return;
    }
    const cleanUserId = fromStreamUserId(currentUserId);
    const session = callSessionService.acceptCall(callId, socket.id, cleanUserId);

    if (!session) {
      if (typeof acknowledge === "function") {
        acknowledge({ success: false, message: "Call session no longer available or already answered" });
      }
      return;
    }

    callSessionService.setConnecting(callId);

    try {
      await callHistoryService.recordDirectProgress(session, "connecting");
    } catch {
      const failed = callSessionService.failCall(callId, "call_history_unavailable");
      if (failed) {
        const event = { callId, reason: "Call setup failed", failed: true };
        io.to(failed.callerSocketId).emit("call:ended", event);
        if (failed.calleeSocketId) io.to(failed.calleeSocketId).emit("call:ended", event);
      }
      acknowledge?.({ success: false, message: "Could not update call session" });
      return;
    }

    io.to(session.callerSocketId).emit("call:accepted", {
      callId,
      responderSocketId: socket.id,
      responderId: currentUserId
    });

    if (typeof acknowledge === "function") {
      acknowledge({ success: true, callId, callerSocketId: session.callerSocketId });
    }
  });

  // ── 3. Reject Call ─────────────────────────────────────────────────────────
  socket.on("call:reject", (payload: RejectCallPayload, acknowledge?: (res: unknown) => void) => {
    const callId = payload?.callId;
    const reason = payload?.reason || "declined";
    const cleanUserId = fromStreamUserId(currentUserId);
    if (typeof callId !== "string" || callId.length > 100 || typeof reason !== "string" || reason.length > 80) {
      acknowledge?.({ success: false, message: "Invalid call request" });
      return;
    }
    const session = callSessionService.rejectCall(callId, cleanUserId, reason);

    if (session) {
      const summary = getCallSummary(session);
      io.to(session.callerSocketId).emit("call:rejected", {
        callId,
        reason: session.endReason,
        summary
      });
    }

    acknowledge?.({ success: Boolean(session), alreadyEnded: !session });
  });

  // ── 4. Cancel Call ─────────────────────────────────────────────────────────
  socket.on("call:cancel", (payload: CancelCallPayload, acknowledge?: (res: unknown) => void) => {
    const callId = payload?.callId;
    if (typeof callId !== "string" || callId.length > 100) {
      acknowledge?.({ success: false, message: "Invalid call session" });
      return;
    }
    const session = callSessionService.cancelCall(callId, fromStreamUserId(currentUserId));

    if (session) {
      const summary = getCallSummary(session);
      io.to(`user:${session.calleeId}`).emit("call:cancelled", {
        callId,
        reason: "cancelled_by_caller",
        summary
      });
    }

    acknowledge?.({ success: Boolean(session), alreadyEnded: !session });
  });

  // ── 5. End Call ────────────────────────────────────────────────────────────
  socket.on("call:end", (payload: EndCallPayload, acknowledge?: (res: unknown) => void) => {
    const callId = payload?.callId;
    const reason = payload?.reason || "ended";
    const cleanUserId = fromStreamUserId(currentUserId);
    if (typeof callId !== "string" || callId.length > 100 || typeof reason !== "string" || reason.length > 120) {
      acknowledge?.({ success: false, message: "Invalid call request" });
      return;
    }
    const session = callSessionService.endCall(callId, reason, cleanUserId);

    const summary = session ? getCallSummary(session) : undefined;
    const targetSocket = session
      ? session.callerId === cleanUserId ? session.calleeSocketId : session.callerSocketId
      : undefined;

    if (targetSocket) {
      io.to(targetSocket).emit("call:ended", {
        callId,
        endedBy: currentUserId,
        reason,
        summary
      });
    }

    acknowledge?.({ success: Boolean(session), alreadyEnded: !session, summary });
  });

  socket.on("call:fail", (payload: { callId: string; reason?: string }, acknowledge?: (res: unknown) => void) => {
    const cleanUserId = fromStreamUserId(currentUserId);
    if (typeof payload?.callId !== "string" || payload.callId.length > 100) {
      acknowledge?.({ success: false, message: "Invalid call session" });
      return;
    }
    const reason = typeof payload.reason === "string" ? payload.reason.slice(0, 120) : "connection_failed";
    const session = callSessionService.failCall(payload.callId, reason, cleanUserId);
    if (session) {
      const summary = getCallSummary(session);
      const peerSocketId = session.callerId === cleanUserId ? session.calleeSocketId : session.callerSocketId;
      if (peerSocketId) io.to(peerSocketId).emit("call:ended", { callId: session.callId, reason, failed: true, summary });
    }
    acknowledge?.({ success: Boolean(session), alreadyEnded: !session });
  });

  // ── 6. Relay 1-to-1 WebRTC Signal ──────────────────────────────────────────
  socket.on("call:signal", (payload: SignalCallPayload) => {
    const { callId, signalData } = payload || {};
    if (typeof callId !== "string" || callId.length > 100 || !signalData || typeof signalData !== "object") return;

    const session = callSessionService.getSession(callId);
    if (!session) return;

    const cleanUserId = fromStreamUserId(currentUserId);
    if (!callSessionService.isCurrentParticipantSocket(callId, cleanUserId, socket.id)) return;
    if (!["ACCEPTED", "CONNECTING", "CONNECTED", "RECONNECTING"].includes(session.status)) return;

    const targetSocket = session.callerId === cleanUserId ? session.calleeSocketId : session.callerSocketId;
    if (!targetSocket) return;
    const signal = signalData as Record<string, unknown>;
    const candidate = signal.candidate as Record<string, unknown> | undefined;
    const validSignal =
      (signal.type === "offer" || signal.type === "answer") && typeof signal.sdp === "string" && signal.sdp.length <= 200_000 ||
      candidate !== undefined && candidate !== null && typeof candidate === "object" &&
      typeof candidate.candidate === "string" && candidate.candidate.length <= 8192 &&
      (candidate.sdpMid === undefined || candidate.sdpMid === null || typeof candidate.sdpMid === "string") &&
      (candidate.sdpMLineIndex === undefined || candidate.sdpMLineIndex === null || typeof candidate.sdpMLineIndex === "number");
    if (!validSignal) return;

    io.to(targetSocket).emit("call:signal", {
      callId,
      fromSocketId: socket.id,
      signalData
    });
  });

  socket.on("call:peer_connected", async (payload: { callId: string }, acknowledge?: (res: unknown) => void) => {
    const cleanUserId = fromStreamUserId(currentUserId);
    if (typeof payload?.callId !== "string" || payload.callId.length > 100) {
      acknowledge?.({ success: false, message: "Invalid call session" });
      return;
    }
    if (!callSessionService.isCurrentParticipantSocket(payload.callId, cleanUserId, socket.id)) {
      acknowledge?.({ success: false, message: "Call is no longer connecting" });
      return;
    }
    const result = callSessionService.reportPeerConnected(payload.callId, cleanUserId);
    if (!result) {
      acknowledge?.({ success: false, message: "Call is no longer connecting" });
      return;
    }
    if (result.connected) {
      try {
        await callHistoryService.recordDirectProgress(result.session, "connected");
      } catch {
        const failed = callSessionService.failCall(payload.callId, "call_history_unavailable");
        if (failed) {
          const event = { callId: failed.callId, reason: "Call setup failed", failed: true };
          io.to(failed.callerSocketId).emit("call:ended", event);
          if (failed.calleeSocketId) io.to(failed.calleeSocketId).emit("call:ended", event);
        }
        acknowledge?.({ success: false, message: "Could not update call session" });
        return;
      }
      const data = { callId: result.session.callId, connectedAt: result.session.connectedAt };
      io.to(result.session.callerSocketId).emit("call:connected", data);
      if (result.session.calleeSocketId) io.to(result.session.calleeSocketId).emit("call:connected", data);
    }
    acknowledge?.({ success: true, connected: result.connected });
  });

  socket.on("call:peer_reconnecting", async (payload: { callId: string }) => {
    const cleanUserId = fromStreamUserId(currentUserId);
    if (typeof payload?.callId !== "string" || payload.callId.length > 100) return;
    if (!callSessionService.isCurrentParticipantSocket(payload.callId, cleanUserId, socket.id)) return;
    const session = callSessionService.markReconnecting(payload.callId, cleanUserId);
    if (!session) return;
    await callHistoryService.recordDirectProgress(session, "reconnecting").catch(() => undefined);
    const peerSocketId = session.callerId === cleanUserId ? session.calleeSocketId : session.callerSocketId;
    if (peerSocketId) io.to(peerSocketId).emit("call:peer_reconnecting", { callId: session.callId });
  });

  // ── 7. Reconnect Socket to Active 1-to-1 Call ──────────────────────────────
  socket.on(
    "call:reconnect",
    (payload: { callId: string }, acknowledge?: (res: unknown) => void) => {
      const callId = payload?.callId;
      if (typeof callId !== "string" || callId.length > 100) {
        acknowledge?.({ success: false, message: "Invalid call session" });
        return;
      }
      const cleanUserId = fromStreamUserId(currentUserId);
      const res = callSessionService.reconnectUserSocket(callId, cleanUserId, socket.id);

      if (res) {
        if (res.peerSocketId) {
          io.to(res.peerSocketId).emit("call:peer_reconnected", {
            callId,
            newSocketId: socket.id
          });
        }
        if (typeof acknowledge === "function") {
          acknowledge({ success: true, callId, peerSocketId: res.peerSocketId });
        }
      } else {
        if (typeof acknowledge === "function") {
          acknowledge({ success: false, message: "Call session no longer available" });
        }
      }
    }
  );

  // ── 7b. Screen Sharing Relay (1-to-1) ──────────────────────────────────────
  socket.on(
    "call:screen_share",
    (payload: { callId: string; isSharing: boolean; toSocketId?: string }) => {
      const { callId, isSharing } = payload || {};
      if (typeof callId !== "string" || typeof isSharing !== "boolean") return;
      const session = callSessionService.getSession(callId);
      if (!session) return;
      const cleanUserId = fromStreamUserId(currentUserId);
      if (!callSessionService.isCurrentParticipantSocket(callId, cleanUserId, socket.id)) return;

      const targetSocket = session.callerId === cleanUserId ? session.calleeSocketId : session.callerSocketId;

      if (targetSocket) {
        io.to(targetSocket).emit("call:screen_share", {
          callId,
          userId: cleanUserId,
          isSharing
        });
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ── PART B: MULTI-PARTICIPANT GROUP CALL SIGNALING ─────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  // ── 8. Initiate Group Call ─────────────────────────────────────────────────
  socket.on(
    "call:group:initiate",
    async (
      payload: { channelId: string; communityName?: string; isVideo?: boolean; mode?: RoomSessionMode },
      acknowledge?: (res: any) => void
    ) => {
      try {
        const cleanCallerId = fromStreamUserId(currentUserId);
        const res = await groupCallSessionService.createGroupSession({
          callerId: cleanCallerId,
          callerSocketId: socket.id,
          callerName: currentUserName,
          callerAvatar: currentUserAvatar,
          channelId: payload.channelId,
          communityName: payload.communityName,
          type: payload.isVideo ? "video" : "voice",
          mode: payload.mode
        });

        if ("error" in res) {
          acknowledge?.({ success: false, reason: res.code, message: res.error });
          return;
        }

        const { session } = res;

        let media;
        try {
          await liveKitService.prepareRoom(session);
          const host = session.participants.get(cleanCallerId);
          if (!host) throw new Error("Call host participant could not be loaded");
          media = await liveKitService.issueParticipantToken(session, host);
          await callHistoryService.recordGroupProgress(session, "connecting");
        } catch (error) {
          groupCallSessionService.abortGroupSession(session.callId);
          throw error;
        }

        io.to(`group-call-channel:${session.channelId}`).emit("call:group:started", {
          callId: session.callId,
          channelId: session.channelId,
          communityName: session.communityName,
          type: session.type,
          mode: session.mode,
          hostName: currentUserName,
          hostAvatar: currentUserAvatar
        });

        acknowledge?.({
          success: true,
          callId: session.callId,
          media,
          session: {
            callId: session.callId,
            channelId: session.channelId,
            communityName: session.communityName,
            type: session.type,
            mode: session.mode,
            initiatedBy: session.initiatedBy,
            participants: Array.from(session.participants.values())
          }
        });
      } catch (err: any) {
        acknowledge?.({ success: false, message: err.message || "Failed to start group call" });
      }
    }
  );

  // ── 9. Join Group Call ─────────────────────────────────────────────────────
  socket.on(
    "call:group:join",
    async (payload: { callId: string }, acknowledge?: (res: any) => void) => {
      try {
        const cleanUserId = fromStreamUserId(currentUserId);
        const res = await groupCallSessionService.joinGroupSession({
          callId: payload.callId,
          userId: cleanUserId,
          socketId: socket.id,
          name: currentUserName,
          avatar: currentUserAvatar
        });

        if ("error" in res) {
          acknowledge?.({ success: false, reason: res.code, message: res.error });
          return;
        }

        let media;
        try {
          await liveKitService.prepareRoom(res.session);
          media = await liveKitService.issueParticipantToken(res.session, res.participant);
          await callHistoryService.recordGroupProgress(res.session, "connecting");
        } catch (error) {
          groupCallSessionService.leaveGroupSession(payload.callId, cleanUserId);
          throw error;
        }

        // Notify each existing participant that a newcomer joined
        res.existingParticipants.forEach((p) => {
          io.to(p.socketId).emit("call:group:participant_joined", {
            callId: payload.callId,
            participant: res.participant
          });
        });

        acknowledge?.({
          success: true,
          callId: payload.callId,
          media,
          participant: res.participant,
          existingParticipants: res.existingParticipants,
          session: {
            callId: res.session.callId,
            channelId: res.session.channelId,
            communityName: res.session.communityName,
            type: res.session.type,
            mode: res.session.mode,
            screenSharerId: res.session.screenSharerId,
            raiseHandQueue: res.session.raiseHandQueue,
            initiatedBy: res.session.initiatedBy
          }
        });
      } catch (err: any) {
        acknowledge?.({ success: false, message: err.message || "Failed to join group call" });
      }
    }
  );

  // ── 10. Leave Group Call ───────────────────────────────────────────────────
  socket.on(
    "call:group:leave",
    async (payload: { callId: string }, acknowledge?: (res: any) => void) => {
      const cleanUserId = fromStreamUserId(currentUserId);
      const res = groupCallSessionService.leaveGroupSession(payload.callId, cleanUserId);
      const activeSession = groupCallSessionService.getSession(payload.callId);
      if (activeSession) await callHistoryService.recordGroupProgress(activeSession, "connected");
      acknowledge?.({ success: true, res });
    }
  );

  // ── 12. Participant Media State Changed (Mic / Camera) ─────────────────────
  socket.on(
    "call:group:media_state",
    (payload: { callId: string; audioEnabled: boolean; videoEnabled: boolean }) => {
      const cleanUserId = fromStreamUserId(currentUserId);
      const updated = groupCallSessionService.updateParticipantMedia(
        payload.callId,
        cleanUserId,
        payload.audioEnabled,
        payload.videoEnabled
      );

      if (updated) {
        const session = groupCallSessionService.getSession(payload.callId);
        if (session) {
          session.participants.forEach((p) => {
            if (p.userId !== cleanUserId) {
              io.to(p.socketId).emit("call:group:participant_media", {
                callId: payload.callId,
                userId: cleanUserId,
                audioEnabled: payload.audioEnabled,
                videoEnabled: payload.videoEnabled
              });
            }
          });
        }
      }
    }
  );

  // ── 13. Query Active Group Call for Channel ────────────────────────────────
  socket.on(
    "call:group:getActiveCall",
    async (payload: { channelId: string }, acknowledge?: (res: any) => void) => {
      const cleanUserId = fromStreamUserId(currentUserId);
      if (!(await groupCallSessionService.canJoinChannel(payload?.channelId, cleanUserId))) {
        acknowledge?.({ success: false, message: "You are not a member of this channel" });
        return;
      }
      await socket.join(`group-call-channel:${payload.channelId}`);
      const session = groupCallSessionService.getActiveCallForChannel(payload.channelId);
      if (session) {
        acknowledge?.({
          success: true,
          call: {
            callId: session.callId,
            channelId: session.channelId,
            communityName: session.communityName,
            type: session.type,
            mode: session.mode,
            screenSharerId: session.screenSharerId,
            raiseHandQueue: session.raiseHandQueue,
            initiatedBy: session.initiatedBy,
            participantCount: session.participants.size,
            participants: Array.from(session.participants.values())
          }
        });
      } else {
        acknowledge?.({ success: true, call: null });
      }
    }
  );

  socket.on("call:group:unwatch", (payload: { channelId?: string }) => {
    if (payload?.channelId && /^[a-z0-9_-]{1,64}$/i.test(payload.channelId)) {
      void socket.leave(`group-call-channel:${payload.channelId}`);
    }
  });

  socket.on("call:group:media_joined", async (payload: { callId: string }, acknowledge?: (res: any) => void) => {
    const cleanUserId = fromStreamUserId(currentUserId);
    const participant = groupCallSessionService.markMediaConnected(payload?.callId, cleanUserId, socket.id);
    const session = groupCallSessionService.getSession(payload?.callId);
    if (!participant || !session) {
      acknowledge?.({ success: false, message: "Group call participant is not authorized" });
      return;
    }
    await callHistoryService.recordGroupProgress(session, "connected");
    session.participants.forEach((other) => {
      if (other.userId !== cleanUserId) {
        io.to(other.socketId).emit("call:group:participant_connected", {
          callId: session.callId,
          participant
        });
      }
    });
    acknowledge?.({ success: true });
  });

  // ── 13b. Reconnect to Active Group Call ───────────────────────────────────
  socket.on(
    "call:group:reconnect",
    (payload: { callId: string }, acknowledge?: (res: any) => void) => {
      const { callId } = payload;
      const cleanUserId = fromStreamUserId(currentUserId);
      const participant = groupCallSessionService.reconnectParticipant(callId, cleanUserId, socket.id);
      if (participant) {
        acknowledge?.({ success: true, callId, participant });
      } else {
        acknowledge?.({ success: false, message: "Group call session expired or not found" });
      }
    }
  );

  // ── 13c. Screen Sharing (Group) ───────────────────────────────────────────
  socket.on(
    "call:group:screen_share",
    (payload: { callId: string; isSharing: boolean }, acknowledge?: (res: any) => void) => {
      const { callId, isSharing } = payload;
      const cleanUserId = fromStreamUserId(currentUserId);
      const res = groupCallSessionService.setScreenSharing(callId, cleanUserId, isSharing);
      if ("error" in res) {
        acknowledge?.({ success: false, message: res.error });
        return;
      }
      const session = groupCallSessionService.getSession(callId);
      if (session) {
        session.participants.forEach((p: CallParticipant) => {
          if (p.socketId !== socket.id) {
            io.to(p.socketId).emit("call:group:screen_share", {
              callId,
              userId: cleanUserId,
              isSharing
            });
          }
        });
      }
      acknowledge?.({ success: true, isSharing });
    }
  );

  // ── 13d. Stage Hand-Raise: Request to Speak ────────────────────────────────
  socket.on(
    "call:stage:request_speak",
    (payload: { callId: string }, acknowledge?: (res: any) => void) => {
      const { callId } = payload;
      const cleanUserId = fromStreamUserId(currentUserId);
      const res = groupCallSessionService.requestToSpeak(
        callId,
        cleanUserId,
        currentUserName,
        currentUserAvatar
      );
      if ("error" in res) {
        acknowledge?.({ success: false, message: res.error });
        return;
      }
      const session = groupCallSessionService.getSession(callId);
      if (session) {
        session.participants.forEach((p: CallParticipant) => {
          io.to(p.socketId).emit("call:stage:requests_updated", {
            callId,
            requests: res.queue
          });
        });
      }
      acknowledge?.({ success: true, queue: res.queue });
    }
  );

  // ── 13e. Stage Hand-Raise: Cancel Request ──────────────────────────────────
  socket.on(
    "call:stage:cancel_request",
    (payload: { callId: string }, acknowledge?: (res: any) => void) => {
      const { callId } = payload;
      const cleanUserId = fromStreamUserId(currentUserId);
      const res = groupCallSessionService.cancelSpeakRequest(callId, cleanUserId);
      if ("error" in res) {
        acknowledge?.({ success: false, message: res.error });
        return;
      }
      const session = groupCallSessionService.getSession(callId);
      if (session) {
        session.participants.forEach((p: CallParticipant) => {
          io.to(p.socketId).emit("call:stage:requests_updated", {
            callId,
            requests: res.queue
          });
        });
      }
      acknowledge?.({ success: true, queue: res.queue });
    }
  );

  // ── 13f. Stage Moderation: Resolve Speaker Request ─────────────────────────
  socket.on(
    "call:stage:resolve_request",
    async (
      payload: { callId: string; targetUserId: string; approve: boolean },
      acknowledge?: (res: any) => void
    ) => {
      const { callId, targetUserId, approve } = payload;
      const cleanUserId = fromStreamUserId(currentUserId);
      const beforeSession = groupCallSessionService.getSession(callId);
      const priorRole = beforeSession?.participants.get(targetUserId)?.role;
      const res = groupCallSessionService.resolveSpeakRequest(
        callId,
        cleanUserId,
        targetUserId,
        approve ? "approve" : "reject"
      );
      if ("error" in res) {
        acknowledge?.({ success: false, message: res.error });
        return;
      }
      const session = groupCallSessionService.getSession(callId);
      if (approve && session && res.participant) {
        try {
          await liveKitService.setParticipantRole(session, targetUserId, res.participant.role);
        } catch (error: any) {
          if (priorRole) groupCallSessionService.setParticipantRole(callId, cleanUserId, targetUserId, priorRole);
          acknowledge?.({ success: false, message: error?.message || "Could not update participant media permissions" });
          return;
        }
      }
      if (session) {
        session.participants.forEach((p: CallParticipant) => {
          io.to(p.socketId).emit("call:stage:requests_updated", {
            callId,
            requests: res.queue
          });
          if (approve && res.participant) {
            io.to(p.socketId).emit("call:stage:role_changed", {
              callId,
              userId: targetUserId,
              role: res.participant.role
            });
          }
        });
      }
      acknowledge?.({ success: true, participant: res.participant, queue: res.queue });
    }
  );

  // ── 13g. Stage Moderation: Set Participant Role ────────────────────────────
  socket.on(
    "call:stage:set_role",
    async (
      payload: { callId: string; targetUserId: string; role: ParticipantRole },
      acknowledge?: (res: any) => void
    ) => {
      const { callId, targetUserId, role } = payload;
      if (!["moderator", "speaker", "listener", "participant"].includes(role)) {
        acknowledge?.({ success: false, message: "Invalid participant role" });
        return;
      }
      const cleanUserId = fromStreamUserId(currentUserId);
      const beforeSession = groupCallSessionService.getSession(callId);
      const priorRole = beforeSession?.participants.get(targetUserId)?.role;
      const res = groupCallSessionService.setParticipantRole(
        callId,
        cleanUserId,
        targetUserId,
        role
      );
      if ("error" in res) {
        acknowledge?.({ success: false, message: res.error });
        return;
      }
      const session = groupCallSessionService.getSession(callId);
      if (session && res.participant) {
        try {
          await liveKitService.setParticipantRole(session, targetUserId, res.participant.role);
        } catch (error: any) {
          if (priorRole) groupCallSessionService.setParticipantRole(callId, cleanUserId, targetUserId, priorRole);
          acknowledge?.({ success: false, message: error?.message || "Could not update participant media permissions" });
          return;
        }
      }
      if (session) {
        session.participants.forEach((p: CallParticipant) => {
          io.to(p.socketId).emit("call:stage:role_changed", {
            callId,
            userId: targetUserId,
            role
          });
        });
      }
      acknowledge?.({ success: true, participant: res.participant });
    }
  );

  // ── 13h. Group Moderation: Remote Force Mute ──────────────────────────────
  socket.on(
    "call:group:mute_participant",
    async (
      payload: { callId: string; targetUserId: string },
      acknowledge?: (res: any) => void
    ) => {
      const { callId, targetUserId } = payload;
      const cleanUserId = fromStreamUserId(currentUserId);
      const res = groupCallSessionService.muteParticipant(callId, cleanUserId, targetUserId);
      if ("error" in res) {
        acknowledge?.({ success: false, message: res.error });
        return;
      }
      const session = groupCallSessionService.getSession(callId);
      if (session) {
        try {
          await liveKitService.muteParticipant(session, targetUserId);
        } catch (error: any) {
          acknowledge?.({ success: false, message: error?.message || "Unable to mute participant on the media server" });
          return;
        }
        const target = session.participants.get(targetUserId);
        if (target) {
          // Tell target socket directly to mute local hardware
          io.to(target.socketId).emit("call:group:force_mute", { callId });
        }
        // Broadcast media state update to everyone
        session.participants.forEach((p: CallParticipant) => {
          io.to(p.socketId).emit("call:group:participant_media", {
            callId,
            userId: targetUserId,
            audioEnabled: false,
            videoEnabled: res.participant?.videoEnabled ?? false
          });
        });
      }
      acknowledge?.({ success: true, participant: res.participant });
    }
  );

  // ── 13i. Group Moderation: Remove (Kick & Ban) Participant ────────────────
  socket.on(
    "call:group:remove_participant",
    async (
      payload: { callId: string; targetUserId: string },
      acknowledge?: (res: any) => void
    ) => {
      const { callId, targetUserId } = payload;
      const cleanUserId = fromStreamUserId(currentUserId);
      const activeSession = groupCallSessionService.getSession(callId);
      const operator = activeSession?.participants.get(cleanUserId);
      const target = activeSession?.participants.get(targetUserId);
      if (!activeSession || !operator || (operator.role !== "host" && operator.role !== "moderator") || !target || target.role === "host") {
        acknowledge?.({ success: false, message: "You are not authorized to remove this participant" });
        return;
      }
      try {
        await liveKitService.removeParticipant(activeSession, targetUserId);
      } catch (error: any) {
        acknowledge?.({ success: false, message: error?.message || "Unable to remove participant from the media server" });
        return;
      }
      const res = groupCallSessionService.removeParticipant(callId, cleanUserId, targetUserId);
      if ("error" in res) {
        acknowledge?.({ success: false, message: res.error });
        return;
      }
      if (res.removedSocketId) {
        io.to(res.removedSocketId).emit("call:group:removed", {
          callId,
          reason: "removed_by_host"
        });
      }
      const session = groupCallSessionService.getSession(callId);
      if (session) {
        session.participants.forEach((p: CallParticipant) => {
          io.to(p.socketId).emit("call:group:participant_left", {
            callId,
            userId: targetUserId,
            reason: "removed",
            remainingParticipants: res.remaining
          });
        });
      }
      acknowledge?.({ success: true });
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ── PART C: SHARED INFRASTRUCTURE (ICE, Global State, Disconnect) ──────────
  // ═══════════════════════════════════════════════════════════════════════════

  // ── 14. Get ICE Servers (STUN/TURN) ────────────────────────────────────────
  socket.on(
    "call:getIceServers",
    (_payload: unknown, acknowledge?: (res: unknown) => void) => {
      const iceServers = iceConfigService.getIceServers();
      if (typeof acknowledge === "function") {
        acknowledge({ success: true, iceServers });
      } else {
        socket.emit("call:iceServers", { iceServers });
      }
    }
  );

  // ── 15. Query 1-to-1 Call State ───────────────────────────────────────────
  socket.on(
    "call:getState",
    (payload: { callId?: string }, acknowledge?: (res: unknown) => void) => {
      const cleanUserId = fromStreamUserId(currentUserId);
      const activeCall = payload?.callId
        ? callSessionService.getSession(payload.callId)
        : callSessionService.getUserActiveCall(cleanUserId);
      const call = activeCall && (activeCall.callerId === cleanUserId || activeCall.calleeId === cleanUserId)
        ? activeCall
        : undefined;

      if (typeof acknowledge === "function") {
        acknowledge({
          success: true,
          call: call
            ? {
                callId: call.callId,
                status: call.status,
                type: call.type,
                callerId: call.callerId,
                calleeId: call.calleeId,
                startedAt: call.startedAt
              }
            : null
        });
      }
    }
  );

  // ── 16. Socket Disconnect Auto-Handling (1-to-1 & Group) ───────────────────
  socket.on("disconnect", async () => {
    const cleanUserId = fromStreamUserId(currentUserId);

    // 1-to-1 handling
    const result = callSessionService.handleSocketDisconnect(socket.id, cleanUserId);
    if (result && !result.graceStarted && result.peerSocketId) {
      const summary = getCallSummary(result.session);
      io.to(result.peerSocketId).emit("call:ended", {
        callId: result.session.callId,
        endedBy: currentUserId,
        reason: "disconnected",
        summary
      });
    } else if (result && result.graceStarted && result.peerSocketId) {
      await callHistoryService.recordDirectProgress(result.session, "reconnecting").catch(() => undefined);
      io.to(result.peerSocketId).emit("call:peer_reconnecting", {
        callId: result.session.callId,
        userId: currentUserId
      });
    }

    // Group call handling
    groupCallSessionService.handleSocketDisconnect(socket.id, cleanUserId);
  });
};
