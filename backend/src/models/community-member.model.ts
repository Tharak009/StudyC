import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";
import { COMMUNITY_ROLES, type CommunityRole } from "../constants/community-roles.js";
import {
  MEMBERSHIP_STATUS,
  type MembershipStatus
} from "../constants/community-membership.js";

export interface ICommunityMember {
  communityId: Types.ObjectId;
  userId: Types.ObjectId;
  role: CommunityRole;
  status: MembershipStatus;
  joinedAt?: Date;
  requestedAt?: Date;
  approvedAt?: Date;
  approvedBy?: Types.ObjectId;
  rejectedAt?: Date;
  rejectedBy?: Types.ObjectId;
  invitedAt?: Date;
  invitedBy?: Types.ObjectId;
  leftAt?: Date;
  bannedAt?: Date;
  bannedBy?: Types.ObjectId;
  banReason?: string;
  suspendedAt?: Date;
  suspendedUntil?: Date;
  suspendedBy?: Types.ObjectId;
  suspensionReason?: string;
  mutedAt?: Date;
  mutedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type CommunityMemberDocument = HydratedDocument<ICommunityMember>;
type CommunityMemberModel = Model<ICommunityMember>;

const communityMemberSchema = new Schema<ICommunityMember, CommunityMemberModel>(
  {
    communityId: { type: Schema.Types.ObjectId, ref: "Community", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: {
      type: String,
      enum: Object.values(COMMUNITY_ROLES),
      default: COMMUNITY_ROLES.MEMBER
    },
    status: {
      type: String,
      enum: Object.values(MEMBERSHIP_STATUS),
      default: MEMBERSHIP_STATUS.ACTIVE,
      index: true
    },
    joinedAt: { type: Date, default: Date.now },
    requestedAt: { type: Date },
    approvedAt: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    rejectedAt: { type: Date },
    rejectedBy: { type: Schema.Types.ObjectId, ref: "User" },
    invitedAt: { type: Date },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User" },
    leftAt: { type: Date },
    bannedAt: { type: Date },
    bannedBy: { type: Schema.Types.ObjectId, ref: "User" },
    banReason: { type: String, trim: true, maxlength: 300 },
    suspendedAt: { type: Date },
    suspendedUntil: { type: Date },
    suspendedBy: { type: Schema.Types.ObjectId, ref: "User" },
    suspensionReason: { type: String, trim: true, maxlength: 300 },
    mutedAt: { type: Date },
    mutedUntil: { type: Date }
  },
  { timestamps: true, versionKey: false }
);

communityMemberSchema.index({ communityId: 1, userId: 1 }, { unique: true });
communityMemberSchema.index({ communityId: 1, status: 1 });
communityMemberSchema.index({ userId: 1, status: 1 });
communityMemberSchema.index({ communityId: 1, role: 1 });

export const CommunityMember = model<ICommunityMember, CommunityMemberModel>(
  "CommunityMember",
  communityMemberSchema
);
