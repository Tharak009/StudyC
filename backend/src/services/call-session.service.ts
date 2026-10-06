import {
  type CallSession,
  type CallStatus,
  type CallType,
  type CallSummary,
  getCallSummary,
  isValidCallTransition
} from "../types/call.types.js";
import {
  RING_TIMEOUT_MS,
  DISCONNECT_GRACE_PERIOD_MS
} from "../constants/call.constants.js";
import { callHistoryService } from "./call-history.service.js";
import { notificationRepository } from "../repositories/notification.repository.js";

export interface InitiateSessionParams {
  callerId: string;
  callerSocketId: string;
  callerName: string;
  callerAvatar?: string;
  calleeId: string;
  calleeSocketId?: string;
  channelId?: string;
  type: CallType;
}

export type RingTimeoutCallback = (session: CallSession, summary: CallSummary) => void;
export type GracePeriodExpiredCallback = (session: CallSession, summary: CallSummary, peerSocketId?: string) => void;

/**
 * Centralized in-memory session and signaling state coordinator for 1-to-1 WebRTC calls.
 * Ensures single-call concurrency per user, enforces timeouts, handles disconnect grace periods,
 * and maintains a formal deterministic call state machine.
 */
export class CallSessionService {
  private callSessions = new Map<string, CallSession>();
  private userActiveCallMap = new Map<string, string>(); // userId -> callId
  private ringTimeoutCallbacks: RingTimeoutCallback[] = [];
  private graceExpiredCallbacks: GracePeriodExpiredCallback[] = [];
  private sweepTimer?: NodeJS.Timeout;

  constructor() {
    this.startStaleSessionSweeper();
  }

  private startStaleSessionSweeper(): void {
    this.sweepTimer = setInterval(() => {
      this.sweepStaleSessions();
    }, 60000);
    if (this.sweepTimer && typeof this.sweepTimer.unref === "function") {
      this.sweepTimer.unref();
    }
  }

  private sweepStaleSessions(): void {
    const now = Date.now();
    for (const [callId, session] of this.callSessions.entries()) {
      if ((session.status === "CALLING" || session.status === "RINGING") && now - session.startedAt > 45000) {
        console.log(`[CallSessionService] Sweeping timed-out ring session ${callId}`);
        this.handleRingTimeout(callId);
      } else if (session.status === "CONNECTED" && session.connectedAt && now - session.connectedAt > 6 * 3600 * 1000) {
        console.log(`[CallSessionService] Sweeping session exceeding max 6h duration ${callId}`);
        this.endCall(callId, "max_duration_exceeded");
      } else if (
        (session.status === "CONNECTING" || session.status === "RECONNECTING" || session.status === "ACCEPTED") &&
        now - session.startedAt > 10 * 60 * 1000
      ) {
        console.log(`[CallSessionService] Sweeping abandoned hung session ${callId}`);
        this.failCall(callId, "session_timeout");
      }
    }
  }

  /**
   * Register a listener for calls that time out without an answer
   */
  public onRingTimeout(callback: RingTimeoutCallback): void {
    this.ringTimeoutCallbacks.push(callback);
  }

  /**
   * Register a listener for calls whose disconnect grace period has expired
   */
  public onGracePeriodExpired(callback: GracePeriodExpiredCallback): void {
    this.graceExpiredCallbacks.push(callback);
  }

  /**
   * Retrieves active session by callId
   */
  public getSession(callId: string): CallSession | undefined {
    return this.callSessions.get(callId);
  }

  /**
   * Retrieves active call session for a given user if currently in a call
   */
  public getUserActiveCall(userId: string): CallSession | undefined {
    const callId = this.userActiveCallMap.get(userId);
    if (!callId) return undefined;
    return this.callSessions.get(callId);
  }

  /**
   * Central state transition validator
   */
  private transition(session: CallSession, nextStatus: CallStatus): boolean {
    if (!isValidCallTransition(session.status, nextStatus)) {
      console.warn(
        `[CallSessionService] Invalid state transition rejected: ${session.status} -> ${nextStatus} (callId: ${session.callId})`
      );
      return false;
    }
    session.status = nextStatus;
    return true;
  }

