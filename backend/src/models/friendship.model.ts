import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";

export const FRIENDSHIP_STATUS = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED"
} as const;

export type FriendshipStatus = (typeof FRIENDSHIP_STATUS)[keyof typeof FRIENDSHIP_STATUS];

export interface IFriendship {
  requester: Types.ObjectId;
  recipient: Types.ObjectId;
  status: FriendshipStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type FriendshipDocument = HydratedDocument<IFriendship>;
type FriendshipModel = Model<IFriendship>;

const friendshipSchema = new Schema<IFriendship, FriendshipModel>(
  {
    requester: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: Object.values(FRIENDSHIP_STATUS),
      default: FRIENDSHIP_STATUS.PENDING,
      index: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Compound unique index so only one friendship record exists per directed pair
friendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });
friendshipSchema.index({ recipient: 1, status: 1 });
friendshipSchema.index({ requester: 1, status: 1 });

export const Friendship = model<IFriendship, FriendshipModel>("Friendship", friendshipSchema);
