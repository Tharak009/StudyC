import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";

export interface IConversation {
  participants: Types.ObjectId[];
  lastMessage: {
    content: string;
    senderId: Types.ObjectId;
    createdAt: Date;
  } | null;
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ConversationDocument = HydratedDocument<IConversation>;
type ConversationModel = Model<IConversation>;

const conversationSchema = new Schema<IConversation, ConversationModel>(
  {
    participants: [
      { type: Schema.Types.ObjectId, ref: "User", required: true }
    ],
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
    lastMessageAt: { type: Date, default: null }
  },
  { timestamps: true, versionKey: false }
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });

export const Conversation = model<IConversation, ConversationModel>("Conversation", conversationSchema);
