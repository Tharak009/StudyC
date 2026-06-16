import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";
import { MESSAGE_TYPES, type MessageType } from "../constants/message-types.js";

export interface MessageAttachment {
  key: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface IMessage {
  communityId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  messageType: MessageType;
  attachments: MessageAttachment[];
  replyTo?: Types.ObjectId;
  edited: boolean;
  editedAt?: Date;
  deleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type MessageDocument = HydratedDocument<IMessage>;
type MessageModel = Model<IMessage>;

const attachmentSchema = new Schema<MessageAttachment>(
  {
    key: { type: String, required: true },
    url: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true }
  },
  { _id: false }
);

const messageSchema = new Schema<IMessage, MessageModel>(
  {
    communityId: { type: Schema.Types.ObjectId, ref: "Community", required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    content: { type: String, trim: true, maxlength: 2000, default: "" },
    messageType: { type: String, enum: Object.values(MESSAGE_TYPES), default: MESSAGE_TYPES.TEXT },
    attachments: { type: [attachmentSchema], default: [] },
    replyTo: { type: Schema.Types.ObjectId, ref: "Message" },
    edited: { type: Boolean, default: false },
    editedAt: Date,
    deleted: { type: Boolean, default: false, index: true },
    deletedAt: Date
  },
  { timestamps: true, versionKey: false }
);

messageSchema.index({ communityId: 1, createdAt: -1, _id: -1 });
messageSchema.index({ replyTo: 1 });

export const Message = model<IMessage, MessageModel>("Message", messageSchema);
