import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";

export const STUDY_MEETING_STATUSES = ["WAITING", "ACTIVE", "ENDED"] as const;
export type StudyMeetingStatus = (typeof STUDY_MEETING_STATUSES)[number];
export const STUDY_MEETING_ACCESS = ["PUBLIC", "PRIVATE", "INVITE_ONLY"] as const;
export type StudyMeetingAccess = (typeof STUDY_MEETING_ACCESS)[number];
export type StudyMeetingParticipantState = "JOINED" | "LEFT";

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
  connectionState: "CONNECTING" | "CONNECTED" | "RECONNECTING";
}

export interface IStudyMeeting {
  title: string;
  description: string;
  createdBy: Types.ObjectId;
  access: StudyMeetingAccess;
  inviteCode?: string;
  status: StudyMeetingStatus;
  mediaType: "voice" | "video";
  capacity: number;
  liveKitRoomName: string;
  streamChannelId: string;
  participants: IStudyMeetingParticipant[];
  deniedUsers: Types.ObjectId[];
  startedAt: Date;
  endedAt?: Date | null;
  endReason?: string | null;
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
  connectionState: { type: String, enum: ["CONNECTING", "CONNECTED", "RECONNECTING"], default: "CONNECTING" }
}, { _id: false });

const studyMeetingSchema = new Schema<IStudyMeeting, StudyMeetingModel>({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 1000, default: "" },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  access: { type: String, enum: STUDY_MEETING_ACCESS, required: true, default: "PUBLIC", index: true },
  inviteCode: { type: String, sparse: true, unique: true, select: false },
  status: { type: String, enum: STUDY_MEETING_STATUSES, default: "WAITING", index: true },
  mediaType: { type: String, enum: ["voice", "video"], required: true, default: "voice" },
  capacity: { type: Number, min: 2, max: 100, required: true, default: 100 },
  liveKitRoomName: { type: String, required: true, unique: true, select: false },
  streamChannelId: { type: String, required: true, unique: true },
  participants: { type: [participantSchema], default: [] },
  deniedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date, default: null },
  endReason: { type: String, default: null }
}, { timestamps: true, versionKey: false });

studyMeetingSchema.index({ status: 1, access: 1, createdAt: -1 });
studyMeetingSchema.index({ "participants.userId": 1, status: 1 });

export const StudyMeeting = model<IStudyMeeting, StudyMeetingModel>("StudyMeeting", studyMeetingSchema);
