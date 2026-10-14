import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";

export const STUDY_MEETING_STATUSES = ["WAITING", "ACTIVE", "ENDED", "CANCELLED"] as const;
export type StudyMeetingStatus = (typeof STUDY_MEETING_STATUSES)[number];
export const STUDY_MEETING_ACCESS = ["PUBLIC", "PRIVATE", "INVITE_ONLY"] as const;
export type StudyMeetingAccess = (typeof STUDY_MEETING_ACCESS)[number];
export type StudyMeetingParticipantState = "JOINED" | "LEFT";
export type StudyMeetingAdmissionStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "EXPIRED" | "INVALIDATED";
export type StudyMeetingAttendanceEndReason = "LEFT" | "REMOVED" | "TIMEOUT" | "MEETING_ENDED" | "LEGACY_UNKNOWN" | "JOIN_FAILED";

export interface IStudyMeetingAttendancePeriod {
  _id: Types.ObjectId;
  joinedAt: Date;
  leftAt?: Date | null;
  endReason?: StudyMeetingAttendanceEndReason | null;
}

export interface IStudyMeetingParticipant {
  userId: Types.ObjectId;
  name: string;
  avatar?: string;
  role: "HOST" | "PARTICIPANT";
  state: StudyMeetingParticipantState;
  joinedAt: Date;
  leftAt?: Date | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
  connectionState: "CONNECTING" | "CONNECTED" | "RECONNECTING" | "DISCONNECTED";
  attendancePeriods: IStudyMeetingAttendancePeriod[];
  activeAttendanceId?: Types.ObjectId | null;
  lastActivityAt?: Date | null;
  connectionLostAt?: Date | null;
}

export interface IStudyMeeting {
  title: string;
  subject: string;
  description: string;
  createdBy: Types.ObjectId;
  access: StudyMeetingAccess;
  inviteCode?: string;
  status: StudyMeetingStatus;
  mediaType: "voice" | "video";
  capacity: number;
  liveKitRoomName: string;
  streamChannelId: string;
  creationRequestId?: string;
  participants: IStudyMeetingParticipant[];
  waitingRoomEnabled: boolean;
  admissionRequests: {
    userId: Types.ObjectId;
    name: string;
    avatar?: string;
    status: StudyMeetingAdmissionStatus;
    invitationValidated: boolean;
    invitationCodeHash?: string;
    requestedAt: Date;
    decidedAt?: Date | null;
    decidedBy?: Types.ObjectId | null;
  }[];
  deniedUsers: Types.ObjectId[];
  startedAt: Date | null;
  scheduledStartAt?: Date | null;
  expectedDurationMinutes?: number | null;
  endedAt?: Date | null;
  cancelledAt?: Date | null;
  endReason?: string | null;
  providerCleanupStatus: "NOT_REQUIRED" | "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
  providerCleanupAttempts: number;
  providerCleanupLastAttemptAt?: Date | null;
  providerCleanupErrorCode?: string | null;
  streamCleanupStatus: "NOT_REQUIRED" | "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
  streamCleanupAttempts: number;
  streamCleanupLastAttemptAt?: Date | null;
  streamCleanupErrorCode?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type StudyMeetingDocument = HydratedDocument<IStudyMeeting>;
type StudyMeetingModel = Model<IStudyMeeting>;

const participantSchema = new Schema<IStudyMeetingParticipant>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  avatar: { type: String, trim: true },
  role: { type: String, enum: ["HOST", "PARTICIPANT"], required: true },
  state: { type: String, enum: ["JOINED", "LEFT"], default: "JOINED", index: true },
  joinedAt: { type: Date, default: Date.now },
  leftAt: { type: Date, default: null },
  audioEnabled: { type: Boolean, default: true },
  videoEnabled: { type: Boolean, default: false },
  connectionState: { type: String, enum: ["CONNECTING", "CONNECTED", "RECONNECTING", "DISCONNECTED"], default: "CONNECTING" },
  attendancePeriods: [{
    joinedAt: { type: Date, required: true },
    leftAt: { type: Date, default: null },
    endReason: { type: String, enum: ["LEFT", "REMOVED", "TIMEOUT", "MEETING_ENDED", "LEGACY_UNKNOWN", "JOIN_FAILED"], default: null }
  }],
  activeAttendanceId: { type: Schema.Types.ObjectId, default: null },
  lastActivityAt: { type: Date, default: null, select: false },
  connectionLostAt: { type: Date, default: null, select: false }
}, { _id: false });

