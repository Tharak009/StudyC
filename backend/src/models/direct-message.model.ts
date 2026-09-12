import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";
import { MESSAGE_TYPES, type MessageType } from "../constants/message-types.js";

export interface DirectMessageAttachment {
  key: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
  waveform?: number[];
}

export interface DirectMessageReaction {
  emoji: string;
  count: number;
  users: Types.ObjectId[];
  category?: "STANDARD" | "CAMPUS_CUSTOM";
}

export interface IDirectMessage {
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  messageType: MessageType;
  attachments: DirectMessageAttachment[];
  replyTo?: Types.ObjectId;
  reactions?: DirectMessageReaction[];
  clientMessageId?: string;
  delivered: boolean;
  deliveredAt?: Date;
  edited: boolean;
  editedAt?: Date;
  read: boolean;
  readAt?: Date;
  deleted: boolean;
  deletedFor?: Types.ObjectId[];
  isDeletedForEveryone?: boolean;
  deletedBy?: Types.ObjectId;
  deletedAt?: Date;
  starredBy?: Types.ObjectId[];
  isPinned?: boolean;
  pinnedAt?: Date;
  pinnedBy?: Types.ObjectId;
  isForwarded?: boolean;
  forwardedFrom?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type DirectMessageDocument = HydratedDocument<IDirectMessage>;
type DirectMessageModel = Model<IDirectMessage>;

const attachmentSchema = new Schema<DirectMessageAttachment>(
  {
    key: { type: String, required: true },
    url: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    thumbnailUrl: { type: String },
    width: { type: Number },
    height: { type: Number },
    duration: { type: Number },
    waveform: { type: [Number], default: undefined }
  },
  { _id: false }
);

const directMessageReactionSchema = new Schema<DirectMessageReaction>(
  {
    emoji: { type: String, required: true },
    count: { type: Number, default: 1 },
    users: [{ type: Schema.Types.ObjectId, ref: "User" }],
    category: { type: String, enum: ["STANDARD", "CAMPUS_CUSTOM"], default: "STANDARD" }
  },
  { _id: false }
);

const directMessageSchema = new Schema<IDirectMessage, DirectMessageModel>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    content: { type: String, trim: true, maxlength: 2000, default: "" },
    messageType: { type: String, enum: Object.values(MESSAGE_TYPES), default: MESSAGE_TYPES.TEXT },
    attachments: { type: [attachmentSchema], default: [] },
    replyTo: { type: Schema.Types.ObjectId, ref: "DirectMessage" },
    reactions: { type: [directMessageReactionSchema], default: [] },
    clientMessageId: { type: String, sparse: true, index: true },
    delivered: { type: Boolean, default: false, index: true },
    deliveredAt: Date,
    edited: { type: Boolean, default: false },
    editedAt: Date,
    read: { type: Boolean, default: false },
    readAt: Date,
    deleted: { type: Boolean, default: false, index: true },
    deletedFor: { type: [{ type: Schema.Types.ObjectId, ref: "User" }], default: [] },
    isDeletedForEveryone: { type: Boolean, default: false, index: true },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
    deletedAt: Date,
    starredBy: { type: [{ type: Schema.Types.ObjectId, ref: "User" }], default: [] },
    isPinned: { type: Boolean, default: false, index: true },
    pinnedAt: Date,
    pinnedBy: { type: Schema.Types.ObjectId, ref: "User" },
    isForwarded: { type: Boolean, default: false },
    forwardedFrom: { type: Schema.Types.ObjectId, ref: "DirectMessage" }
  },
  { timestamps: true, versionKey: false }
);

directMessageSchema.index({ conversationId: 1, createdAt: -1, _id: -1 });
directMessageSchema.index({ conversationId: 1, read: 1 });
directMessageSchema.index({ replyTo: 1 });
directMessageSchema.index({ conversationId: 1, starredBy: 1 });
directMessageSchema.index({ conversationId: 1, isPinned: 1 });

export const DirectMessage = model<IDirectMessage, DirectMessageModel>("DirectMessage", directMessageSchema);
