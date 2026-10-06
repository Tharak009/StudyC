import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";

export type CallLogType = "voice" | "video";
export type CallLogMode = "direct" | "group" | "stage";
export type CallLogStatus = "completed" | "missed" | "declined" | "cancelled" | "failed";

export interface ICallParticipantLog {
  userId: Types.ObjectId;
  name: string;
  avatar?: string;
  role?: string;
  joinedAt: Date;
  leftAt?: Date;
}

export interface ICallLog {
  callId: string;
  callerId: Types.ObjectId;
  callerName: string;
  callerAvatar?: string;
  calleeId?: Types.ObjectId | null;
  calleeName?: string | null;
  calleeAvatar?: string | null;
  channelId?: string | null;
  communityId?: string | null;
  communityName?: string | null;
  type: CallLogType;
  mode: CallLogMode;
  status: CallLogStatus;
  startedAt: Date;
  endedAt?: Date | null;
  durationSeconds: number;
  participants: ICallParticipantLog[];
  createdAt: Date;
  updatedAt: Date;
}

export type CallLogDocument = HydratedDocument<ICallLog>;
type CallLogModel = Model<ICallLog>;

const callParticipantSchema = new Schema<ICallParticipantLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    avatar: { type: String, trim: true },
    role: { type: String, default: "participant" },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date }
  },
  { _id: false }
);

const callLogSchema = new Schema<ICallLog, CallLogModel>(
  {
    callId: { type: String, required: true, unique: true, index: true },
    callerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    callerName: { type: String, required: true, trim: true },
    callerAvatar: { type: String, trim: true },
    calleeId: { type: Schema.Types.ObjectId, ref: "User", index: true, default: null },
    calleeName: { type: String, trim: true, default: null },
    calleeAvatar: { type: String, trim: true, default: null },
    channelId: { type: String, index: true, default: null },
    communityId: { type: String, default: null },
    communityName: { type: String, default: null },
    type: { type: String, enum: ["voice", "video"], required: true },
    mode: { type: String, enum: ["direct", "group", "stage"], required: true },
    status: {
      type: String,
      enum: ["completed", "missed", "declined", "cancelled", "failed"],
      required: true,
      index: true
    },
    startedAt: { type: Date, required: true, default: Date.now, index: true },
    endedAt: { type: Date, default: null },
    durationSeconds: { type: Number, default: 0, min: 0 },
    participants: { type: [callParticipantSchema], default: [] }
  },
  { timestamps: true, versionKey: false }
);

callLogSchema.index({ callerId: 1, startedAt: -1 });
callLogSchema.index({ calleeId: 1, startedAt: -1 });
callLogSchema.index({ "participants.userId": 1, startedAt: -1 });
callLogSchema.index({ channelId: 1, startedAt: -1 });

export const CallLog = model<ICallLog, CallLogModel>("CallLog", callLogSchema);