  /**
   * Initiates a new call session after concurrency validation
   */
  public createSession(params: InitiateSessionParams): { session: CallSession } | { error: string; code: string } {
    const { callerId, callerSocketId, callerName, callerAvatar, calleeId, calleeSocketId, channelId, type } = params;

    if (callerId === calleeId) {
      return { error: "Cannot initiate call with yourself", code: "INVALID_TARGET" };
    }

    // Check if caller is already on a call
    const callerCallId = this.userActiveCallMap.get(callerId);
    if (callerCallId && this.callSessions.has(callerCallId)) {
      return { error: "You are already in an active call", code: "ALREADY_IN_CALL" };
    }

    // Check if callee is already on a call
    const calleeCallId = this.userActiveCallMap.get(calleeId);
    if (calleeCallId && this.callSessions.has(calleeCallId)) {
      return { error: "User is currently busy in another call", code: "USER_BUSY" };
    }

    const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // Set ring timeout
    const ringTimer = setTimeout(() => {
      this.handleRingTimeout(callId);
    }, RING_TIMEOUT_MS);

    const session: CallSession = {
      callId,
      type,
      callerId,
      callerSocketId,
      callerName,
      callerAvatar,
      calleeId,
      calleeSocketId,
      channelId,
      status: "CALLING",
      startedAt: Date.now(),
      ringTimer
    };

    this.callSessions.set(callId, session);
    this.userActiveCallMap.set(callerId, callId);
    this.userActiveCallMap.set(calleeId, callId);

    return { session };
  }

  /**
   * Callee accepts the call
   */
  public acceptCall(callId: string, calleeSocketId: string): CallSession | null {
    const session = this.callSessions.get(callId);
    if (!session) return null;

    if (!this.transition(session, "ACCEPTED")) {
      return null;
    }

    if (session.ringTimer) {
      clearTimeout(session.ringTimer);
      session.ringTimer = undefined;
    }

    session.calleeSocketId = calleeSocketId;
    return session;
  }

  /**
   * Transitions call to CONNECTING (SDP negotiation in progress)
   */
  public setConnecting(callId: string): CallSession | null {
    const session = this.callSessions.get(callId);
    if (!session) return null;
    if (!this.transition(session, "CONNECTING")) {
      return null;
    }
    return session;
  }

  /**
   * WebRTC peer connection established
   */
  public connectCall(callId: string): CallSession | null {
    const session = this.callSessions.get(callId);
    if (!session) return null;

    if (!this.transition(session, "CONNECTED")) {
      return null;
    }

    if (!session.connectedAt) {
      session.connectedAt = Date.now();
    }
    this.clearGraceTimer(session);
    return session;
  }

  /**
   * WebRTC peer connection entered reconnecting state
   */
  public reconnectCall(callId: string): CallSession | null {
    const session = this.callSessions.get(callId);
    if (!session) return null;

    if (!this.transition(session, "RECONNECTING")) {
      return null;
    }
    return session;
  }

  /**
   * Reconnect a user's socket to an active session
   */
  public reconnectUserSocket(callId: string, userId: string, newSocketId: string): {
    session: CallSession;
    peerSocketId?: string;
  } | null {
    const session = this.callSessions.get(callId);
    if (!session) return null;

    const isCaller = session.callerId === userId;
    const isCallee = session.calleeId === userId;

    if (!isCaller && !isCallee) return null;

    this.clearGraceTimer(session);

    if (isCaller) {
      session.callerSocketId = newSocketId;
    } else {
      session.calleeSocketId = newSocketId;
    }

    const peerSocketId = isCaller ? session.calleeSocketId : session.callerSocketId;
    return { session, peerSocketId };
  }

  /**
   * Callee rejects incoming call
   */
  public rejectCall(callId: string, reason = "declined"): CallSession | null {
    const session = this.callSessions.get(callId);
    if (!session) return null;

    this.cleanupTimers(session);
    this.transition(session, "REJECTED");
    session.endedAt = Date.now();
    session.endReason = reason;

    this.clearUserMappings(session);
    this.callSessions.delete(callId);
    callHistoryService.recordDirectCall(session, "declined");
    return session;
  }

  /**
   * Caller cancels outgoing call before it is answered
   */
  public cancelCall(callId: string, callerId: string): CallSession | null {
    const session = this.callSessions.get(callId);
    if (!session) return null;

    if (session.callerId !== callerId) {
      return null;
    }

    this.cleanupTimers(session);
    this.transition(session, "CANCELLED");
    session.endedAt = Date.now();
    session.endReason = "cancelled_by_caller";

    this.clearUserMappings(session);
    this.callSessions.delete(callId);
    callHistoryService.recordDirectCall(session, "cancelled");
    return session;
  }

  /**
   * Normal call end / hangup by either party
   */
  public endCall(callId: string, reason = "ended"): CallSession | null {
    const session = this.callSessions.get(callId);
    if (!session) return null;

    this.cleanupTimers(session);
    this.transition(session, "ENDED");
    session.endedAt = Date.now();
    session.endReason = reason;

    this.clearUserMappings(session);
    this.callSessions.delete(callId);
    callHistoryService.recordDirectCall(session, "completed");
    return session;
  }

