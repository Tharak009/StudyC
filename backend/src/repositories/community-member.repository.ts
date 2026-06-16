import type { FilterQuery, UpdateQuery } from "mongoose";
import { CommunityMember, type CommunityMemberDocument, type ICommunityMember } from "../models/community-member.model.js";

export class CommunityMemberRepository {
  create(input: Pick<ICommunityMember, "communityId" | "userId" | "role">): Promise<CommunityMemberDocument> {
    return CommunityMember.create(input);
  }

  findMembership(communityId: string, userId: string): Promise<CommunityMemberDocument | null> {
    return CommunityMember.findOne({ communityId, userId }).exec();
  }

  findByCommunity(communityId: string) {
    return CommunityMember.find({ communityId })
      .sort({ role: 1, joinedAt: 1 })
      .populate("userId", "fullName rollNumber department academicYear profilePicture")
      .exec();
  }

  findByUser(userId: string) {
    return CommunityMember.find({ userId }).select("communityId role").exec();
  }

  updateMembership(
    communityId: string,
    userId: string,
    update: UpdateQuery<ICommunityMember>
  ): Promise<CommunityMemberDocument | null> {
    return CommunityMember.findOneAndUpdate({ communityId, userId }, update, {
      new: true,
      runValidators: true
    }).exec();
  }

  deleteMembership(communityId: string, userId: string): Promise<CommunityMemberDocument | null> {
    return CommunityMember.findOneAndDelete({ communityId, userId }).exec();
  }

  deleteMany(filter: FilterQuery<ICommunityMember>) {
    return CommunityMember.deleteMany(filter).exec();
  }
}

export const communityMemberRepository = new CommunityMemberRepository();
