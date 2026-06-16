import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";
import { COMMUNITY_ROLES, type CommunityRole } from "../constants/community-roles.js";

export interface ICommunityMember {
  communityId: Types.ObjectId;
  userId: Types.ObjectId;
  role: CommunityRole;
  joinedAt: Date;
}

export type CommunityMemberDocument = HydratedDocument<ICommunityMember>;
type CommunityMemberModel = Model<ICommunityMember>;

const communityMemberSchema = new Schema<ICommunityMember, CommunityMemberModel>(
  {
    communityId: { type: Schema.Types.ObjectId, ref: "Community", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: Object.values(COMMUNITY_ROLES), default: COMMUNITY_ROLES.MEMBER },
    joinedAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

communityMemberSchema.index({ communityId: 1, userId: 1 }, { unique: true });
communityMemberSchema.index({ communityId: 1, role: 1 });

export const CommunityMember = model<ICommunityMember, CommunityMemberModel>(
  "CommunityMember",
  communityMemberSchema
);
