import mongoose from "mongoose";
import { callLogRepository, type CallLogListOptions } from "../repositories/call-log.repository.js";
import { type ICallLog, type CallLogStatus, type CallLogType } from "../models/call-log.model.js";
import { type CallSession } from "../types/call.types.js";
import { type GroupCallSession, type GroupCallSummary } from "../types/call.types.js";

export interface FormattedCallHistoryItem {
  _id: string;
  callId: string;
  direction: "outgoing" | "incoming";
  type: CallLogType;
  mode: "direct" | "group" | "stage";
  status: CallLogStatus;
  startedAt: string;
  endedAt?: string | null;
  durationSeconds: number;
  channelId?: string | null;
  communityId?: string | null;
  communityName?: string | null;
  peer: {
    userId: string;
    name: string;
    avatar?: string;
  };
  totalParticipants?: number;
}

export class CallHistoryService {
  private directWriteQueues = new Map<string, Promise<void>>();
  private groupWriteQueues = new Map<string, Promise<void>>();

  private enqueueGroupWrite<T>(callId: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.groupWriteQueues.get(callId) || Promise.resolve();
    const current = previous.catch(() => undefined).then(operation);
    const queued = current.then(() => undefined, () => undefined);
    this.groupWriteQueues.set(callId, queued);
    void queued.finally(() => {
      if (this.groupWriteQueues.get(callId) === queued) this.groupWriteQueues.delete(callId);
    });
    return current;
  }

  private enqueueDirectWrite<T>(callId: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.directWriteQueues.get(callId) || Promise.resolve();
    const current = previous.catch(() => undefined).then(operation);
    const queued = current.then(() => undefined, () => undefined);
    this.directWriteQueues.set(callId, queued);
    void queued.finally(() => {
      if (this.directWriteQueues.get(callId) === queued) this.directWriteQueues.delete(callId);
    });
    return current;
  }

  /** Persist an active one-to-one call before the callee is notified. */
  async recordDirectProgress(
    session: CallSession,
    status: Extract<CallLogStatus, "ringing" | "connecting" | "connected" | "reconnecting">
  ): Promise<void> {
    return this.enqueueDirectWrite(session.callId, async () => {
      const callerObjectId = new mongoose.Types.ObjectId(session.callerId);
      const calleeObjectId = new mongoose.Types.ObjectId(session.calleeId);
      const startedAt = new Date(session.startedAt);
      const connectedAt = session.connectedAt ? new Date(session.connectedAt) : null;
      const participants = [
        {
          userId: callerObjectId,
          name: session.callerName,
          avatar: session.callerAvatar,
          role: "caller",
          joinedAt: startedAt
        },
        {
          userId: calleeObjectId,
          name: session.calleeName || "Classmate",
          avatar: session.calleeAvatar,
          role: "callee",
          joinedAt: connectedAt || startedAt
        }
      ];

      if (status === "ringing") {
        await callLogRepository.create({
          callId: session.callId,
          callerId: callerObjectId,
          callerName: session.callerName,
          callerAvatar: session.callerAvatar,
          calleeId: calleeObjectId,
          calleeName: session.calleeName || "Classmate",
          calleeAvatar: session.calleeAvatar || null,
          channelId: session.channelId || null,
          type: session.type,
          mode: "direct",
          status,
          startedAt,
          connectedAt,
          endedAt: null,
          durationSeconds: 0,
          participants
        });
        return;
      }

      const updated = await callLogRepository.updateActiveDirectCall(session.callId, {
        status,
        connectedAt,
        participants
      });
      if (!updated) throw new Error(`Active call history record missing for ${session.callId}`);
    });
  }

  /**
   * Records or updates a 1-to-1 direct call history record
   */
  async recordDirectCall(
    session: CallSession,
    status: CallLogStatus,
    overrideDuration?: number
  ): Promise<void> {
    return this.enqueueDirectWrite(session.callId, () => this.persistDirectCall(session, status, overrideDuration));
  }