  /**
   * Call failure handler
   */
  public failCall(callId: string, reason = "connection_failed"): CallSession | null {
    const session = this.callSessions.get(callId);
    if (!session) return null;

    this.cleanupTimers(session);
    this.transition(session, "FAILED");
    session.endedAt = Date.now();
    session.endReason = reason;

    this.clearUserMappings(session);
    this.callSessions.delete(callId);
    callHistoryService.recordDirectCall(session, "failed");
    return session;
  }

  /**
   * Handles socket disconnect: cleans up or enters grace period
   */
  public handleSocketDisconnect(socketId: string, userId: string): {
    session: CallSession;
    peerSocketId?: string;
    isCaller: boolean;
    graceStarted: boolean;
  } | null {
    const callId = this.userActiveCallMap.get(userId);
    if (!callId) return null;

    const session = this.callSessions.get(callId);
    if (!session) {
      this.userActiveCallMap.delete(userId);
      return null;
    }

    const isCaller = session.callerSocketId === socketId || session.callerId === userId;
    const isCallee = session.calleeSocketId === socketId || session.calleeId === userId;

    if (!isCaller && !isCallee) {
      return null;
    }

    const peerSocketId = isCaller ? session.calleeSocketId : session.callerSocketId;

    // If call is actively connected or reconnecting, provide a 15-second grace period
    // so momentary WebSocket reconnection does not immediately terminate active WebRTC media
    if (session.status === "CONNECTED" || session.status === "RECONNECTING") {
      this.transition(session, "RECONNECTING");
      this.clearGraceTimer(session);

      session.reconnectGraceTimer = setTimeout(() => {
        this.expireGracePeriod(session.callId);
      }, DISCONNECT_GRACE_PERIOD_MS);

      return { session, peerSocketId, isCaller, graceStarted: true };
    }

    // Otherwise (CALLING / RINGING / CONNECTING), clean up immediately
    this.cleanupTimers(session);
    this.transition(session, "CANCELLED");
    session.endedAt = Date.now();
    session.endReason = "peer_disconnected";

    this.clearUserMappings(session);
    this.callSessions.delete(callId);

    return { session, peerSocketId, isCaller, graceStarted: false };
  }

  /**
   * 30s ring timeout fired without answer
   */
  private handleRingTimeout(callId: string): void {
    const session = this.callSessions.get(callId);
    if (!session) return;

    if (session.status !== "CALLING" && session.status !== "RINGING") {
      return;
    }

    this.cleanupTimers(session);
    this.transition(session, "MISSED");
    session.endedAt = Date.now();
    session.endReason = "ring_timeout";

    this.clearUserMappings(session);
    this.callSessions.delete(callId);

    callHistoryService.recordDirectCall(session, "missed");

    if (session.calleeId) {
      notificationRepository
        .create({
          userId: session.calleeId,
          type: "CALL_MISSED",
          title: "Missed Call",
          message: `Missed ${session.type} call from ${session.callerName}`,
          entityType: "USER",
          entityId: session.callerId
        })
        .catch((err) => console.error("[CallSessionService] Failed to create missed call notification:", err));
    }

    const summary = getCallSummary(session);
    for (const callback of this.ringTimeoutCallbacks) {
      try {
        callback(session, summary);
      } catch (err) {
        console.error("[CallSessionService] Error in ring timeout callback:", err);
      }
    }
  }

  /**
   * Disconnect grace period expired without socket re-association
   */
  private expireGracePeriod(callId: string): void {
    const session = this.callSessions.get(callId);
    if (!session) return;

    this.cleanupTimers(session);
    this.transition(session, "ENDED");
    session.endedAt = Date.now();
    session.endReason = "reconnect_timeout";

    const peerSocketId = session.calleeSocketId;
    this.clearUserMappings(session);
    this.callSessions.delete(callId);

    callHistoryService.recordDirectCall(session, "completed");

    const summary = getCallSummary(session);
    for (const callback of this.graceExpiredCallbacks) {
      try {
        callback(session, summary, peerSocketId);
      } catch (err) {
        console.error("[CallSessionService] Error in grace period callback:", err);
      }
    }
  }

  private cleanupTimers(session: CallSession): void {
    if (session.ringTimer) {
      clearTimeout(session.ringTimer);
      session.ringTimer = undefined;
    }
    this.clearGraceTimer(session);
  }

  private clearGraceTimer(session: CallSession): void {
    if (session.reconnectGraceTimer) {
      clearTimeout(session.reconnectGraceTimer);
      session.reconnectGraceTimer = undefined;
    }
  }

  private clearUserMappings(session: CallSession): void {
    if (this.userActiveCallMap.get(session.callerId) === session.callId) {
      this.userActiveCallMap.delete(session.callerId);
    }
    if (this.userActiveCallMap.get(session.calleeId) === session.callId) {
      this.userActiveCallMap.delete(session.calleeId);
    }
  }
}

export const callSessionService = new CallSessionService();
