import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";
import { MESSAGE_TYPES, type MessageType } from "../constants/message-types.js";

export interface DirectMessageAttachment {
  key: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface IDirectMessage {
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  messageType: MessageType;
  attachments: DirectMessageAttachment[];
  replyTo?: Types.ObjectId;
  edited: boolean;
  editedAt?: Date;
  read: boolean;
  readAt?: Date;
  deleted: boolean;
  deletedAt?: Date;
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
    size: { type: Number, required: true }
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
    edited: { type: Boolean, default: false },
    editedAt: Date,
    read: { type: Boolean, default: false },
    readAt: Date,
    deleted: { type: Boolean, default: false, index: true },
    deletedAt: Date
  },
  { timestamps: true, versionKey: false }
);

directMessageSchema.index({ conversationId: 1, createdAt: -1, _id: -1 });
directMessageSchema.index({ conversationId: 1, read: 1 });
directMessageSchema.index({ replyTo: 1 });

export const DirectMessage = model<IDirectMessage, DirectMessageModel>("DirectMessage", directMessageSchema);