const studyMeetingSchema = new Schema<IStudyMeeting, StudyMeetingModel>({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  subject: { type: String, trim: true, maxlength: 120, default: "" },
  description: { type: String, trim: true, maxlength: 1000, default: "" },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  access: { type: String, enum: STUDY_MEETING_ACCESS, required: true, default: "PUBLIC", index: true },
  inviteCode: { type: String, sparse: true, unique: true, select: false },
  status: { type: String, enum: STUDY_MEETING_STATUSES, default: "WAITING", index: true },
  mediaType: { type: String, enum: ["voice", "video"], required: true, default: "voice" },
  capacity: { type: Number, min: 2, max: 100, required: true, default: 100 },
  liveKitRoomName: { type: String, required: true, unique: true, select: false },
  streamChannelId: { type: String, required: true, unique: true },
  creationRequestId: { type: String, select: false },
  participants: { type: [participantSchema], default: [] },
  waitingRoomEnabled: { type: Boolean, default: false },
  admissionRequests: [{
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    avatar: { type: String, trim: true },
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED", "EXPIRED", "INVALIDATED"], required: true },
    invitationValidated: { type: Boolean, default: false },
    invitationCodeHash: { type: String, select: false },
    requestedAt: { type: Date, required: true },
    decidedAt: { type: Date, default: null },
    decidedBy: { type: Schema.Types.ObjectId, ref: "User", default: null }
  }],
  deniedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  startedAt: { type: Date, default: null },
  scheduledStartAt: { type: Date, default: null, index: true },
  expectedDurationMinutes: { type: Number, min: 15, max: 480, default: null },
  endedAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
  endReason: { type: String, default: null },
  providerCleanupStatus: { type: String, enum: ["NOT_REQUIRED", "PENDING", "RUNNING", "SUCCEEDED", "FAILED"], default: "NOT_REQUIRED" },
  providerCleanupAttempts: { type: Number, min: 0, default: 0 },
  providerCleanupLastAttemptAt: { type: Date, default: null },
  providerCleanupErrorCode: { type: String, default: null, select: false },
  streamCleanupStatus: { type: String, enum: ["NOT_REQUIRED", "PENDING", "RUNNING", "SUCCEEDED", "FAILED"], default: "NOT_REQUIRED" },
  streamCleanupAttempts: { type: Number, min: 0, default: 0 },
  streamCleanupLastAttemptAt: { type: Date, default: null },
  streamCleanupErrorCode: { type: String, default: null, select: false }
}, { timestamps: true, versionKey: false });

studyMeetingSchema.index({ status: 1, access: 1, createdAt: -1 });
studyMeetingSchema.index({ status: 1, scheduledStartAt: 1 });
studyMeetingSchema.index({ createdBy: 1, status: 1, scheduledStartAt: 1 });
studyMeetingSchema.index({ title: "text", subject: "text" }, { weights: { title: 5, subject: 2 }, name: "study_meeting_text_search" });
studyMeetingSchema.index({ createdBy: 1, creationRequestId: 1 }, { unique: true, partialFilterExpression: { creationRequestId: { $type: "string" } }, name: "study_meeting_creation_idempotency" });
studyMeetingSchema.index({ "participants.userId": 1, status: 1 });
studyMeetingSchema.index({ status: 1, "participants.state": 1, "participants.lastActivityAt": 1 });
studyMeetingSchema.index({ status: 1, "admissionRequests.status": 1, "admissionRequests.requestedAt": 1 });
studyMeetingSchema.index({ status: 1, streamCleanupStatus: 1, streamCleanupLastAttemptAt: 1 });
studyMeetingSchema.index({ status: 1, providerCleanupStatus: 1, providerCleanupLastAttemptAt: 1 });

export const StudyMeeting = model<IStudyMeeting, StudyMeetingModel>("StudyMeeting", studyMeetingSchema);
