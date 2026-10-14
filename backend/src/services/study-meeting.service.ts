import mongoose, { Types } from "mongoose";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { StudyMeeting, type StudyMeetingAccess, type StudyMeetingDocument, type IStudyMeetingParticipant, type StudyMeetingStatus } from "../models/study-meeting.model.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";
import { liveKitService } from "./livekit.service.js";
import { streamService } from "./stream.service.js";

type Identity = { userId: string; name: string; avatar?: string };
type AttendanceEndReason = "LEFT" | "REMOVED" | "TIMEOUT" | "MEETING_ENDED" | "LEGACY_UNKNOWN" | "JOIN_FAILED";

const HEARTBEAT_STALE_MS = 60_000;
const RECONNECT_GRACE_MS = 90_000;
const RECONCILIATION_INTERVAL_MS = 30_000;
const MAX_MEETINGS_PER_SWEEP = 40;
const MAX_CLEANUPS_PER_SWEEP = 20;
const MAX_AUTOMATIC_CLEANUP_ATTEMPTS = 5;
const CLEANUP_CLAIM_STALE_MS = 120_000;

const joinedCountExpression = {
  $size: { $filter: { input: "$participants", as: "participant", cond: { $eq: ["$$participant.state", "JOINED"] } } }
};
const terminalStatuses: StudyMeetingStatus[] = ["ENDED", "CANCELLED"];
const activeStatusQuery = { $nin: terminalStatuses };
const isTerminal = (status: StudyMeetingStatus) => terminalStatuses.includes(status);
function publicMeeting(meeting: any) {
  const data = meeting.toObject ? meeting.toObject() : { ...meeting };
  delete data.inviteCode;
  delete data.creationRequestId;
  delete data.liveKitRoomName;
  delete data.deniedUsers;
  delete data.admissionRequests;
  delete data.providerCleanupErrorCode;
  for (const participant of data.participants || []) {
    delete participant.attendancePeriods;
    delete participant.activeAttendanceId;
    delete participant.lastActivityAt;
    delete participant.connectionLostAt;
  }
  return data;
}

function providerErrorCode(error: unknown): string {
  const status = (error as any)?.status ?? (error as any)?.code;
  return typeof status === "string" || typeof status === "number" ? String(status).slice(0, 40) : "PROVIDER_ERROR";
}

export class StudyMeetingService {
  private reconciliationTimer?: NodeJS.Timeout;
  private reconciliationRunning = false;
  private reconciliationCursor?: Types.ObjectId;

  constructor() {
    // A single bounded process-level sweep follows the existing call services' pattern.
    // Mongo conditional updates make lifecycle transitions safe across API instances.
    this.reconciliationTimer = setInterval(() => { void this.reconcileSessions(); }, RECONCILIATION_INTERVAL_MS);
    this.reconciliationTimer.unref?.();
  }

  async initialize(): Promise<void> {
    // Legacy records did not distinguish creation time from first activation.
    // Preserve the records but mark that unknown timestamp honestly. Old ended
    // meetings are queued for idempotent provider cleanup because failures were
    // previously swallowed by the LiveKit adapter.
    await StudyMeeting.updateMany({ providerCleanupStatus: { $exists: false }, status: { $in: ["WAITING", "ACTIVE"] } }, {
      $set: { startedAt: null, providerCleanupStatus: "NOT_REQUIRED", providerCleanupAttempts: 0, providerCleanupLastAttemptAt: null }
    });
    await StudyMeeting.updateMany({ providerCleanupStatus: { $exists: false }, status: "ENDED" }, {
      $set: { providerCleanupStatus: "PENDING", providerCleanupAttempts: 0, providerCleanupLastAttemptAt: null }
    });
    // Queue legacy terminal meetings too; they may still have Stream members.
    await StudyMeeting.updateMany({ streamCleanupStatus: { $exists: false }, status: { $in: terminalStatuses } }, {
      $set: { streamCleanupStatus: "PENDING", streamCleanupAttempts: 0, streamCleanupLastAttemptAt: null }
    });
  }

  stopReconciliation(): void {
    if (this.reconciliationTimer) clearInterval(this.reconciliationTimer);
    this.reconciliationTimer = undefined;
  }