  private async persistDirectCall(
    session: CallSession,
    status: CallLogStatus,
    overrideDuration?: number
  ): Promise<void> {
    try {
      const callerObjectId = mongoose.Types.ObjectId.isValid(session.callerId)
        ? new mongoose.Types.ObjectId(session.callerId)
        : new mongoose.Types.ObjectId();

      const calleeObjectId = mongoose.Types.ObjectId.isValid(session.calleeId)
        ? new mongoose.Types.ObjectId(session.calleeId)
        : null;

      const startedAt = new Date(session.startedAt || Date.now());
      const endedAt = session.endedAt ? new Date(session.endedAt) : new Date();

      let durationSeconds = 0;
      if (overrideDuration !== undefined) {
        durationSeconds = overrideDuration;
      } else if (session.connectedAt && session.endedAt) {
        durationSeconds = Math.max(0, Math.round((session.endedAt - session.connectedAt) / 1000));
      }

      const existing = await callLogRepository.findByCallId(session.callId);

      const participants = [
        {
          userId: callerObjectId,
          name: session.callerName,
          avatar: session.callerAvatar,
          role: "caller",
          joinedAt: startedAt,
          leftAt: endedAt
        }
      ];

      if (calleeObjectId) {
        participants.push({
          userId: calleeObjectId,
          name: session.calleeName || "Classmate",
          avatar: session.calleeAvatar,
          role: "callee",
          joinedAt: session.connectedAt ? new Date(session.connectedAt) : startedAt,
          leftAt: endedAt
        });
      }

      if (existing) {
        await callLogRepository.updateByCallId(session.callId, {
          status,
          endedAt,
          durationSeconds,
          connectedAt: session.connectedAt ? new Date(session.connectedAt) : null,
          endReason: session.endReason || null,
          calleeName: session.calleeName || "Classmate",
          calleeAvatar: session.calleeAvatar || null,
          participants
        });
      } else {
        await callLogRepository.create({
          callId: session.callId,
          callerId: callerObjectId,
          callerName: session.callerName,
          callerAvatar: session.callerAvatar,
          calleeId: calleeObjectId,
          calleeName: session.calleeName || "Classmate",
          calleeAvatar: session.calleeAvatar || null,
          channelId: session.channelId || null,
          type: session.type,
          mode: "direct",
          status,
          startedAt,
          connectedAt: session.connectedAt ? new Date(session.connectedAt) : null,
          endedAt,
          durationSeconds,
          endReason: session.endReason || null,
          participants
        });
      }
    } catch (err) {
      console.error(`[CallHistoryService] Failed to record direct call ${session.callId}:`, err);
    }
  }

  /** Close active direct-call history left behind when this single-process server restarts. */
  async markInterruptedDirectCalls(): Promise<void> {
    const activeCalls = await callLogRepository.listActiveDirectCalls();
    const now = new Date();
    await Promise.all(activeCalls.map(async (call) => {
      const connectedAt = call.connectedAt ? new Date(call.connectedAt) : null;
      const durationSeconds = connectedAt
        ? Math.max(0, Math.floor((now.getTime() - connectedAt.getTime()) / 1000))
        : 0;
      await callLogRepository.updateActiveDirectCall(call.callId, {
        status: "failed",
        endedAt: now,
        durationSeconds,
        endReason: "server_restarted"
      });
    }));
  }

  /** Close group-call history records whose in-memory session was lost on restart. */
  async markInterruptedGroupCalls(): Promise<void> {
    const activeCalls = await callLogRepository.listActiveGroupCalls();
    const now = new Date();
    await Promise.all(activeCalls.map(async (call) => {
      const connectedAt = call.connectedAt ? new Date(call.connectedAt) : null;
      const durationSeconds = connectedAt
        ? Math.max(0, Math.floor((now.getTime() - connectedAt.getTime()) / 1000))
        : 0;
      await callLogRepository.updateActiveGroupCall(call.callId, {
        status: "failed",
        endedAt: now,
        durationSeconds,
        endReason: "server_restarted",
        participants: call.participants.map((participant) => ({
          userId: participant.userId,
          name: participant.name,
          avatar: participant.avatar,
          role: participant.role,
          joinedAt: participant.joinedAt,
          leftAt: now
        }))
      });
    }));
  }

  /**
   * Records a group call or voice stage session when it completes
   */
  async recordGroupProgress(
    session: GroupCallSession,
    status: "connecting" | "connected" | "reconnecting"
  ): Promise<void> {
    return this.enqueueGroupWrite(session.callId, async () => {
      try {
        if (!mongoose.Types.ObjectId.isValid(session.initiatedBy)) return;
        const participants = Array.from(session.participantHistory.values()).map((participant) => {
          if (!mongoose.Types.ObjectId.isValid(participant.userId)) return null;
          return {
            userId: new mongoose.Types.ObjectId(participant.userId),
            name: participant.name,
            avatar: participant.avatar,
            role: participant.role,
            joinedAt: new Date(participant.joinedAt),
            ...(participant.leftAt ? { leftAt: new Date(participant.leftAt) } : {})
          };
        }).filter((participant): participant is NonNullable<typeof participant> => participant !== null);

        const existing = await callLogRepository.findByCallId(session.callId);
        const initiator = session.participantHistory.get(session.initiatedBy);
        const data = {
          callerId: new mongoose.Types.ObjectId(session.initiatedBy),
          callerName: initiator?.name || "Host",
          callerAvatar: initiator?.avatar,
          channelId: session.channelId,
          communityId: session.communityId || null,
          communityName: session.communityName || null,
          type: session.type,
          mode: session.mode === "stage" ? "stage" as const : "group" as const,
          status,
          startedAt: new Date(session.startedAt),
          connectedAt: existing?.connectedAt || (status === "connected" ? new Date() : null),
          participants
        };
        if (existing) {
          await callLogRepository.updateActiveGroupCall(session.callId, data);
        } else {
          await callLogRepository.create({ callId: session.callId, ...data });
        }
      } catch (err) {
        console.error(`[CallHistoryService] Failed to persist group call ${session.callId}:`, err);
      }
    });
  }

