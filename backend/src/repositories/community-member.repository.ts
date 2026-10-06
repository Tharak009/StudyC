import type { FilterQuery, UpdateQuery } from "mongoose";
import { ACTIVE_MEMBERSHIP_STATUSES, MEMBERSHIP_STATUS } from "../constants/community-membership.js";
import {
  CommunityMember,
  type CommunityMemberDocument,
  type ICommunityMember
} from "../models/community-member.model.js";

export interface ListMembersOptions {
  status?: string | string[];
  page?: number;
  limit?: number;
}

export class CommunityMemberRepository {
  create(input: Partial<ICommunityMember>): Promise<CommunityMemberDocument> {
    return CommunityMember.create(input);
  }

  findMembership(communityId: string, userId: string): Promise<CommunityMemberDocument | null> {
    return CommunityMember.findOne({ communityId, userId }).exec();
  }

  async findByCommunity(communityId: string, options?: ListMembersOptions) {
    const filter: FilterQuery<ICommunityMember> = { communityId };

    if (options?.status) {
      if (Array.isArray(options.status)) {
        filter.status = { $in: options.status };
      } else if (options.status === "ALL") {
        // No status filter
      } else {
        filter.status = options.status;
      }
    } else {
      // Default to active / participating members
      filter.status = { $in: ACTIVE_MEMBERSHIP_STATUSES };
    }

    const query = CommunityMember.find(filter)
      .sort({ role: 1, joinedAt: 1 })
      .populate("userId", "fullName rollNumber department academicYear profilePicture");

    if (options?.page && options?.limit) {
      query.skip((options.page - 1) * options.limit).limit(options.limit);
    }

    return query.exec();
  }

  async findPendingRequests(communityId: string, options?: { page?: number; limit?: number }) {
    const filter: FilterQuery<ICommunityMember> = {
      communityId,
      status: MEMBERSHIP_STATUS.PENDING
    };

    const query = CommunityMember.find(filter)
      .sort({ requestedAt: 1, createdAt: 1 })
      .populate("userId", "fullName rollNumber department academicYear profilePicture");

    if (options?.page && options?.limit) {
      query.skip((options.page - 1) * options.limit).limit(options.limit);
    }

    return query.exec();
  }

  findByUser(userId: string, status?: string | string[]) {
    const filter: FilterQuery<ICommunityMember> = { userId };
    if (status) {
      filter.status = Array.isArray(status) ? { $in: status } : status;
    } else {
      // By default return memberships that represent active participation
      filter.status = { $in: [...ACTIVE_MEMBERSHIP_STATUSES, undefined as any] };
    }
    return CommunityMember.find(filter).select("communityId role status").exec();
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

  countActiveMembers(communityId: string): Promise<number> {
    return CommunityMember.countDocuments({
      communityId,
      status: { $in: ACTIVE_MEMBERSHIP_STATUSES }
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
