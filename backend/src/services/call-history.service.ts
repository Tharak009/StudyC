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
  /**
   * Records or updates a 1-to-1 direct call history record
   */
  async recordDirectCall(
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
          name: "Callee",
          avatar: undefined,
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
          participants
        });
      } else {
        await callLogRepository.create({
          callId: session.callId,
          callerId: callerObjectId,
          callerName: session.callerName,
          callerAvatar: session.callerAvatar,
          calleeId: calleeObjectId,
          calleeName: "Callee",
          channelId: session.channelId || null,
          type: session.type,
          mode: "direct",
          status,
          startedAt,
          endedAt,
          durationSeconds,
          participants
        });
      }
    } catch (err) {
      console.error(`[CallHistoryService] Failed to record direct call ${session.callId}:`, err);
    }
  }

  /**
   * Records a group call or voice stage session when it completes
   */
  async recordGroupCall(session: GroupCallSession, summary: GroupCallSummary): Promise<void> {
    try {
      const callerObjectId = mongoose.Types.ObjectId.isValid(session.initiatedBy)
        ? new mongoose.Types.ObjectId(session.initiatedBy)
        : new mongoose.Types.ObjectId();

      const startedAt = new Date(summary.startedAt);
      const endedAt = new Date(summary.endedAt);

      const participantsList = Array.from(session.participants.values()).map((p) => ({
        userId: mongoose.Types.ObjectId.isValid(p.userId)
          ? new mongoose.Types.ObjectId(p.userId)
          : new mongoose.Types.ObjectId(),
        name: p.name,
        avatar: p.avatar,
        role: p.role,
        joinedAt: new Date(p.joinedAt),
        leftAt: endedAt
      }));

      const existing = await callLogRepository.findByCallId(session.callId);

      if (existing) {
        await callLogRepository.updateByCallId(session.callId, {
          status: "completed",
          endedAt,
          durationSeconds: summary.duration,
          participants: participantsList
        });
      } else {
        await callLogRepository.create({
          callId: session.callId,
          callerId: callerObjectId,
          callerName: session.participants.get(session.initiatedBy)?.name || "Host",
          callerAvatar: session.participants.get(session.initiatedBy)?.avatar,
          channelId: session.channelId,
          communityName: session.communityName || summary.communityName,
          type: session.type,
          mode: session.mode === "stage" ? "stage" : "group",
          status: "completed",
          startedAt,
          endedAt,
          durationSeconds: summary.duration,
          participants: participantsList
        });
      }
    } catch (err) {
      console.error(`[CallHistoryService] Failed to record group call ${session.callId}:`, err);
    }
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