  async recordGroupCall(session: GroupCallSession, summary: GroupCallSummary): Promise<void> {
    return this.enqueueGroupWrite(session.callId, async () => {
      try {
        const callerObjectId = mongoose.Types.ObjectId.isValid(session.initiatedBy)
          ? new mongoose.Types.ObjectId(session.initiatedBy)
          : new mongoose.Types.ObjectId();

        const startedAt = new Date(summary.startedAt);
        const endedAt = new Date(summary.endedAt);

        const participantsList = Array.from(session.participantHistory.values()).map((p) => ({
          userId: mongoose.Types.ObjectId.isValid(p.userId)
            ? new mongoose.Types.ObjectId(p.userId)
            : new mongoose.Types.ObjectId(),
          name: p.name,
          avatar: p.avatar,
          role: p.role,
          joinedAt: new Date(p.joinedAt),
          leftAt: p.leftAt ? new Date(p.leftAt) : endedAt
        }));

        const existing = await callLogRepository.findByCallId(session.callId);
        const initiator = session.participantHistory.get(session.initiatedBy);

        if (existing) {
          await callLogRepository.updateByCallId(session.callId, {
            status: "completed",
            endedAt,
            durationSeconds: summary.duration,
            endReason: summary.endReason || null,
            participants: participantsList
          });
        } else {
          await callLogRepository.create({
          callId: session.callId,
          callerId: callerObjectId,
          callerName: initiator?.name || "Host",
          callerAvatar: initiator?.avatar,
          channelId: session.channelId,
          communityName: session.communityName || summary.communityName,
          type: session.type,
          mode: session.mode === "stage" ? "stage" : "group",
          status: "completed",
          startedAt,
          endedAt,
          durationSeconds: summary.duration,
          endReason: summary.endReason || null,
          participants: participantsList
          });
        }
      } catch (err) {
        console.error(`[CallHistoryService] Failed to record group call ${session.callId}:`, err);
      }
    });
  }

  /**
   * Retrieves paginated call history for a user with direction and peer metadata
   */
  async getUserCallHistory(
    userId: string,
    options: CallLogListOptions = {}
  ): Promise<{
    items: FormattedCallHistoryItem[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const rawResult = await callLogRepository.listUserHistory(userId, options);

    const formattedItems: FormattedCallHistoryItem[] = rawResult.items.map((log: any) => {
      const isCaller = String(log.callerId) === userId;
      const direction: "outgoing" | "incoming" = isCaller ? "outgoing" : "incoming";

      let peerName = "Unknown";
      let peerAvatar: string | undefined = undefined;
      let peerUserId = "";

      if (log.mode === "direct") {
        if (isCaller) {
          peerUserId = String(log.calleeId || "");
          peerName = log.calleeName || "Classmate";
          peerAvatar = log.calleeAvatar || undefined;
        } else {
          peerUserId = String(log.callerId || "");
          peerName = log.callerName || "Classmate";
          peerAvatar = log.callerAvatar || undefined;
        }
      } else {
        // Group or stage
        peerUserId = String(log.callerId || "");
        peerName = log.communityName || (log.mode === "stage" ? "Voice Stage" : "Study Room Call");
        peerAvatar = undefined;
      }

      return {
        _id: String(log._id),
        callId: log.callId,
        direction,
        type: log.type,
        mode: log.mode,
        status: log.status,
        startedAt: new Date(log.startedAt).toISOString(),
        endedAt: log.endedAt ? new Date(log.endedAt).toISOString() : null,
        durationSeconds: log.durationSeconds || 0,
        channelId: log.channelId || null,
        communityId: log.communityId || null,
        communityName: log.communityName || null,
        peer: {
          userId: peerUserId,
          name: peerName,
          avatar: peerAvatar
        },
        totalParticipants: log.participants?.length || 1
      };
    });

    return {
      items: formattedItems,
      total: rawResult.total,
      page: rawResult.page,
      limit: rawResult.limit,
      pages: rawResult.pages
    };
  }

  /**
   * Retrieves single call log detail
   */
  async getCallDetails(callId: string, userId: string): Promise<ICallLog | null> {
    const log = await callLogRepository.findByCallId(callId);
    if (!log) return null;

    const isAuthorized =
      String(log.callerId) === userId ||
      String(log.calleeId) === userId ||
      log.participants.some((p) => String(p.userId) === userId);

    if (!isAuthorized) {
      return null;
    }

    return log;
  }
}

export const callHistoryService = new CallHistoryService();
