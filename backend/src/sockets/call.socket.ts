import type { Server, Socket } from "socket.io";
import { BlockRepository } from "../repositories/block.repository.js";
import { callSessionService } from "../services/call-session.service.js";
import { groupCallSessionService } from "../services/group-call-session.service.js";
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
  toSocketId: string;
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
    groupCallSessionService.onGroupCallEnded((callId, summary) => {
      io.emit("call:group:ended", {
        callId,
        channelId: summary.channelId,
        summary
      });
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

        if (cleanCallerId === cleanTargetId) {
          if (typeof acknowledge === "function") {
            acknowledge({ success: false, reason: "SELF_CALL", message: "Cannot call yourself" });
          }
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

        const callType: CallType = isVideo ? "video" : "voice";

        const result = callSessionService.createSession({
          callerId: cleanCallerId,
          callerSocketId: socket.id,
          callerName: currentUserName,
          callerAvatar: currentUserAvatar,
          calleeId: cleanTargetId,
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
  socket.on("call:accept", (payload: AcceptCallPayload, acknowledge?: (res: unknown) => void) => {
    const { callId } = payload;
    const session = callSessionService.acceptCall(callId, socket.id);

    if (!session) {
      if (typeof acknowledge === "function") {
        acknowledge({ success: false, message: "Call session no longer available or already answered" });
      }
      return;
    }

    callSessionService.setConnecting(callId);

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
    const { callId, reason = "declined" } = payload;
    const session = callSessionService.rejectCall(callId, reason);

    if (session) {
      const summary = getCallSummary(session);
      io.to(session.callerSocketId).emit("call:rejected", {
        callId,
        reason: session.endReason,
        summary
      });
    }

    if (typeof acknowledge === "function") {
      acknowledge({ success: true });
    }
  });

  // ── 4. Cancel Call ─────────────────────────────────────────────────────────
  socket.on("call:cancel", (payload: CancelCallPayload, acknowledge?: (res: unknown) => void) => {
    const { callId } = payload;
    const session = callSessionService.cancelCall(callId, fromStreamUserId(currentUserId));

    if (session) {
      const summary = getCallSummary(session);
      io.to(`user:${session.calleeId}`).emit("call:cancelled", {
        callId,
        reason: "cancelled_by_caller",
        summary
      });
    }

    if (typeof acknowledge === "function") {
      acknowledge({ success: true });
    }
  });

  // ── 5. End Call ────────────────────────────────────────────────────────────
  socket.on("call:end", (payload: EndCallPayload, acknowledge?: (res: unknown) => void) => {
    const { callId, toSocketId, reason = "ended" } = payload;
    const session = callSessionService.endCall(callId, reason);

    const summary = session ? getCallSummary(session) : undefined;
    const targetSocket =
      toSocketId ||
      (session
        ? session.callerSocketId === socket.id
          ? session.calleeSocketId
          : session.callerSocketId
        : undefined);

    if (targetSocket) {
      io.to(targetSocket).emit("call:ended", {
        callId,
        endedBy: currentUserId,
        reason,
        summary
      });
    }

    if (typeof acknowledge === "function") {
      acknowledge({ success: true, summary });
    }
  });

  // ── 6. Relay 1-to-1 WebRTC Signal ──────────────────────────────────────────
  socket.on("call:signal", (payload: SignalCallPayload) => {
    const { callId, toSocketId, signalData } = payload;
    if (!callId || !toSocketId || !signalData) return;

    const session = callSessionService.getSession(callId);
    if (!session) return;

    const cleanUserId = fromStreamUserId(currentUserId);
    if (session.callerId !== cleanUserId && session.calleeId !== cleanUserId) {
      return;
    }

    if (session.status !== "CONNECTED") {
      callSessionService.connectCall(callId);
    }

    io.to(toSocketId).emit("call:signal", {
      callId,
      fromSocketId: socket.id,
      signalData
    });
  });

  // ── 7. Reconnect Socket to Active 1-to-1 Call ──────────────────────────────
  socket.on(
    "call:reconnect",
    (payload: { callId: string }, acknowledge?: (res: unknown) => void) => {
      const { callId } = payload;
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
      const { callId, isSharing, toSocketId } = payload;
      const session = callSessionService.getSession(callId);
      if (!session) return;
      const cleanUserId = fromStreamUserId(currentUserId);
      if (session.callerId !== cleanUserId && session.calleeId !== cleanUserId) return;

      const targetSocket =
        toSocketId ||
        (session.callerSocketId === socket.id
          ? session.calleeSocketId
          : session.callerSocketId);

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

        // Broadcast to channel that a group call is active
        socket.broadcast.emit("call:group:started", {
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
    (payload: { callId: string }, acknowledge?: (res: any) => void) => {
      const cleanUserId = fromStreamUserId(currentUserId);
      const res = groupCallSessionService.leaveGroupSession(payload.callId, cleanUserId);
      acknowledge?.({ success: true, res });
    }
  );

  // ── 11. Relay Group WebRTC Signal (Offer / Answer / ICE) ───────────────────
  socket.on(
    "call:group:signal",
    (payload: { callId: string; toUserId: string; signalData: any }) => {
      const { callId, toUserId, signalData } = payload;
      if (!callId || !toUserId || !signalData) return;

      const session = groupCallSessionService.getSession(callId);
      if (!session) return;

      const cleanToUserId = fromStreamUserId(toUserId);
      const targetParticipant = session.participants.get(cleanToUserId);

      if (targetParticipant?.socketId) {
        io.to(targetParticipant.socketId).emit("call:group:signal", {
          callId,
          fromUserId: fromStreamUserId(currentUserId),
          signalData
        });
      }
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
    (payload: { channelId: string }, acknowledge?: (res: any) => void) => {
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
    (
      payload: { callId: string; targetUserId: string; approve: boolean },
      acknowledge?: (res: any) => void
    ) => {
      const { callId, targetUserId, approve } = payload;
      const cleanUserId = fromStreamUserId(currentUserId);
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
    (
      payload: { callId: string; targetUserId: string; role: ParticipantRole },
      acknowledge?: (res: any) => void
    ) => {
      const { callId, targetUserId, role } = payload;
      const cleanUserId = fromStreamUserId(currentUserId);
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
    (
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
    (
      payload: { callId: string; targetUserId: string },
      acknowledge?: (res: any) => void
    ) => {
      const { callId, targetUserId } = payload;
      const cleanUserId = fromStreamUserId(currentUserId);
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
      const call = payload.callId
        ? callSessionService.getSession(payload.callId)
        : callSessionService.getUserActiveCall(fromStreamUserId(currentUserId));

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
  socket.on("disconnect", () => {
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
      io.to(result.peerSocketId).emit("call:peer_reconnecting", {
        callId: result.session.callId,
        userId: currentUserId
      });
    }

    // Group call handling
    groupCallSessionService.handleSocketDisconnect(socket.id, cleanUserId);
  });
};
