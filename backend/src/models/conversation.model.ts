import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";

export interface IConversation {
  participants: Types.ObjectId[];
  lastMessage: {
    content: string;
    senderId: Types.ObjectId;
    createdAt: Date;
  } | null;
  lastMessageAt: Date | null;
  isLocked?: boolean;
  lockedBy?: Types.ObjectId | string;
  lockedReason?: string;
  lockedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ConversationDocument = HydratedDocument<IConversation>;
type ConversationModel = Model<IConversation>;

const conversationSchema = new Schema<IConversation, ConversationModel>(
  {
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
      validate: [
        (value: unknown[]) => value.length === 2,
        "A conversation must have exactly 2 participants"
      ]
    },
    lastMessage: {
      type: new Schema(
        {
          content: { type: String, required: true },
          senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
          createdAt: { type: Date, required: true }
        },
        { _id: false }
      ),
      default: null
    },
    lastMessageAt: { type: Date, default: null },
    isLocked: { type: Boolean, default: false },
    lockedBy: { type: Schema.Types.ObjectId, ref: "User" },
    lockedReason: { type: String, trim: true, default: "" },
    lockedAt: Date
  },
  { timestamps: true, versionKey: false }
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });

export const Conversation = model<IConversation, ConversationModel>("Conversation", conversationSchema);