  async list(userId: string, options: { status?: StudyMeetingStatus; scope?: "all" | "organized" | "attending"; search?: string; page?: number; limit?: number } = {}) {
    const user = new Types.ObjectId(userId);
    const page = options.page || 1;
    const limit = options.limit || 20;
    const scopeFilter = options.scope === "organized" ? { createdBy: user }
      : options.scope === "attending" ? { "participants.userId": user }
      : { $or: [{ access: "PUBLIC" }, { createdBy: user }, { "participants.userId": user }] };
    const filter: any = { deniedUsers: { $ne: user }, ...scopeFilter };
    if (options.status) filter.status = options.status;
    if (options.search?.trim()) filter.$text = { $search: options.search.trim() };
    const [items, total] = await Promise.all([
      StudyMeeting.find(filter).populate("createdBy", "fullName").sort({ scheduledStartAt: 1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean().exec(),
      StudyMeeting.countDocuments(filter).exec()
    ]);
    return { items: items.map((item: any) => ({ ...publicMeeting(item), createdBy: String(item.createdBy?._id || item.createdBy), organizerName: item.createdBy?.fullName || "StudyConnect member" })), page, limit, total, pages: Math.ceil(total / limit) };
  }

  async history(userId: string, options: { page?: number; limit?: number; search?: string } = {}) {
    const user = new Types.ObjectId(userId);
    const page = options.page || 1;
    const limit = options.limit || 20;
    const filter: any = { status: { $in: ["ENDED", "CANCELLED"] }, $or: [{ createdBy: user }, { "participants.userId": user }] };
    if (options.search?.trim()) filter.$text = { $search: options.search.trim() };
    const [meetings, total] = await Promise.all([
      StudyMeeting.find(filter).populate("createdBy", "fullName").sort({ endedAt: -1, cancelledAt: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean().exec(),
      StudyMeeting.countDocuments(filter).exec()
    ]);
    const items = meetings.map((meeting: any) => {
      const participant = meeting.participants?.find((item: any) => String(item.userId) === userId);
      let periods = (participant?.attendancePeriods || []).map((period: any) => ({
        joinedAt: period.joinedAt || null,
        leftAt: period.leftAt || null,
        endReason: period.endReason || null
      }));
      if (!periods.length && participant?.joinedAt) periods = [{ joinedAt: participant.joinedAt, leftAt: participant.leftAt || null, endReason: participant.leftAt ? "LEGACY_UNKNOWN" : null }];
      const durationSeconds = periods.reduce((sum: number, period: any) => sum + (period.joinedAt && period.leftAt ? Math.max(0, Math.floor((new Date(period.leftAt).getTime() - new Date(period.joinedAt).getTime()) / 1000)) : 0), 0);
      return { meeting: { ...publicMeeting(meeting), createdBy: String(meeting.createdBy?._id || meeting.createdBy), organizerName: meeting.createdBy?.fullName || "StudyConnect member" }, isOrganizer: String(meeting.createdBy?._id || meeting.createdBy) === userId, attended: Boolean(participant), attendancePeriods: periods, durationSeconds };
    });
    return { items, page, limit, total, pages: Math.ceil(total / limit) };
  }

  async get(id: string, userId: string, inviteCode?: string) {
    const meeting = await this.findById(id, true);
    this.assertCanView(meeting, userId, inviteCode);
    this.assertNotDenied(meeting, userId);
    const result = publicMeeting(meeting);
    if (String(meeting.createdBy) === userId && meeting.inviteCode) result.inviteCode = meeting.inviteCode;
    return result;
  }

  async create(identity: Identity, input: {
    title: string; subject?: string; description?: string; access: StudyMeetingAccess; mediaType: "voice" | "video"; capacity: number; scheduledStartAt?: string | null; expectedDurationMinutes?: number | null; waitingRoomEnabled?: boolean; requestId?: string;
  }) {
    if (!liveKitService.isConfigured()) {
      throw new ApiError(503, "Study meetings are unavailable because group media is not configured", [], "LIVEKIT_NOT_CONFIGURED");
    }
    if (!streamService.isConfigured()) {
      throw new ApiError(503, "Study meeting chat is unavailable because Stream Chat is not configured", [], "STREAM_NOT_CONFIGURED");
    }
    if (input.requestId) {
      const existing = await StudyMeeting.findOne({ createdBy: new Types.ObjectId(identity.userId), creationRequestId: input.requestId }).select("+inviteCode").exec();
      if (existing) {
        await streamService.createStudyMeetingChannel({ channelId: existing.streamChannelId, meetingId: String(existing._id), name: existing.title, hostUserId: identity.userId });
        return { meeting: publicMeeting(existing), inviteCode: existing.inviteCode };
      }
    }
    const meetingId = new Types.ObjectId();
    const suffix = randomUUID().replace(/-/g, "");
    const liveKitRoomName = `study_${suffix}`;
    const streamChannelId = `study_${suffix}`;
    const access = input.access;
    const schedule = input.scheduledStartAt ? new Date(input.scheduledStartAt) : null;
    if (schedule && (!Number.isFinite(schedule.getTime()) || schedule.getTime() <= Date.now())) throw new ApiError(400, "Scheduled start time must be in the future", [], "INVALID_SCHEDULED_START");
    const inviteCode = access === "PUBLIC" ? undefined : randomBytes(18).toString("base64url");
    let meeting: StudyMeetingDocument;
    try {
      meeting = await StudyMeeting.create({
      _id: meetingId,
      title: input.title.trim(),
      subject: input.subject?.trim() || "",
      description: input.description?.trim() || "",
      createdBy: new Types.ObjectId(identity.userId),
      access,
      ...(inviteCode ? { inviteCode } : {}),
      status: "WAITING",
      mediaType: input.mediaType,
      capacity: Math.min(input.capacity, env.GROUP_CALL_MAX_PARTICIPANTS),
      liveKitRoomName,
      streamChannelId,
      participants: [],
      startedAt: null,
      scheduledStartAt: schedule,
      expectedDurationMinutes: input.expectedDurationMinutes ?? null,
      waitingRoomEnabled: input.waitingRoomEnabled ?? false,
      ...(input.requestId ? { creationRequestId: input.requestId } : {}),
      providerCleanupStatus: "NOT_REQUIRED"
      });
    } catch (error: any) {
      if (input.requestId && error?.code === 11000) {
        const existing = await StudyMeeting.findOne({ createdBy: new Types.ObjectId(identity.userId), creationRequestId: input.requestId }).select("+inviteCode").exec();
        if (existing) {
          await streamService.createStudyMeetingChannel({ channelId: existing.streamChannelId, meetingId: String(existing._id), name: existing.title, hostUserId: identity.userId });
          return { meeting: publicMeeting(existing), inviteCode: existing.inviteCode };
        }
      }
      throw error;
    }

    try {
      await streamService.createStudyMeetingChannel({
        channelId: streamChannelId,
        meetingId: meetingId.toString(),
        name: input.title.trim(),
        hostUserId: identity.userId
      });
      return { meeting: publicMeeting(meeting), inviteCode };
    } catch (error) {
      await StudyMeeting.deleteOne({ _id: meetingId });
      await liveKitService.endMeetingRoom(liveKitRoomName).catch(() => undefined);
      throw error;
    }
  }

  async update(id: string, userId: string, input: {
    title?: string; subject?: string; description?: string; access?: StudyMeetingAccess; capacity?: number;
    scheduledStartAt?: string; expectedDurationMinutes?: number | null; waitingRoomEnabled?: boolean; expectedUpdatedAt: string;
  }) {
    const meeting = await this.findById(id, true);
    if (String(meeting.createdBy) !== userId) throw new ApiError(403, "Only the organizer can edit this meeting", [], "FORBIDDEN");
    if (meeting.status !== "WAITING" || !meeting.scheduledStartAt || meeting.startedAt) throw new ApiError(409, "Only a scheduled meeting that has never started can be edited", [], "MEETING_NOT_EDITABLE");
    const scheduledStartAt = input.scheduledStartAt ? new Date(input.scheduledStartAt) : undefined;
    if (scheduledStartAt && (!Number.isFinite(scheduledStartAt.getTime()) || scheduledStartAt.getTime() <= Date.now())) throw new ApiError(400, "Scheduled start time must be in the future", [], "INVALID_SCHEDULED_START");
    const capacity = input.capacity ?? meeting.capacity;
    if (capacity > env.GROUP_CALL_MAX_PARTICIPANTS) throw new ApiError(400, `Capacity cannot exceed ${env.GROUP_CALL_MAX_PARTICIPANTS}`, [], "INVALID_CAPACITY");
    const set: Record<string, unknown> = {};
    if (input.title !== undefined) set.title = input.title.trim();
    if (input.subject !== undefined) set.subject = input.subject.trim();
    if (input.description !== undefined) set.description = input.description.trim();
    if (input.capacity !== undefined) set.capacity = capacity;
    if (scheduledStartAt) set.scheduledStartAt = scheduledStartAt;
    if (input.expectedDurationMinutes !== undefined) set.expectedDurationMinutes = input.expectedDurationMinutes;
    if (input.waitingRoomEnabled !== undefined) set.waitingRoomEnabled = input.waitingRoomEnabled;
    if (input.access !== undefined) set.access = input.access;
    const access = input.access ?? meeting.access;
    const update: any = { $set: set };
    if (access === "PUBLIC") update.$unset = { inviteCode: 1 };
    else if (input.access && input.access !== meeting.access) set.inviteCode = randomBytes(18).toString("base64url");
    const filter: any = {
      _id: meeting._id,
      createdBy: new Types.ObjectId(userId),
      status: "WAITING",
      startedAt: null,
      scheduledStartAt: { $ne: null },
      $expr: { $lte: [joinedCountExpression, capacity] }
    };
    filter.updatedAt = new Date(input.expectedUpdatedAt);
    const updated = await StudyMeeting.findOneAndUpdate(filter, update, { new: true, runValidators: true }).select("+inviteCode").exec();
    if (!updated) {
      const latest = await this.findById(id, true);
      if (latest.status !== "WAITING" || !latest.scheduledStartAt || latest.startedAt) throw new ApiError(409, "This meeting can no longer be edited", [], "MEETING_NOT_EDITABLE");
      if (latest.participants.filter((participant) => participant.state === "JOINED").length > capacity) throw new ApiError(409, "Capacity cannot be lower than the number of active participants", [], "CAPACITY_BELOW_ACTIVE_COUNT");
      throw new ApiError(409, "This meeting changed while you were editing. Reload and try again.", [], "MEETING_UPDATE_CONFLICT");
    }
    if (input.access && input.access !== meeting.access || input.waitingRoomEnabled === false) await this.invalidateAdmissions(updated._id);
    return { ...publicMeeting(updated), ...(updated.inviteCode ? { inviteCode: updated.inviteCode } : {}) };
  }

  async cancel(id: string, userId: string) {
    let meeting = await this.findById(id, true);
    if (String(meeting.createdBy) !== userId) throw new ApiError(403, "Only the organizer can cancel this meeting", [], "FORBIDDEN");
    if (meeting.status === "CANCELLED") {
      await this.invalidateAdmissions(meeting._id);
      const cleanupSucceeded = await this.cleanupMeetingResources(meeting);
      if (!cleanupSucceeded) throw new ApiError(503, "The meeting is cancelled, but LiveKit or chat access cleanup is pending and will be retried.", [], "MEETING_CLEANUP_PENDING");
      return publicMeeting(await this.findById(id, true));
    }
    if (meeting.status !== "WAITING" || !meeting.scheduledStartAt || meeting.startedAt) throw new ApiError(409, "Only a scheduled meeting that has never started can be cancelled", [], "MEETING_NOT_CANCELLABLE");
    const now = new Date();
    const cancelled = await StudyMeeting.updateOne({
      _id: meeting._id,
      createdBy: new Types.ObjectId(userId),
      status: "WAITING",
      startedAt: null,
      scheduledStartAt: { $ne: null },
      $expr: { $eq: [joinedCountExpression, 0] }
    }, { $set: {
      status: "CANCELLED",
      cancelledAt: now,
      endReason: "organizer_cancelled",
      providerCleanupStatus: "PENDING",
      providerCleanupErrorCode: null,
      streamCleanupStatus: "PENDING",
      streamCleanupErrorCode: null
    } });
    if (!cancelled.modifiedCount) {
      meeting = await this.findById(id, true);
      if (meeting.status === "CANCELLED") {
        const cleanupSucceeded = await this.cleanupMeetingResources(meeting);
        if (!cleanupSucceeded) throw new ApiError(503, "The meeting is cancelled, but LiveKit or chat access cleanup is pending and will be retried.", [], "MEETING_CLEANUP_PENDING");
        return publicMeeting(await this.findById(id, true));
      }
      throw new ApiError(409, "This meeting has started or changed and can no longer be cancelled", [], "MEETING_NOT_CANCELLABLE");
    }
    await this.invalidateAdmissions(meeting._id);
    meeting = await this.findById(id, true);
    const cleanupSucceeded = await this.cleanupMeetingResources(meeting);
    const result = await this.findById(id, true);
    if (!cleanupSucceeded) throw new ApiError(503, "The meeting is cancelled, but LiveKit or chat access cleanup is pending and will be retried.", [], "MEETING_CLEANUP_PENDING");
    return publicMeeting(result);
  }

  async join(id: string, identity: Identity, inviteCode?: string): Promise<any> {
    const meeting = await this.findById(id, true);
    this.assertCanView(meeting, identity.userId, inviteCode);
    if (meeting.deniedUsers.some((memberId) => String(memberId) === identity.userId)) {
      throw new ApiError(403, "You are no longer allowed to join this meeting", [], "MEETING_ACCESS_DENIED");
    }
    if (isTerminal(meeting.status)) throw new ApiError(410, meeting.status === "CANCELLED" ? "This meeting was cancelled" : "This meeting has ended", [], meeting.status === "CANCELLED" ? "MEETING_CANCELLED" : "MEETING_ENDED");
    const userObjectId = new Types.ObjectId(identity.userId);
    const isHost = String(meeting.createdBy) === identity.userId;
    const existingParticipant = meeting.participants.find((item) => String(item.userId) === identity.userId);
    if (meeting.waitingRoomEnabled && !isHost && existingParticipant?.state !== "JOINED") {
      const currentMeeting = await this.findById(id, true);
      if (!currentMeeting.waitingRoomEnabled) return this.join(id, identity, inviteCode);
      if (!existingParticipant && currentMeeting.participants.filter((item) => item.state === "JOINED").length >= currentMeeting.capacity) throw new ApiError(409, "This meeting is full", [], "MEETING_FULL");
      const admission = await this.getOrCreateAdmissionRequest(meeting, identity, Boolean(inviteCode && meeting.inviteCode === inviteCode), this.joinAuthorizationQuery(meeting, identity.userId, inviteCode));
      if (admission.status === "PENDING") return { admissionRequired: true as const, status: "PENDING" as const };
      if (admission.status !== "APPROVED") throw new ApiError(403, admission.status === "REJECTED" ? "The host declined your request to join" : "Your request to join is no longer valid", [], `ADMISSION_${admission.status}`);
      const invitationStillValid = Boolean(inviteCode && meeting.inviteCode === inviteCode && admission.invitationCodeHash === this.hashInvitation(inviteCode));
      if (meeting.access !== "PUBLIC" && !existingParticipant && !invitationStillValid) throw new ApiError(403, "This invitation is no longer valid", [], "INVITATION_INVALID");
    }
    if (!liveKitService.isConfigured()) {
      throw new ApiError(503, "Study meetings are unavailable because group media is not configured", [], "LIVEKIT_NOT_CONFIGURED");
    }
    const participant = meeting.participants.find((item) => String(item.userId) === identity.userId);
    const now = new Date();

    if (participant?.state === "JOINED") {
      // A repeated join is a reconnect of the current attendance period.
      await this.ensureAttendancePeriod(meeting._id, participant);
      const update = await StudyMeeting.updateOne({
        _id: meeting._id, status: activeStatusQuery,
        deniedUsers: { $ne: userObjectId },
        ...this.joinAuthorizationQuery(meeting, identity.userId, inviteCode),
        participants: { $elemMatch: { userId: userObjectId, state: "JOINED" } }
      }, { $set: {
        "participants.$[member].name": identity.name,
        "participants.$[member].avatar": identity.avatar,
        "participants.$[member].connectionState": "CONNECTING",
        "participants.$[member].connectionLostAt": null,
        "participants.$[member].lastActivityAt": now
      } }, { arrayFilters: [{ "member.userId": userObjectId, "member.state": "JOINED" }] });
      if (!update.matchedCount) throw new ApiError(410, "This meeting is no longer active", [], "MEETING_ENDED");
      await this.activateMeeting(meeting._id);
      return this.issueJoinCredentials(id, identity.userId);
    }

    if (participant?.state === "LEFT") {
      const attendanceId = new Types.ObjectId();
      const history = (participant.attendancePeriods || []).length === 0 && participant.joinedAt
        ? [{ joinedAt: participant.joinedAt, leftAt: participant.leftAt ?? null, endReason: "LEGACY_UNKNOWN" }]
        : [];
      const rejoined = await StudyMeeting.findOneAndUpdate({
        _id: meeting._id,
        status: activeStatusQuery,
        deniedUsers: { $ne: userObjectId },
        ...this.joinAuthorizationQuery(meeting, identity.userId, inviteCode),
        participants: { $elemMatch: { userId: userObjectId, state: "LEFT" } },
        $expr: { $lt: [joinedCountExpression, "$capacity"] }
      }, {
        $set: {
          "participants.$[member].state": "JOINED",
          "participants.$[member].name": identity.name,
          "participants.$[member].avatar": identity.avatar,
          "participants.$[member].joinedAt": now,
          "participants.$[member].leftAt": null,
          "participants.$[member].connectionState": "CONNECTING",
          "participants.$[member].audioEnabled": false,
          "participants.$[member].videoEnabled": false,
          "participants.$[member].activeAttendanceId": attendanceId,
          "participants.$[member].lastActivityAt": now,
          "participants.$[member].connectionLostAt": null
        },
        $push: { "participants.$[member].attendancePeriods": { $each: [...history, { _id: attendanceId, joinedAt: now, leftAt: null, endReason: null }] } }
      }, { new: true, arrayFilters: [{ "member.userId": userObjectId, "member.state": "LEFT" }] }).exec();
      if (!rejoined) {
        const latest = await this.findById(id, true);
        if (isTerminal(latest.status)) throw new ApiError(410, latest.status === "CANCELLED" ? "This meeting was cancelled" : "This meeting has ended", [], latest.status === "CANCELLED" ? "MEETING_CANCELLED" : "MEETING_ENDED");
        if (latest.participants.some((item) => String(item.userId) === identity.userId && item.state === "JOINED")) {
          return this.issueJoinCredentials(id, identity.userId);
        }
        throw new ApiError(409, "This meeting is full or no longer available", [], "MEETING_FULL");
      }
      try {
        await streamService.addStudyMeetingMember(rejoined.streamChannelId, identity.userId);
      } catch (error) {
        await this.closeParticipation(rejoined._id, identity.userId, "JOIN_FAILED");
        await this.markWaitingWhenEmpty(rejoined._id);
        throw error;
      }
      await this.activateMeeting(rejoined._id);
      return this.issueJoinCredentials(id, identity.userId);
    }

    const attendanceId = new Types.ObjectId();
    // Participant append and capacity check happen atomically in MongoDB.
    const joined = await StudyMeeting.findOneAndUpdate({
      _id: meeting._id,
      status: activeStatusQuery,
      deniedUsers: { $ne: userObjectId },
      ...this.joinAuthorizationQuery(meeting, identity.userId, inviteCode),
      "participants.userId": { $ne: userObjectId },
      $expr: { $lt: [joinedCountExpression, "$capacity"] }
    }, {
      $push: { participants: {
        userId: userObjectId,
        name: identity.name,
        avatar: identity.avatar,
        role: String(meeting.createdBy) === identity.userId ? "HOST" : "PARTICIPANT",
        state: "JOINED",
        joinedAt: now,
        leftAt: null,
        audioEnabled: false,
        videoEnabled: false,
        connectionState: "CONNECTING",
        activeAttendanceId: attendanceId,
        lastActivityAt: now,
        connectionLostAt: null,
        attendancePeriods: [{ _id: attendanceId, joinedAt: now, leftAt: null, endReason: null }]
      } }
    }, { new: true }).exec();
    if (!joined) {
      const latest = await this.findById(id, true);
      if (isTerminal(latest.status)) throw new ApiError(410, latest.status === "CANCELLED" ? "This meeting was cancelled" : "This meeting has ended", [], latest.status === "CANCELLED" ? "MEETING_CANCELLED" : "MEETING_ENDED");
      if (latest.participants.some((item) => String(item.userId) === identity.userId && item.state === "JOINED")) {
        await this.ensureAttendancePeriod(latest._id, latest.participants.find((item) => String(item.userId) === identity.userId)!);
        return this.issueJoinCredentials(id, identity.userId);
      }
      throw new ApiError(409, "This meeting is full", [], "MEETING_FULL");
    }
    try {
      await streamService.addStudyMeetingMember(joined.streamChannelId, identity.userId);
    } catch (error) {
      await this.closeParticipation(joined._id, identity.userId, "JOIN_FAILED");
      await this.markWaitingWhenEmpty(joined._id);
      throw error;
    }
    await this.activateMeeting(joined._id);
    return this.issueJoinCredentials(id, identity.userId);
  }

  async resolveInvitation(code: string, identity: Identity) {
    const meeting = await StudyMeeting.findOne({ inviteCode: code }).select("+inviteCode +liveKitRoomName +participants.lastActivityAt +participants.connectionLostAt +providerCleanupErrorCode +admissionRequests.invitationCodeHash").exec();
    if (!meeting) throw new ApiError(404, "Invitation is invalid or unavailable", [], "INVITATION_INVALID");
    if (isTerminal(meeting.status)) throw new ApiError(410, meeting.status === "CANCELLED" ? "This invitation was cancelled" : "This meeting has ended", [], meeting.status === "CANCELLED" ? "MEETING_CANCELLED" : "MEETING_ENDED");
    if (meeting.access === "PUBLIC") throw new ApiError(410, "This invitation is no longer active", [], "INVITATION_INVALID");
    this.assertNotDenied(meeting, identity.userId);
    this.assertCanView(meeting, identity.userId, code);
    return { meetingId: String(meeting._id) };
  }

  async admissionRequests(id: string, userId: string) {
    const meeting = await this.findById(id, true);
    this.assertHost(meeting, userId);
    await this.expirePendingAdmissions(meeting);
    const latest = await this.findById(id, true);
    return (latest.admissionRequests || []).filter((request) => request.status === "PENDING").map((request) => ({ userId: String(request.userId), name: request.name, avatar: request.avatar, requestedAt: request.requestedAt }));
  }

  async admissionStatus(id: string, userId: string) {
    const meeting = await this.findById(id, true);
    this.assertNotDenied(meeting, userId);
    await this.expirePendingAdmissions(meeting);
    const request = (await this.findById(id, true)).admissionRequests?.find((item) => String(item.userId) === userId);
    if (!request && meeting.access !== "PUBLIC" && String(meeting.createdBy) !== userId && !meeting.participants.some((item) => String(item.userId) === userId)) {
      throw new ApiError(404, "Meeting not found", [], "MEETING_NOT_FOUND");
    }
    return { status: request?.status || "NONE" };
  }

  async decideAdmission(id: string, hostId: string, requesterId: string, decision: "APPROVED" | "REJECTED") {
    let meeting = await this.findById(id, true);
    this.assertHost(meeting, hostId);
    if (isTerminal(meeting.status)) throw new ApiError(410, "This meeting is no longer accepting admission decisions", [], "MEETING_ENDED");
    if (!meeting.waitingRoomEnabled) throw new ApiError(409, "The waiting room is no longer enabled", [], "WAITING_ROOM_DISABLED");
    await this.expirePendingAdmissions(meeting);
    meeting = await this.findById(id, true);
    this.assertHost(meeting, hostId);
    if (isTerminal(meeting.status)) throw new ApiError(410, "This meeting is no longer accepting admission decisions", [], "MEETING_ENDED");
    if (!meeting.waitingRoomEnabled) throw new ApiError(409, "The waiting room is no longer enabled", [], "WAITING_ROOM_DISABLED");
    const requester = new Types.ObjectId(requesterId);
    if (meeting.deniedUsers.some((item) => String(item) === requesterId)) throw new ApiError(403, "This user is no longer eligible to join", [], "MEETING_ACCESS_DENIED");
    const admission = meeting.admissionRequests?.find((item) => String(item.userId) === requesterId);
    if (admission?.status === decision && (decision === "REJECTED" || Date.now() - admission.requestedAt.getTime() < 15 * 60_000)) {
      return { status: decision };
    }
    if (admission?.status !== "PENDING" || Date.now() - admission.requestedAt.getTime() >= 15 * 60_000) {
      throw new ApiError(409, "This admission request has expired or is no longer pending", [], "ADMISSION_REQUEST_STALE");
    }
    const priorParticipant = meeting.participants.some((item) => String(item.userId) === requesterId);
    const invitationStillValid = Boolean(admission?.invitationValidated && meeting.inviteCode && admission.invitationCodeHash === this.hashInvitation(meeting.inviteCode));
    if (decision === "APPROVED" && meeting.access !== "PUBLIC" && !priorParticipant && !invitationStillValid) throw new ApiError(403, "This invitation is no longer valid", [], "INVITATION_INVALID");
    if (decision === "APPROVED" && meeting.participants.filter((item) => item.state === "JOINED").length >= meeting.capacity) throw new ApiError(409, "The meeting is full. No participant slot is reserved by approval.", [], "MEETING_FULL");
    const requestExpiryCutoff = new Date(Date.now() - 15 * 60_000);
    const match = await StudyMeeting.updateOne({ _id: meeting._id, status: activeStatusQuery, waitingRoomEnabled: true, admissionRequests: { $elemMatch: { userId: requester, status: "PENDING", requestedAt: { $gt: requestExpiryCutoff } } }, deniedUsers: { $ne: requester } }, {
      $set: { "admissionRequests.$[request].status": decision, "admissionRequests.$[request].decidedAt": new Date(), "admissionRequests.$[request].decidedBy": new Types.ObjectId(hostId) }
    }, { arrayFilters: [{ "request.userId": requester, "request.status": "PENDING" }] });
    if (!match.modifiedCount) {
      const latest = await this.findById(id, true);
      const existing = latest.admissionRequests?.find((item) => String(item.userId) === requesterId);
      if (existing?.status === decision) return { status: decision };
      throw new ApiError(409, "This admission request is no longer pending", [], "ADMISSION_REQUEST_STALE");
    }
    return { status: decision };
  }

  async cancelAdmissionRequest(id: string, userId: string) {
    const meeting = await this.findById(id, true);
    const user = new Types.ObjectId(userId);
    const result = await StudyMeeting.updateOne({ _id: meeting._id, status: activeStatusQuery, admissionRequests: { $elemMatch: { userId: user, status: "PENDING" } } }, {
      $set: { "admissionRequests.$[request].status": "CANCELLED", "admissionRequests.$[request].decidedAt": new Date() }
    }, { arrayFilters: [{ "request.userId": user, "request.status": "PENDING" }] });
    if (!result.matchedCount) return { status: "NONE" };
    return { status: "CANCELLED" };
  }

  private async getOrCreateAdmissionRequest(meeting: StudyMeetingDocument, identity: Identity, invitationValidated: boolean, authorizationFilter: Record<string, unknown>) {
    await this.expirePendingAdmissions(meeting);
    const historyCutoff = new Date(Date.now() - 24 * 60 * 60_000);
    await StudyMeeting.updateOne({ _id: meeting._id }, { $pull: { admissionRequests: { status: { $in: ["REJECTED", "CANCELLED", "EXPIRED", "INVALIDATED"] }, requestedAt: { $lt: historyCutoff } } } });
    const userId = new Types.ObjectId(identity.userId);
    let current = (await this.findById(String(meeting._id), true)).admissionRequests?.find((item) => String(item.userId) === identity.userId);
    if (current?.status === "PENDING" || current?.status === "APPROVED") return current;
    const now = new Date();
    let result;
    if (current) {
      result = await StudyMeeting.updateOne({ _id: meeting._id, status: activeStatusQuery, waitingRoomEnabled: true, deniedUsers: { $ne: userId }, ...authorizationFilter, admissionRequests: { $elemMatch: { userId, status: { $ne: "PENDING" } } } }, {
        $set: {
          "admissionRequests.$[request].name": identity.name,
          "admissionRequests.$[request].avatar": identity.avatar,
          "admissionRequests.$[request].status": "PENDING",
          "admissionRequests.$[request].invitationValidated": invitationValidated,
          "admissionRequests.$[request].invitationCodeHash": invitationValidated && meeting.inviteCode ? this.hashInvitation(meeting.inviteCode) : null,
          "admissionRequests.$[request].requestedAt": now,
          "admissionRequests.$[request].decidedAt": null,
          "admissionRequests.$[request].decidedBy": null
        }
      }, { arrayFilters: [{ "request.userId": userId, "request.status": { $ne: "PENDING" } }] });
    } else {
      result = await StudyMeeting.updateOne({ _id: meeting._id, status: activeStatusQuery, waitingRoomEnabled: true, deniedUsers: { $ne: userId }, ...authorizationFilter, admissionRequests: { $not: { $elemMatch: { userId } } }, $expr: { $lt: [{ $size: { $ifNull: ["$admissionRequests", []] } }, 500] } }, {
        $push: { admissionRequests: { userId, name: identity.name, avatar: identity.avatar, status: "PENDING", invitationValidated, ...(invitationValidated && meeting.inviteCode ? { invitationCodeHash: this.hashInvitation(meeting.inviteCode) } : {}), requestedAt: now, decidedAt: null, decidedBy: null } }
      });
    }
    const fresh = await this.findById(String(meeting._id), true);
    current = fresh.admissionRequests?.find((item) => String(item.userId) === identity.userId);
    if (!current) {
      this.assertNotDenied(fresh, identity.userId);
      if (isTerminal(fresh.status)) throw new ApiError(410, "This meeting is no longer available", [], "MEETING_ENDED");
      if ((fresh.admissionRequests?.length || 0) >= 500) throw new ApiError(429, "This meeting has too many recent admission requests. Ask the host to review the waiting room.", [], "ADMISSION_REQUEST_LIMIT");
      throw new ApiError(409, "Could not create an admission request. Please try again.", [], "ADMISSION_REQUEST_CONFLICT");
    }
    if (result?.matchedCount === 0 && current.status !== "PENDING" && current.status !== "APPROVED") throw new ApiError(409, "Could not create an admission request. Please try again.", [], "ADMISSION_REQUEST_CONFLICT");
    return current;
  }

  private async expirePendingAdmissions(meeting: StudyMeetingDocument) {
    // Only PENDING requests expire after 15 minutes. APPROVED requests represent
    // a host decision and must remain APPROVED so the subsequent join call can
    // honour them. Expiring an APPROVED request would silently block an admitted user.
    const expiry = new Date(Date.now() - 15 * 60_000);
    await StudyMeeting.updateOne({ _id: meeting._id, status: activeStatusQuery, admissionRequests: { $elemMatch: { status: "PENDING", requestedAt: { $lte: expiry } } } }, {
      $set: { "admissionRequests.$[request].status": "EXPIRED", "admissionRequests.$[request].decidedAt": new Date() }
    }, { arrayFilters: [{ "request.status": "PENDING", "request.requestedAt": { $lte: expiry } }] });
  }

  private async invalidateAdmissions(meetingId: Types.ObjectId) {
    await StudyMeeting.updateOne({ _id: meetingId, admissionRequests: { $elemMatch: { status: { $in: ["PENDING", "APPROVED"] } } } }, {
      $set: { "admissionRequests.$[request].status": "INVALIDATED", "admissionRequests.$[request].decidedAt": new Date() }
    }, { arrayFilters: [{ "request.status": { $in: ["PENDING", "APPROVED"] } }] });
  }

  private assertHost(meeting: StudyMeetingDocument, userId: string) {
    if (String(meeting.createdBy) !== userId) throw new ApiError(403, "Only the meeting host can manage admission requests", [], "FORBIDDEN");
  }

  private hashInvitation(code: string) {
    return createHash("sha256").update(code).digest("hex");
  }

  private joinAuthorizationQuery(meeting: StudyMeetingDocument, userId: string, inviteCode?: string): Record<string, unknown> {
    if (String(meeting.createdBy) === userId || meeting.participants.some((participant) => String(participant.userId) === userId)) return {};
    if (meeting.access === "PUBLIC") return { access: "PUBLIC" };
    return { access: meeting.access, inviteCode: inviteCode || null };
  }

  async markConnected(id: string, userId: string) {
    return this.setConnectionState(id, userId, "CONNECTED");
  }

  async setConnectionState(id: string, userId: string, state: "CONNECTED" | "RECONNECTING") {
    const meeting = await this.findById(id, true);
    const participant = meeting.participants.find((item) => String(item.userId) === userId && item.state === "JOINED");
    if (!participant || isTerminal(meeting.status)) throw new ApiError(403, "You are not an active meeting participant", [], "MEETING_ACCESS_DENIED");
    if (state === "CONNECTED" && !await liveKitService.isMeetingParticipantConnected(meeting.liveKitRoomName, userId)) {
      throw new ApiError(409, "The media provider has not confirmed your connection yet", [], "MEDIA_CONNECTION_UNVERIFIED");
    }
    const now = new Date();
    const update = await StudyMeeting.updateOne({
      _id: meeting._id, status: activeStatusQuery,
      participants: { $elemMatch: { userId: new Types.ObjectId(userId), state: "JOINED" } }
    }, { $set: {
      "participants.$[member].connectionState": state,
      "participants.$[member].lastActivityAt": now,
      ...(state === "CONNECTED" ? { "participants.$[member].connectionLostAt": null } : {})
    } }, { arrayFilters: [{ "member.userId": new Types.ObjectId(userId), "member.state": "JOINED" }] });
    if (!update.matchedCount) throw new ApiError(403, "Your meeting attendance has ended", [], "MEETING_ACCESS_DENIED");
    if (state === "CONNECTED") {
      await StudyMeeting.updateOne({ _id: meeting._id, status: "ACTIVE", startedAt: null }, { $set: { startedAt: now } });
    }
    return publicMeeting(await this.findById(id, true));
  }

  async heartbeat(id: string, userId: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(403, "You are not an active meeting participant", [], "MEETING_ACCESS_DENIED");
    const now = new Date();
    const result = await StudyMeeting.updateOne({
      _id: new Types.ObjectId(id), status: activeStatusQuery,
      participants: { $elemMatch: { userId: new Types.ObjectId(userId), state: "JOINED" } }
    }, { $set: {
      "participants.$[member].lastActivityAt": now
    } }, { arrayFilters: [{ "member.userId": new Types.ObjectId(userId), "member.state": "JOINED" }] });
    if (!result.matchedCount) throw new ApiError(403, "You are not an active meeting participant", [], "MEETING_ACCESS_DENIED");
    return { acknowledged: true, serverTime: now.toISOString() };
  }

  async updateMediaState(id: string, userId: string, requested: { audioEnabled: boolean; videoEnabled: boolean }) {
    const meeting = await this.findById(id, true);
    if (isTerminal(meeting.status) || !meeting.participants.some((item) => String(item.userId) === userId && item.state === "JOINED")) {
      throw new ApiError(403, "You are not an active meeting participant", [], "MEETING_ACCESS_DENIED");
    }
    // The request is only a client sync hint. Persist provider-observed published track state.
    const actual = await liveKitService.getMeetingParticipantMediaState(meeting.liveKitRoomName, userId);
    if (!actual) throw new ApiError(409, "The media provider has not confirmed your participant session", [], "MEDIA_CONNECTION_UNVERIFIED");
    const update = await StudyMeeting.updateOne({
      _id: meeting._id, status: activeStatusQuery,
      participants: { $elemMatch: { userId: new Types.ObjectId(userId), state: "JOINED" } }
    }, { $set: {
      "participants.$[member].audioEnabled": actual.audioEnabled,
      "participants.$[member].videoEnabled": actual.videoEnabled,
      "participants.$[member].lastActivityAt": new Date(),
      "participants.$[member].connectionLostAt": null
    } }, { arrayFilters: [{ "member.userId": new Types.ObjectId(userId), "member.state": "JOINED" }] });
    if (!update.matchedCount) throw new ApiError(403, "Your meeting attendance has ended", [], "MEETING_ACCESS_DENIED");
    if (requested.audioEnabled !== actual.audioEnabled || requested.videoEnabled !== actual.videoEnabled) {
      console.info("Study meeting media state reconciled with LiveKit", { meetingId: id, participantId: userId });
    }
    return publicMeeting(await this.findById(id, true));
  }

  async leave(id: string, userId: string) {
    const meeting = await this.findById(id, true);
    if (isTerminal(meeting.status)) return publicMeeting(meeting);
    await this.closeParticipation(meeting._id, userId, "LEFT");
    const [mediaRemoval, chatRemoval] = await Promise.allSettled([
      liveKitService.removeMeetingParticipant(meeting.liveKitRoomName, userId),
      streamService.removeStudyMeetingMember(meeting.streamChannelId, userId)
    ]);
    await this.markWaitingWhenEmpty(meeting._id);
    if (mediaRemoval.status === "rejected" || chatRemoval.status === "rejected") {
      console.error("[StudyMeetingService] Leave cleanup incomplete", {
        meetingId: String(meeting._id),
        userId,
        mediaRemovalFailed: mediaRemoval.status === "rejected",
        chatRemovalFailed: chatRemoval.status === "rejected"
      });
      throw new ApiError(503, "You left the meeting, but room cleanup is still pending.", [], "PARTICIPANT_CLEANUP_PENDING");
    }
    return publicMeeting(await this.findById(id, true));
  }

  async removeParticipant(id: string, hostId: string, targetUserId: string) {
    const meeting = await this.findById(id, true);
    if (String(meeting.createdBy) !== hostId) throw new ApiError(403, "Only the host can remove meeting participants", [], "FORBIDDEN");
    if (targetUserId === hostId) throw new ApiError(400, "The host cannot remove themself", [], "INVALID_PARTICIPANT");
    if (isTerminal(meeting.status)) throw new ApiError(409, "This meeting has ended; participant removal is no longer applicable", [], "MEETING_ENDED");
    const target = new Types.ObjectId(targetUserId);
    // Persist the deny before provider calls. Mongo's single-document update
    // serializes against join/rejoin updates that also check deniedUsers.
    const denied = await StudyMeeting.updateOne({
      _id: meeting._id,
      status: activeStatusQuery,
      "participants.userId": target
    }, { $addToSet: { deniedUsers: target } });
    if (!denied.matchedCount) {
      const latest = await this.findById(id, true);
      if (isTerminal(latest.status)) throw new ApiError(409, "This meeting has ended; participant removal is no longer applicable", [], "MEETING_ENDED");
      throw new ApiError(404, "Participant not found in this meeting", [], "PARTICIPANT_NOT_FOUND");
    }
    await StudyMeeting.updateOne({ _id: meeting._id, status: activeStatusQuery }, {
      $set: { "admissionRequests.$[request].status": "INVALIDATED", "admissionRequests.$[request].decidedAt": new Date() }
    }, { arrayFilters: [{ "request.userId": target, "request.status": { $in: ["PENDING", "APPROVED"] } }] });
    await this.closeParticipation(meeting._id, targetUserId, "REMOVED");
    // Revoke chat membership even if the SFU's participant removal fails. The
    // durable deny/leave changes above remain authoritative either way.
    const [mediaRemoval, chatRemoval] = await Promise.allSettled([
      liveKitService.removeMeetingParticipant(meeting.liveKitRoomName, targetUserId),
      streamService.removeStudyMeetingMember(meeting.streamChannelId, targetUserId)
    ]);
    await this.markWaitingWhenEmpty(meeting._id);
    if (mediaRemoval.status === "rejected" || chatRemoval.status === "rejected") {
      console.error("[StudyMeetingService] Participant cleanup incomplete", {
        meetingId: String(meeting._id),
        targetUserId,
        mediaRemovalFailed: mediaRemoval.status === "rejected",
        chatRemovalFailed: chatRemoval.status === "rejected"
      });
      throw new ApiError(503, "Participant access was revoked, but meeting room cleanup is still pending.", [], "PARTICIPANT_CLEANUP_PENDING");
    }
    return publicMeeting(await this.findById(id, true));
  }

  async end(id: string, userId: string) {
    const meeting = await this.findById(id, true);
    if (String(meeting.createdBy) !== userId) throw new ApiError(403, "Only the host can end this meeting", [], "FORBIDDEN");
    if (meeting.status === "CANCELLED") throw new ApiError(409, "A cancelled meeting cannot be ended", [], "MEETING_CANCELLED");
    if (meeting.status !== "ENDED") {
      await StudyMeeting.updateOne({ _id: meeting._id, createdBy: new Types.ObjectId(userId), status: activeStatusQuery }, {
        $set: {
          status: "ENDED",
          endedAt: new Date(),
          endReason: "host_ended",
          providerCleanupStatus: "PENDING",
          providerCleanupErrorCode: null,
          streamCleanupStatus: "PENDING",
          streamCleanupErrorCode: null
        }
      });
    }
    const ended = await this.findById(id, true);
    if (ended.status !== "ENDED") throw new ApiError(409, "The meeting could not be ended", [], "MEETING_END_CONFLICT");
    await this.invalidateAdmissions(ended._id);
    for (const participant of ended.participants) {
      if (participant.state === "JOINED") await this.closeParticipation(ended._id, String(participant.userId), "MEETING_ENDED");
    }
    const cleanupSucceeded = await this.cleanupMeetingResources(ended);
    const result = await this.findById(id, true);
    if (!cleanupSucceeded) {
      throw new ApiError(503, "The meeting has ended, but LiveKit or chat access cleanup is pending and will be retried.", [], "MEETING_CLEANUP_PENDING");
    }
    return publicMeeting(result);
  }

  private async ensureAttendancePeriod(meetingId: Types.ObjectId, participant: IStudyMeetingParticipant) {
    if (participant.activeAttendanceId) return;
    const userObjectId = participant.userId;
    const attendanceId = new Types.ObjectId();
    const history = (participant.attendancePeriods || []).length === 0 && participant.joinedAt
      ? [{ joinedAt: participant.joinedAt, leftAt: null, endReason: null }]
      : [];
    await StudyMeeting.updateOne({
      _id: meetingId,
      participants: { $elemMatch: { userId: userObjectId, state: "JOINED", $or: [{ activeAttendanceId: null }, { activeAttendanceId: { $exists: false } }] } }
    }, {
      $set: { "participants.$[member].activeAttendanceId": attendanceId },
      $push: { "participants.$[member].attendancePeriods": { $each: [...history, { _id: attendanceId, joinedAt: participant.joinedAt, leftAt: null, endReason: null }] } }
    }, { arrayFilters: [{ "member.userId": userObjectId, "member.state": "JOINED", $or: [{ "member.activeAttendanceId": null }, { "member.activeAttendanceId": { $exists: false } }] }] });
  }

  private async closeParticipation(meetingId: Types.ObjectId, userId: string, endReason: AttendanceEndReason, endedAt = new Date()): Promise<boolean> {
    const userObjectId = new Types.ObjectId(userId);
    const meeting = await StudyMeeting.findOne({ _id: meetingId, "participants.userId": userObjectId })
      .select("participants.userId participants.state participants.joinedAt participants.activeAttendanceId participants.attendancePeriods").exec();
    const participant = meeting?.participants.find((item) => String(item.userId) === userId && item.state === "JOINED");
    if (!participant) return false;
    const attendanceId = participant.activeAttendanceId || participant.attendancePeriods?.find((period) => !period.leftAt)?._id;
    const set: Record<string, unknown> = {
      "participants.$[member].state": "LEFT",
      "participants.$[member].leftAt": endedAt,
      "participants.$[member].connectionState": "DISCONNECTED",
      "participants.$[member].audioEnabled": false,
      "participants.$[member].videoEnabled": false,
      "participants.$[member].activeAttendanceId": null,
      "participants.$[member].lastActivityAt": endedAt,
      "participants.$[member].connectionLostAt": null
    };
    const arrayFilters: any[] = [{ "member.userId": userObjectId, "member.state": "JOINED" }];
    const update: any = { $set: set };
    if (attendanceId) {
      set["participants.$[member].attendancePeriods.$[period].leftAt"] = endedAt;
      set["participants.$[member].attendancePeriods.$[period].endReason"] = endReason;
      arrayFilters.push({ "period._id": attendanceId });
    } else {
      update.$push = { "participants.$[member].attendancePeriods": {
        _id: new Types.ObjectId(), joinedAt: participant.joinedAt, leftAt: endedAt, endReason
      } };
    }
    const result = await StudyMeeting.updateOne({ _id: meetingId, "participants.userId": userObjectId, "participants.state": "JOINED" }, update, { arrayFilters });
    return result.modifiedCount > 0;
  }

  private async activateMeeting(meetingId: Types.ObjectId) {
    await StudyMeeting.updateOne({ _id: meetingId, status: "WAITING" }, { $set: { status: "ACTIVE" } });
  }

  private async markWaitingWhenEmpty(meetingId: Types.ObjectId) {
    await StudyMeeting.updateOne({
      _id: meetingId,
      status: "ACTIVE",
      $expr: { $eq: [joinedCountExpression, 0] }
    }, { $set: { status: "WAITING" } });
  }

  private async revokeRejectedJoin(meeting: StudyMeetingDocument, userId: string): Promise<void> {
    const denied = meeting.deniedUsers.some((memberId) => String(memberId) === userId);
    await this.closeParticipation(meeting._id, userId, denied ? "REMOVED" : "MEETING_ENDED");
    const [mediaRemoval, chatRemoval] = await Promise.allSettled([
      liveKitService.removeMeetingParticipant(meeting.liveKitRoomName, userId),
      streamService.removeStudyMeetingMember(meeting.streamChannelId, userId)
    ]);
    if (isTerminal(meeting.status) && chatRemoval.status === "rejected") {
      // A join can add the Stream member just after terminal cleanup queried
      // channel membership. Re-queue this late grant for the same worker.
      await StudyMeeting.updateOne({ _id: meeting._id, status: { $in: terminalStatuses } }, {
        $set: { streamCleanupStatus: "PENDING", streamCleanupAttempts: 0, streamCleanupLastAttemptAt: null }
      });
    }
    if (mediaRemoval.status === "rejected" || chatRemoval.status === "rejected") {
      console.error("Study meeting rejected join cleanup incomplete", {
        meetingId: String(meeting._id),
        userId,
        mediaRemovalFailed: mediaRemoval.status === "rejected",
        chatRemovalFailed: chatRemoval.status === "rejected"
      });
    }
  }

  private async issueJoinCredentials(id: string, userId: string) {
    let meeting = await this.findById(id, true);
    let participant = meeting.participants.find((item) => String(item.userId) === userId && item.state === "JOINED");
    if (!participant || isTerminal(meeting.status) || meeting.deniedUsers.some((memberId) => String(memberId) === userId)) {
      await this.revokeRejectedJoin(meeting, userId);
      throw new ApiError(410, "This meeting is no longer available", [], "MEETING_ENDED");
    }
    await this.ensureAttendancePeriod(meeting._id, participant);
    await liveKitService.prepareMeetingRoom({ roomName: meeting.liveKitRoomName, meetingId: String(meeting._id), maxParticipants: meeting.capacity });
    // Recheck the authoritative meeting and membership after provider preparation and immediately before signing credentials.
    meeting = await this.findById(id, true);
    participant = meeting.participants.find((item) => String(item.userId) === userId && item.state === "JOINED");
    if (!participant || isTerminal(meeting.status) || meeting.deniedUsers.some((memberId) => String(memberId) === userId)) {
      await this.revokeRejectedJoin(meeting, userId);
      throw new ApiError(410, "This meeting is no longer available", [], "MEETING_ENDED");
    }
    const media = await liveKitService.issueMeetingToken({
      roomName: meeting.liveKitRoomName,
      userId: String(participant.userId),
      displayName: participant.name,
      role: participant.role,
      mediaType: meeting.mediaType,
      maxParticipants: meeting.capacity
    });
    const finalState = await StudyMeeting.findById(meeting._id)
      .select("status deniedUsers participants.userId participants.state").exec();
    const stillAuthorized = Boolean(finalState && !isTerminal(finalState.status as StudyMeetingStatus)
      && !finalState?.deniedUsers.some((memberId) => String(memberId) === userId)
      && finalState?.participants.some((item) => String(item.userId) === userId && item.state === "JOINED"));
    if (!stillAuthorized) {
      if (finalState && isTerminal(finalState.status as StudyMeetingStatus)) {
        try {
          await liveKitService.endMeetingRoom(meeting.liveKitRoomName);
          await StudyMeeting.updateOne({ _id: meeting._id, status: finalState.status }, { $set: { providerCleanupStatus: "SUCCEEDED", providerCleanupErrorCode: null } });
        } catch (error) {
          const code = providerErrorCode(error);
          console.error("Study meeting cleanup after rejected credential issuance failed", { meetingId: String(meeting._id), code });
          await StudyMeeting.updateOne({ _id: meeting._id, status: finalState.status }, { $set: { providerCleanupStatus: "FAILED", providerCleanupErrorCode: code } });
        }
      }
      throw new ApiError(410, "This meeting is no longer available", [], "MEETING_ENDED");
    }
    return { meeting: publicMeeting(meeting), media };
  }

  private async cleanupProviderRoom(meeting: StudyMeetingDocument): Promise<boolean> {
    if (meeting.providerCleanupStatus === "SUCCEEDED" || meeting.providerCleanupStatus === "NOT_REQUIRED") return true;
    const attempt = meeting.providerCleanupAttempts;
    const claimableStatus = meeting.providerCleanupStatus === "RUNNING"
      ? { providerCleanupStatus: "RUNNING", providerCleanupLastAttemptAt: { $lt: new Date(Date.now() - CLEANUP_CLAIM_STALE_MS) } }
      : { providerCleanupStatus: { $in: ["PENDING", "FAILED"] } };
    const claimed = await StudyMeeting.findOneAndUpdate({
      _id: meeting._id,
      status: { $in: terminalStatuses },
      ...claimableStatus,
      providerCleanupAttempts: attempt
    }, {
      $set: { providerCleanupStatus: "RUNNING", providerCleanupLastAttemptAt: new Date(), providerCleanupErrorCode: null },
      $inc: { providerCleanupAttempts: 1 }
    }, { new: true }).select("+liveKitRoomName").exec();
    if (!claimed) {
      const latest = await StudyMeeting.findById(meeting._id).select("providerCleanupStatus").lean().exec();
      return latest?.providerCleanupStatus === "SUCCEEDED";
    }
    try {
      await liveKitService.endMeetingRoom(claimed.liveKitRoomName);
      await StudyMeeting.updateOne({ _id: claimed._id, status: { $in: terminalStatuses } }, {
        $set: { providerCleanupStatus: "SUCCEEDED", providerCleanupErrorCode: null }
      });
      return true;
    } catch (error) {
      const code = providerErrorCode(error);
      console.error("Study meeting media cleanup failed", { meetingId: String(meeting._id), attempt: claimed.providerCleanupAttempts, code });
      await StudyMeeting.updateOne({ _id: claimed._id, status: { $in: terminalStatuses }, providerCleanupStatus: "RUNNING" }, {
        $set: { providerCleanupStatus: "FAILED", providerCleanupErrorCode: code }
      });
      return false;
    }
  }

  private async cleanupStreamChannel(meeting: StudyMeetingDocument): Promise<boolean> {
    if (meeting.streamCleanupStatus === "SUCCEEDED" || meeting.streamCleanupStatus === "NOT_REQUIRED") return true;
    const attempt = meeting.streamCleanupAttempts || 0;
    const claimableStatus = meeting.streamCleanupStatus === "RUNNING"
      ? { streamCleanupStatus: "RUNNING", streamCleanupLastAttemptAt: { $lt: new Date(Date.now() - CLEANUP_CLAIM_STALE_MS) } }
      : { streamCleanupStatus: { $in: ["PENDING", "FAILED"] } };
    const claimed = await StudyMeeting.findOneAndUpdate({
      _id: meeting._id,
      status: { $in: terminalStatuses },
      ...claimableStatus,
      streamCleanupAttempts: attempt
    }, {
      $set: { streamCleanupStatus: "RUNNING", streamCleanupLastAttemptAt: new Date(), streamCleanupErrorCode: null },
      $inc: { streamCleanupAttempts: 1 }
    }, { new: true }).select("+streamChannelId +streamCleanupErrorCode").exec();
    if (!claimed) {
      const latest = await StudyMeeting.findById(meeting._id).select("streamCleanupStatus").lean().exec();
      return latest?.streamCleanupStatus === "SUCCEEDED";
    }
    try {
      if (!streamService.isConfigured()) throw new Error("Stream Chat is not configured for meeting membership cleanup");
      const memberIds = new Set([String(claimed.createdBy), ...claimed.participants.map((participant) => String(participant.userId))]);
      // Admission requests never become members; only the organizer and
      // persisted meeting participants are eligible for revocation here.
      const users = [...memberIds];
      for (let offset = 0; offset < users.length; offset += 10) {
        await Promise.all(users.slice(offset, offset + 10).map((userId) => streamService.removeStudyMeetingMember(claimed.streamChannelId, userId)));
      }
      await StudyMeeting.updateOne({ _id: claimed._id, status: { $in: terminalStatuses }, streamCleanupStatus: "RUNNING" }, {
        $set: { streamCleanupStatus: "SUCCEEDED", streamCleanupErrorCode: null }
      });
      return true;
    } catch (error) {
      const code = providerErrorCode(error);
      console.error("Study meeting chat membership cleanup failed", { meetingId: String(meeting._id), attempt: claimed.streamCleanupAttempts, code });
      await StudyMeeting.updateOne({ _id: claimed._id, status: { $in: terminalStatuses }, streamCleanupStatus: "RUNNING" }, {
        $set: { streamCleanupStatus: "FAILED", streamCleanupErrorCode: code }
      });
      return false;
    }
  }

  private async cleanupMeetingResources(meeting: StudyMeetingDocument): Promise<boolean> {
    const [mediaClean, chatClean] = await Promise.all([
      this.cleanupProviderRoom(meeting),
      this.cleanupStreamChannel(meeting)
    ]);
    return mediaClean && chatClean;
  }

  private async reconcileSessions(): Promise<void> {
    if (this.reconciliationRunning || mongoose.connection.readyState !== 1) return;
    this.reconciliationRunning = true;
    try {
      let cleanupAttempts = 0;
      const expiredAdmissionCutoff = new Date(Date.now() - 15 * 60_000);
      const admissionMeetings = await StudyMeeting.find({ status: activeStatusQuery, admissionRequests: { $elemMatch: { status: { $in: ["PENDING", "APPROVED"] }, requestedAt: { $lte: expiredAdmissionCutoff } } } }).select("_id").limit(MAX_MEETINGS_PER_SWEEP).exec();
      for (const meeting of admissionMeetings) await this.expirePendingAdmissions(meeting as StudyMeetingDocument);
      const eligibleMeetings = { $or: [
          { status: "ACTIVE" },
          { status: activeStatusQuery, "participants.state": "JOINED" },
          { status: { $in: terminalStatuses }, providerCleanupStatus: { $in: ["PENDING", "FAILED"] }, providerCleanupAttempts: { $lt: MAX_AUTOMATIC_CLEANUP_ATTEMPTS } },
          { status: { $in: terminalStatuses }, providerCleanupStatus: "RUNNING", providerCleanupAttempts: { $lt: MAX_AUTOMATIC_CLEANUP_ATTEMPTS }, providerCleanupLastAttemptAt: { $lt: new Date(Date.now() - CLEANUP_CLAIM_STALE_MS) } },
          { status: { $in: terminalStatuses }, streamCleanupStatus: { $in: ["PENDING", "FAILED"] }, streamCleanupAttempts: { $lt: MAX_AUTOMATIC_CLEANUP_ATTEMPTS } },
          { status: { $in: terminalStatuses }, streamCleanupStatus: "RUNNING", streamCleanupAttempts: { $lt: MAX_AUTOMATIC_CLEANUP_ATTEMPTS }, streamCleanupLastAttemptAt: { $lt: new Date(Date.now() - CLEANUP_CLAIM_STALE_MS) } }
      ] };
      const filter = this.reconciliationCursor
        ? { $and: [eligibleMeetings, { _id: { $gt: this.reconciliationCursor } }] }
        : eligibleMeetings;
      const meetings = await StudyMeeting.find(filter)
        .select("+liveKitRoomName +participants.lastActivityAt +participants.connectionLostAt +providerCleanupErrorCode +streamCleanupErrorCode")
        .sort({ _id: 1 }).limit(MAX_MEETINGS_PER_SWEEP).exec();
      const lastMeeting = meetings[meetings.length - 1];
      this.reconciliationCursor = meetings.length === MAX_MEETINGS_PER_SWEEP ? lastMeeting?._id : undefined;

      for (const meeting of meetings) {
        if (isTerminal(meeting.status)) {
          await this.invalidateAdmissions(meeting._id);
          for (const participant of meeting.participants) {
            if (participant.state === "JOINED") await this.closeParticipation(meeting._id, String(participant.userId), "MEETING_ENDED");
          }
          const lastAttempt = meeting.providerCleanupLastAttemptAt?.getTime() || 0;
          const backoffMs = Math.min(5 * 60_000, Math.max(30_000, meeting.providerCleanupAttempts * 30_000));
          if (cleanupAttempts < MAX_CLEANUPS_PER_SWEEP && ((meeting.providerCleanupStatus === "RUNNING" && Date.now() - lastAttempt >= CLEANUP_CLAIM_STALE_MS) || Date.now() - lastAttempt >= backoffMs)) {
            await this.cleanupProviderRoom(meeting);
            cleanupAttempts += 1;
          }
          const chatLastAttempt = meeting.streamCleanupLastAttemptAt?.getTime() || 0;
          const chatBackoffMs = Math.min(5 * 60_000, Math.max(30_000, (meeting.streamCleanupAttempts || 0) * 30_000));
          if (cleanupAttempts < MAX_CLEANUPS_PER_SWEEP && meeting.streamCleanupStatus !== "SUCCEEDED" && meeting.streamCleanupStatus !== "NOT_REQUIRED"
            && ((meeting.streamCleanupStatus === "RUNNING" && Date.now() - chatLastAttempt >= CLEANUP_CLAIM_STALE_MS) || Date.now() - chatLastAttempt >= chatBackoffMs)) {
            await this.cleanupStreamChannel(meeting);
            cleanupAttempts += 1;
          }
          continue;
        }
        const active = meeting.participants.filter((participant) => participant.state === "JOINED");
        if (!active.length) {
          await this.markWaitingWhenEmpty(meeting._id);
          continue;
        }
        let providerParticipants: Map<string, { audioEnabled: boolean; videoEnabled: boolean }>;
        try {
          providerParticipants = await liveKitService.listMeetingParticipantMediaStates(meeting.liveKitRoomName);
        } catch (error) {
          console.warn("Study meeting participant reconciliation deferred: LiveKit unavailable", { meetingId: String(meeting._id), code: providerErrorCode(error) });
          continue;
        }
        const now = new Date();
        for (const participant of active) {
          const userId = String(participant.userId);
          const providerMediaState = providerParticipants.get(userId);
          if (providerMediaState) {
            await StudyMeeting.updateOne({ _id: meeting._id, status: activeStatusQuery, participants: { $elemMatch: { userId: participant.userId, state: "JOINED" } } }, {
              $set: {
                "participants.$[member].connectionState": "CONNECTED",
                "participants.$[member].lastActivityAt": now,
                "participants.$[member].connectionLostAt": null,
                "participants.$[member].audioEnabled": providerMediaState.audioEnabled,
                "participants.$[member].videoEnabled": providerMediaState.videoEnabled
              }
            }, { arrayFilters: [{ "member.userId": participant.userId, "member.state": "JOINED" }] });
            await StudyMeeting.updateOne({ _id: meeting._id, status: "ACTIVE", startedAt: null }, { $set: { startedAt: now } });
            continue;
          }
          const lostAt = participant.connectionLostAt;
          if (!lostAt) {
            await StudyMeeting.updateOne({ _id: meeting._id, status: activeStatusQuery, participants: { $elemMatch: { userId: participant.userId, state: "JOINED", $or: [{ connectionLostAt: null }, { connectionLostAt: { $exists: false } }] } } }, {
              $set: { "participants.$[member].connectionState": "RECONNECTING", "participants.$[member].connectionLostAt": now }
            }, { arrayFilters: [{ "member.userId": participant.userId, "member.state": "JOINED", $or: [{ "member.connectionLostAt": null }, { "member.connectionLostAt": { $exists: false } }] }] });
            continue;
          }
          if (now.getTime() - lostAt.getTime() >= RECONNECT_GRACE_MS) {
            const closed = await this.closeParticipation(meeting._id, userId, "TIMEOUT", now);
            if (closed) {
              await liveKitService.removeMeetingParticipant(meeting.liveKitRoomName, userId).catch((error) => {
                console.warn("Stale study meeting participant removal failed", { meetingId: String(meeting._id), participantId: userId, code: providerErrorCode(error) });
              });
            }
          } else {
            // The browser heartbeat remains the authorized activity signal; no arbitrary client time is accepted.
            const activity = participant.lastActivityAt || participant.joinedAt;
            if (now.getTime() - activity.getTime() > HEARTBEAT_STALE_MS) {
              await StudyMeeting.updateOne({ _id: meeting._id, status: activeStatusQuery, participants: { $elemMatch: { userId: participant.userId, state: "JOINED" } } }, {
                $set: { "participants.$[member].connectionState": "RECONNECTING" }
              }, { arrayFilters: [{ "member.userId": participant.userId, "member.state": "JOINED" }] });
            }
          }
        }
        await this.markWaitingWhenEmpty(meeting._id);
      }
    } catch (error) {
      console.error("Study meeting lifecycle reconciliation failed", { code: providerErrorCode(error) });
    } finally {
      this.reconciliationRunning = false;
    }
  }

  private async findById(id: string, includeSecrets = false) {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(400, "Invalid meeting identifier", [], "INVALID_MEETING_ID");
    const query = StudyMeeting.findById(id);
    if (includeSecrets) query.select("+inviteCode +liveKitRoomName +participants.lastActivityAt +participants.connectionLostAt +providerCleanupErrorCode +admissionRequests.invitationCodeHash");
    const meeting = await query.exec();
    if (!meeting) throw new ApiError(404, "Meeting not found", [], "MEETING_NOT_FOUND");
    return meeting;
  }

  private assertCanView(meeting: any, userId: string, inviteCode?: string) {
    if (meeting.access === "PUBLIC" || String(meeting.createdBy) === userId || meeting.participants.some((participant: any) => String(participant.userId) === userId)) return;
    if (meeting.inviteCode && inviteCode && meeting.inviteCode === inviteCode) return;
    throw new ApiError(404, "Meeting not found or unavailable", [], "MEETING_NOT_FOUND");
  }

  private assertNotDenied(meeting: any, userId: string) {
    if (meeting.deniedUsers?.some((memberId: Types.ObjectId) => String(memberId) === userId)) {
      throw new ApiError(403, "You are no longer allowed to access this meeting", [], "MEETING_ACCESS_DENIED");
    }
  }
}

export const studyMeetingService = new StudyMeetingService();
