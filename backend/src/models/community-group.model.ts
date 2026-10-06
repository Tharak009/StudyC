import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";
import {
  GROUP_STATUS,
  GROUP_TYPES,
  type GroupStatus,
  type GroupType
} from "../constants/community-group.js";

export interface ICommunityGroup {
  communityId: Types.ObjectId;
  name: string;
  description: string;
  icon?: string;
  type: GroupType;
  streamChannelId: string;
  createdBy: Types.ObjectId;
  status: GroupStatus;
  sortOrder: number;
  isAnnouncement: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type CommunityGroupDocument = HydratedDocument<ICommunityGroup>;
type CommunityGroupModel = Model<ICommunityGroup>;

const communityGroupSchema = new Schema<ICommunityGroup, CommunityGroupModel>(
  {
    communityId: { type: Schema.Types.ObjectId, ref: "Community", required: true, index: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    icon: { type: String, trim: true, default: "" },
    type: {
      type: String,
      enum: Object.values(GROUP_TYPES),
      default: GROUP_TYPES.DISCUSSION,
      index: true
    },
    streamChannelId: { type: String, required: true, unique: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: Object.values(GROUP_STATUS),
      default: GROUP_STATUS.ACTIVE,
      index: true
    },
    sortOrder: { type: Number, default: 0 },
    isAnnouncement: { type: Boolean, default: false, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" }
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

communityGroupSchema.index({ communityId: 1, isDeleted: 1, sortOrder: 1, createdAt: 1 });
communityGroupSchema.index({ communityId: 1, isAnnouncement: 1 });

export const CommunityGroup = model<ICommunityGroup, CommunityGroupModel>(
  "CommunityGroup",
  communityGroupSchema
);
