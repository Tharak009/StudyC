import type { Express } from "express";
import { Types } from "mongoose";
import { env } from "../config/env.js";
import {
  ACTIVE_MEMBERSHIP_STATUSES,
  MEMBERSHIP_STATUS,
  isActiveMember,
  isRestrictedMember,
  type MembershipStatus
} from "../constants/community-membership.js";
import { COMMUNITY_ROLES, type CommunityRole } from "../constants/community-roles.js";
import {
  COMMUNITY_STATUS,
  COMMUNITY_VISIBILITY,
  VALID_STATUS_TRANSITIONS,
  isPrivateCommunity,
  type CommunityStatus
} from "../constants/community.js";
import { ROLES } from "../constants/roles.js";
import { AdminLog } from "../models/admin-log.model.js";
import type { CommunityDocument } from "../models/community.model.js";
import {
  communityMemberRepository,
  type CommunityMemberRepository,
  type ListMembersOptions
} from "../repositories/community-member.repository.js";
import {
  communityRepository,
  type CommunityListOptions,
  type CommunityRepository
} from "../repositories/community.repository.js";
import { userRepository, type IUserRepository } from "../repositories/user.repository.js";
import { ApiError } from "../utils/api-error.js";
import type {
  CreateCommunityInput,
  ListCommunitiesQuery,
  UpdateCommunityInput
} from "../validators/community.validator.js";
import { StorageService, sharedStorageService } from "./storage.service.js";
import { streamService } from "./stream.service.js";
import { communityGroupService } from "./community-group.service.js";

export class CommunityService {
  constructor(
    private readonly communities: CommunityRepository,
    private readonly members: CommunityMemberRepository,
    private readonly users: IUserRepository,
    private readonly storage: StorageService
  ) {}

  async create(input: CreateCommunityInput, ownerId: string, banner?: Express.Multer.File) {
    await this.assertNameAvailable(input.name);
    const bannerImage = banner ? (await this.storage.uploadCommunityBanner(banner)).url : undefined;
    const slug = await this.uniqueSlug(input.name);

    const community = await this.communities.create({
      ...input,
      slug,
      owner: ownerId,
      bannerImage,
      banner: bannerImage,
      status: input.status ?? COMMUNITY_STATUS.ACTIVE,
      memberCount: 1
    });

    await this.members.create({
      communityId: community._id,
      userId: new Types.ObjectId(ownerId),
      role: COMMUNITY_ROLES.OWNER,
      status: MEMBERSHIP_STATUS.ACTIVE,
      joinedAt: new Date()
    });

    // Audit log
    await this.logAdminAction(ownerId, "CREATE_COMMUNITY", community._id.toString(), {
      name: community.name,
      slug: community.slug,
      category: community.category,
      type: community.type,
      visibility: community.visibility,
      status: community.status
    });

    // Automatically establish the dedicated Announcements space for the new community
    try {
      await communityGroupService.ensureAnnouncementGroup(community._id.toString(), ownerId);
    } catch (err) {
      console.warn(`Could not automatically create announcement group for community ${community._id}:`, err);
    }

    return this.withViewerState(community, ownerId, COMMUNITY_ROLES.OWNER, MEMBERSHIP_STATUS.ACTIVE);
  }

  async list(query: ListCommunitiesQuery, viewerId: string) {
    const memberships = await this.members.findByUser(viewerId, ACTIVE_MEMBERSHIP_STATUSES);
    const options: CommunityListOptions = {
      search: query.search,
      category: query.category,
      type: query.type,
      status: query.status,
      visibleCommunityIds: memberships.map((membership) => membership.communityId.toString()),
      page: query.page,
      limit: query.limit
    };
    const result = await this.communities.list(options);
    const items = await Promise.all(
      result.items.map((community) => this.withViewerState(community, viewerId))
    );
    return { ...result, items };
  }

  async details(id: string, viewerId: string) {
    const community = await this.requireCommunity(id);
    if (!community.announcementGroupId && !community.isDeleted) {
      await communityGroupService
        .ensureAnnouncementGroup(community._id.toString(), community.owner.toString())
        .catch(() => {});
    }
    return this.withViewerState(community, viewerId);
  }

  async update(
    id: string,
    input: UpdateCommunityInput,
    actorId: string,
    actorRole?: string,
    banner?: Express.Multer.File
  ) {
    const community = await this.requireCommunity(id);
    await this.assertOwner(community, actorId, actorRole);

    if (input.name && input.name.toLowerCase() !== community.name.toLowerCase()) {
      await this.assertNameAvailable(input.name);
    }

    if (input.status && input.status !== community.status) {
      this.assertValidTransition(community.status, input.status as CommunityStatus);
    }

    const nextBanner = banner ? await this.storage.uploadCommunityBanner(banner) : undefined;
    const update: Record<string, unknown> = {
      ...input,
      ...(input.name && { slug: await this.uniqueSlug(input.name, community._id.toString()) }),
      ...(nextBanner && { bannerImage: nextBanner.url, banner: nextBanner.url })
    };

    const updated = await this.communities.updateById(id, { $set: update });
    if (!updated) throw new ApiError(404, "Community not found", [], "COMMUNITY_NOT_FOUND");

    if (nextBanner && community.bannerImage) {
      await this.storage.delete(community.bannerImage.replace(/^\/uploads\//, "")).catch(() => {});
    }

    // Audit log
    await this.logAdminAction(actorId, "UPDATE_COMMUNITY", id, {
      changedFields: Object.keys(input),
      newStatus: input.status
    });

    return this.withViewerState(updated, actorId);
  }

  async archive(id: string, actorId: string, actorRole?: string) {
    const community = await this.requireCommunity(id);
    await this.assertOwner(community, actorId, actorRole);

    this.assertValidTransition(community.status, COMMUNITY_STATUS.ARCHIVED);

    const updated = await this.communities.archive(id, actorId);
    if (!updated) throw new ApiError(404, "Community not found", [], "COMMUNITY_NOT_FOUND");

    await this.logAdminAction(actorId, "ARCHIVE_COMMUNITY", id, {
      name: community.name,
      slug: community.slug,
      previousStatus: community.status
    });

    return this.withViewerState(updated, actorId);
  }

  async restore(id: string, actorId: string, actorRole?: string) {
    const community = await this.requireCommunity(id);
    await this.assertOwner(community, actorId, actorRole);

    this.assertValidTransition(community.status, COMMUNITY_STATUS.ACTIVE);

    const updated = await this.communities.restore(id);
    if (!updated) throw new ApiError(404, "Community not found", [], "COMMUNITY_NOT_FOUND");

    await this.logAdminAction(actorId, "RESTORE_COMMUNITY", id, {
      name: community.name,
      slug: community.slug,
      previousStatus: community.status
    });

    return this.withViewerState(updated, actorId);
  }

  async delete(id: string, actorId: string, actorRole?: string) {
    const community = await this.requireCommunity(id);
    await this.assertOwner(community, actorId, actorRole);

    this.assertValidTransition(community.status, COMMUNITY_STATUS.DELETED);

    // Safe Soft Delete: preserve members and Stream Chat channels
    await this.communities.softDelete(id, actorId);

    await this.logAdminAction(actorId, "DELETE_COMMUNITY", id, {
      name: community.name,
      slug: community.slug,
      softDelete: true
    });
  }

  async join(id: string, userId: string) {
    const community = await this.requireCommunity(id);
    if (community.status === COMMUNITY_STATUS.ARCHIVED) {
      throw new ApiError(400, "Cannot join an archived community", [], "COMMUNITY_ARCHIVED");
    }

    const existing = await this.members.findMembership(id, userId);
    if (existing?.status === MEMBERSHIP_STATUS.BANNED) {
      throw new ApiError(403, "You have been banned from this community", [], "MEMBER_BANNED");
    }
    if (existing?.status === MEMBERSHIP_STATUS.SUSPENDED) {
      if (existing.suspendedUntil && new Date() <= new Date(existing.suspendedUntil)) {
        throw new ApiError(
          403,
          `Your membership is suspended until ${new Date(existing.suspendedUntil).toLocaleString()}`,
          [],
          "MEMBER_SUSPENDED"
        );
      }
    }
    // Existing active members can safely retry synchronization even in private
    // communities, where new direct joins remain disallowed below.
    if (existing && isActiveMember(existing.status)) {
      await this.syncMemberToStreamChannels(id, userId, existing.role);
      return this.withViewerState(community, userId, existing.role, existing.status);
    }

    // Access policy enforcement
    if (community.visibility === COMMUNITY_VISIBILITY.INVITE_ONLY) {
      throw new ApiError(400, "This community is invite-only and cannot be joined directly", [], "INVITE_ONLY_COMMUNITY");
    }

    if (isPrivateCommunity(community.visibility)) {
      throw new ApiError(
        400,
        "This is a private community. Please submit a join request instead.",
        [],
        "JOIN_REQUEST_REQUIRED"
      );
    }

    if (community.visibility === COMMUNITY_VISIBILITY.COLLEGE_ONLY) {
      await this.assertCollegeEligible(userId, community);
    }

    if (existing) {
      if (existing.status === MEMBERSHIP_STATUS.PENDING) {
        return this.withViewerState(community, userId, existing.role, existing.status);
      }

      // Rejoining from LEFT or expired suspension
      await this.members.updateMembership(id, userId, {
        $set: {
          status: MEMBERSHIP_STATUS.ACTIVE,
          role: existing.role === COMMUNITY_ROLES.OWNER ? COMMUNITY_ROLES.OWNER : COMMUNITY_ROLES.MEMBER,
          joinedAt: new Date()
        },
        $unset: { leftAt: 1, suspendedAt: 1, suspendedUntil: 1, suspensionReason: 1 }
      });
      const updated = await this.communities.incrementMemberCount(id, 1);

      const role = existing.role === COMMUNITY_ROLES.OWNER
        ? COMMUNITY_ROLES.OWNER
        : COMMUNITY_ROLES.MEMBER;
      await this.syncMemberToStreamChannels(id, userId, role);

      return this.withViewerState(updated ?? community, userId, role, MEMBERSHIP_STATUS.ACTIVE);
    }

    // New membership
    await this.members.create({
      communityId: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
      role: COMMUNITY_ROLES.MEMBER,
      status: MEMBERSHIP_STATUS.ACTIVE,
      joinedAt: new Date()
    });
    const updated = await this.communities.incrementMemberCount(id, 1);

    await this.syncMemberToStreamChannels(id, userId, COMMUNITY_ROLES.MEMBER);

    return this.withViewerState(updated ?? community, userId, COMMUNITY_ROLES.MEMBER, MEMBERSHIP_STATUS.ACTIVE);
  }

  async requestJoin(id: string, userId: string, note?: string) {
    const community = await this.requireCommunity(id);
    if (community.status === COMMUNITY_STATUS.ARCHIVED) {
      throw new ApiError(400, "Cannot request to join an archived community", [], "COMMUNITY_ARCHIVED");
    }

    if (community.visibility === COMMUNITY_VISIBILITY.INVITE_ONLY) {
      throw new ApiError(
        400,
        "This community is invite-only and does not accept join requests",
        [],
        "INVITE_ONLY_COMMUNITY"
      );
    }

    if (community.visibility === COMMUNITY_VISIBILITY.COLLEGE_ONLY) {
      await this.assertCollegeEligible(userId, community);
    }

    const existing = await this.members.findMembership(id, userId);
    if (existing) {
      if (existing.status === MEMBERSHIP_STATUS.BANNED) {
        throw new ApiError(403, "You have been banned from this community", [], "MEMBER_BANNED");
      }

      if (existing.status === MEMBERSHIP_STATUS.SUSPENDED) {
        if (existing.suspendedUntil && new Date() <= new Date(existing.suspendedUntil)) {
          throw new ApiError(
            403,
            `Your membership is suspended until ${new Date(existing.suspendedUntil).toLocaleString()}`,
            [],
            "MEMBER_SUSPENDED"
          );
        }
      }

      if (isActiveMember(existing.status)) {
        throw new ApiError(400, "You are already a member of this community", [], "ALREADY_MEMBER");
      }

      if (existing.status === MEMBERSHIP_STATUS.PENDING) {
        throw new ApiError(400, "You already have a pending join request", [], "REQUEST_ALREADY_PENDING");
      }

      // Transition from LEFT or other non-active state
      await this.members.updateMembership(id, userId, {
        $set: {
          status: MEMBERSHIP_STATUS.PENDING,
          requestedAt: new Date()
        },
        $unset: { leftAt: 1, rejectedAt: 1, rejectedBy: 1 }
      });
      return this.withViewerState(community, userId, COMMUNITY_ROLES.MEMBER, MEMBERSHIP_STATUS.PENDING);
    }

    // New membership with status PENDING
    await this.members.create({
      communityId: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
      role: COMMUNITY_ROLES.MEMBER,
      status: MEMBERSHIP_STATUS.PENDING,
      requestedAt: new Date()
    });

    return this.withViewerState(community, userId, COMMUNITY_ROLES.MEMBER, MEMBERSHIP_STATUS.PENDING);
  }

  async cancelJoinRequest(id: string, userId: string) {
    await this.requireCommunity(id);
    const existing = await this.members.findMembership(id, userId);
    if (!existing || existing.status !== MEMBERSHIP_STATUS.PENDING) {
      throw new ApiError(400, "No pending join request found to cancel", [], "NO_PENDING_REQUEST");
    }

    await this.members.updateMembership(id, userId, {
      $set: {
        status: MEMBERSHIP_STATUS.LEFT,
        leftAt: new Date()
      },
      $unset: { requestedAt: 1 }
    });

    const community = await this.requireCommunity(id);
    return this.withViewerState(community, userId, null, MEMBERSHIP_STATUS.LEFT);
  }

  async listPendingRequests(
    id: string,
    actorId: string,
    actorRole?: string,
    options?: { page?: number; limit?: number }
  ) {
    const community = await this.requireCommunity(id);
    await this.requireManager(id, actorId, actorRole);
    return this.members.findPendingRequests(id, options);
  }

  async approveJoinRequest(id: string, targetUserId: string, actorId: string, actorRole?: string) {
    const community = await this.requireCommunity(id);
    await this.requireManager(id, actorId, actorRole);

    const membership = await this.members.findMembership(id, targetUserId);
    if (membership && isActiveMember(membership.status)) {
      // An approval retry after a partial Stream failure only re-synchronizes;
      // it does not increment the member count or write another approval.
      await this.syncMemberToStreamChannels(id, targetUserId, membership.role);
      return { message: "Join request is approved and chat access is synchronized" };
    }
    if (!membership || membership.status !== MEMBERSHIP_STATUS.PENDING) {
      throw new ApiError(400, "No pending join request found for this user", [], "NO_PENDING_REQUEST");
    }

    await this.members.updateMembership(id, targetUserId, {
      $set: {
        status: MEMBERSHIP_STATUS.ACTIVE,
        role: COMMUNITY_ROLES.MEMBER,
        approvedAt: new Date(),
        approvedBy: new Types.ObjectId(actorId),
        joinedAt: new Date()
      },
      $unset: { requestedAt: 1, rejectedAt: 1, rejectedBy: 1 }
    });

    await this.communities.incrementMemberCount(id, 1);

    // Sync user into Stream Chat community channels
    await this.syncMemberToStreamChannels(id, targetUserId, COMMUNITY_ROLES.MEMBER);

    await this.logAdminAction(actorId, "APPROVE_JOIN_REQUEST", id, {
      targetUserId,
      communityName: community.name
    });

    return { message: "Join request approved successfully" };
  }

  async rejectJoinRequest(id: string, targetUserId: string, actorId: string, actorRole?: string) {
    const community = await this.requireCommunity(id);
    await this.requireManager(id, actorId, actorRole);

    const membership = await this.members.findMembership(id, targetUserId);
    if (!membership || membership.status !== MEMBERSHIP_STATUS.PENDING) {
      throw new ApiError(400, "No pending join request found for this user", [], "NO_PENDING_REQUEST");
    }

    await this.members.updateMembership(id, targetUserId, {
      $set: {
        status: MEMBERSHIP_STATUS.LEFT,
        rejectedAt: new Date(),
        rejectedBy: new Types.ObjectId(actorId)
      },
      $unset: { requestedAt: 1 }
    });

    await this.logAdminAction(actorId, "REJECT_JOIN_REQUEST", id, {
      targetUserId,
      communityName: community.name
    });

    return { message: "Join request rejected successfully" };
  }

  async leave(id: string, userId: string) {
    const community = await this.requireCommunity(id);
    const membership = await this.members.findMembership(id, userId);
    if (membership?.status === MEMBERSHIP_STATUS.LEFT) {
      await this.syncMemberRemovalFromStreamChannels(id, userId, "left");
      return { message: "Left community successfully" };
    }
    if (!membership || !isActiveMember(membership.status)) {
      throw new ApiError(404, "You are not an active member of this community", [], "MEMBERSHIP_NOT_FOUND");
    }

    const isOwner =
      membership.role === COMMUNITY_ROLES.OWNER ||
      community.owner.toString() === userId ||
      (community.owner as any)?._id?.toString() === userId;

    if (isOwner) {
      throw new ApiError(
        400,
        "Owners cannot leave the community. You must transfer ownership or delete the community.",
        [],
        "OWNER_CANNOT_LEAVE"
      );
    }

    await this.members.updateMembership(id, userId, {
      $set: {
        status: MEMBERSHIP_STATUS.LEFT,
        leftAt: new Date()
      }
    });

    if (membership.role === COMMUNITY_ROLES.MODERATOR) {
      await this.communities.updateById(id, { $pull: { moderators: new Types.ObjectId(userId) } });
    }

    await this.communities.incrementMemberCount(id, -1);

    await this.syncMemberRemovalFromStreamChannels(id, userId, "left");

    return { message: "Left community successfully" };
  }

  async banMember(
    id: string,
    targetUserId: string,
    actorId: string,
    actorRole?: string,
    reason?: string
  ) {
    const community = await this.requireCommunity(id);
    await this.assertOwner(community, actorId, actorRole);

    if (targetUserId === actorId) {
      throw new ApiError(400, "You cannot ban yourself", [], "CANNOT_BAN_SELF");
    }

    const isTargetOwner =
      community.owner.toString() === targetUserId ||
      (community.owner as any)?._id?.toString() === targetUserId;

    if (isTargetOwner) {
      throw new ApiError(400, "The community owner cannot be banned", [], "CANNOT_BAN_OWNER");
    }

    const membership = await this.members.findMembership(id, targetUserId);
    if (!membership) {
      throw new ApiError(404, "Member not found", [], "MEMBER_NOT_FOUND");
    }

    if (membership.status === MEMBERSHIP_STATUS.BANNED) {
      await this.syncMemberRemovalFromStreamChannels(id, targetUserId, "banned");
      return { message: "Member remains banned and Stream access is synchronized" };
    }

    const wasActive = isActiveMember(membership.status);

    await this.members.updateMembership(id, targetUserId, {
      $set: {
        status: MEMBERSHIP_STATUS.BANNED,
        bannedAt: new Date(),
        bannedBy: new Types.ObjectId(actorId),
        banReason: reason
      }
    });

    if (membership.role === COMMUNITY_ROLES.MODERATOR) {
      await this.communities.updateById(id, { $pull: { moderators: new Types.ObjectId(targetUserId) } });
    }

    if (wasActive) {
      await this.communities.incrementMemberCount(id, -1);
    }

    await this.logAdminAction(actorId, "BAN_MEMBER", id, {
      targetUserId,
      reason,
      communityName: community.name
    });

    await this.syncMemberRemovalFromStreamChannels(id, targetUserId, "banned");

    return { message: "Member banned successfully" };
  }

  async unbanMember(id: string, targetUserId: string, actorId: string, actorRole?: string) {
    const community = await this.requireCommunity(id);
    await this.assertOwner(community, actorId, actorRole);

    const membership = await this.members.findMembership(id, targetUserId);
    if (!membership || membership.status !== MEMBERSHIP_STATUS.BANNED) {
      throw new ApiError(400, "Member is not currently banned", [], "NOT_BANNED");
    }

    // Keep the ban in MongoDB until Stream revocation succeeds, so an unban
    // cannot clear the retryable restriction while channel access remains.
    await this.syncMemberRemovalFromStreamChannels(id, targetUserId, "banned");

    await this.members.updateMembership(id, targetUserId, {
      $set: {
        status: MEMBERSHIP_STATUS.LEFT
      },
      $unset: { bannedAt: 1, bannedBy: 1, banReason: 1 }
    });

    await this.logAdminAction(actorId, "UNBAN_MEMBER", id, {
      targetUserId,
      communityName: community.name
    });

    return { message: "Member unbanned successfully" };
  }

  async suspendMember(
    id: string,
    targetUserId: string,
    actorId: string,
    actorRole?: string,
    durationHours: number = 24,
    reason?: string
  ) {
    const community = await this.requireCommunity(id);
    await this.requireManager(id, actorId, actorRole);

    if (targetUserId === actorId) {
      throw new ApiError(400, "You cannot suspend yourself", [], "CANNOT_SUSPEND_SELF");
    }

    const isTargetOwner =
      community.owner.toString() === targetUserId ||
      (community.owner as any)?._id?.toString() === targetUserId;

    if (isTargetOwner) {
      throw new ApiError(400, "The community owner cannot be suspended", [], "CANNOT_SUSPEND_OWNER");
    }

    const membership = await this.members.findMembership(id, targetUserId);
    if (!membership) {
      throw new ApiError(404, "Member not found", [], "MEMBER_NOT_FOUND");
    }

    // Moderators cannot suspend other moderators or the owner
    if (actorRole !== ROLES.ADMIN) {
      const actorMembership = await this.members.findMembership(id, actorId);
      if (
        actorMembership?.role === COMMUNITY_ROLES.MODERATOR &&
        (membership.role === COMMUNITY_ROLES.MODERATOR || membership.role === COMMUNITY_ROLES.OWNER)
      ) {
        throw new ApiError(
          403,
          "Moderators cannot suspend other moderators or the community owner",
          [],
          "INSUFFICIENT_PERMISSIONS"
        );
      }
    }

    if (membership.status === MEMBERSHIP_STATUS.SUSPENDED) {
      await this.syncMemberRemovalFromStreamChannels(id, targetUserId, "suspended");
      return { message: "Member remains suspended and Stream access is synchronized", suspendedUntil: membership.suspendedUntil };
    }

    const wasActive = isActiveMember(membership.status);
    const suspendedUntil = new Date(Date.now() + durationHours * 3600 * 1000);

    await this.members.updateMembership(id, targetUserId, {
      $set: {
        status: MEMBERSHIP_STATUS.SUSPENDED,
        suspendedAt: new Date(),
        suspendedUntil,
        suspendedBy: new Types.ObjectId(actorId),
        suspensionReason: reason
      }
    });

    if (membership.role === COMMUNITY_ROLES.MODERATOR) {
      await this.communities.updateById(id, { $pull: { moderators: new Types.ObjectId(targetUserId) } });
    }

    if (wasActive) {
      await this.communities.incrementMemberCount(id, -1);
    }

    await this.logAdminAction(actorId, "SUSPEND_MEMBER", id, {
      targetUserId,
      durationHours,
      suspendedUntil,
      reason,
      communityName: community.name
    });

    await this.syncMemberRemovalFromStreamChannels(id, targetUserId, "suspended");

    return { message: "Member suspended successfully", suspendedUntil };
  }

  async membersList(id: string, actorId: string, options?: ListMembersOptions) {
    await this.requireCommunity(id);
    await this.requireMembership(id, actorId);
    return this.members.findByCommunity(id, options);
  }

  async getMembership(id: string, userId: string) {
    await this.requireCommunity(id);
    return this.members.findMembership(id, userId);
  }

  async addModerator(id: string, userId: string, actorId: string, actorRole?: string) {
    const community = await this.requireCommunity(id);
    await this.assertOwner(community, actorId, actorRole);
    if (community.owner.toString() === userId) {
      throw new ApiError(400, "The owner already has full community permissions", [], "OWNER_ALREADY_PRIVILEGED");
    }
    await this.assertUserExists(userId);
    const membership = await this.members.findMembership(id, userId);
    if (!membership) {
      await this.members.create({
        communityId: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
        role: COMMUNITY_ROLES.MODERATOR,
        status: MEMBERSHIP_STATUS.ACTIVE,
        joinedAt: new Date()
      });
      await this.communities.incrementMemberCount(id, 1);
    } else {
      const wasActive = isActiveMember(membership.status);
      await this.members.updateMembership(id, userId, {
        $set: {
          role: COMMUNITY_ROLES.MODERATOR,
          status: MEMBERSHIP_STATUS.ACTIVE,
          joinedAt: membership.joinedAt ?? new Date()
        },
        $unset: { leftAt: 1, bannedAt: 1, bannedBy: 1, banReason: 1, suspendedAt: 1, suspendedUntil: 1 }
      });
      if (!wasActive) {
        await this.communities.incrementMemberCount(id, 1);
      }
    }
    await this.communities.updateById(id, { $addToSet: { moderators: new Types.ObjectId(userId) } });

    // Update member's channel role in Stream community channels
    await this.syncMemberToStreamChannels(id, userId, COMMUNITY_ROLES.MODERATOR);

    return this.members.findByCommunity(id);
  }

  async removeModerator(id: string, userId: string, actorId: string, actorRole?: string) {
    const community = await this.requireCommunity(id);
    await this.assertOwner(community, actorId, actorRole);
    const membership = await this.members.findMembership(id, userId);
    if (!membership) {
      throw new ApiError(404, "Moderator membership not found", [], "MODERATOR_NOT_FOUND");
    }
    if (membership.role !== COMMUNITY_ROLES.MODERATOR) {
      if (membership.role === COMMUNITY_ROLES.MEMBER && isActiveMember(membership.status)) {
        await this.syncMemberToStreamChannels(id, userId, COMMUNITY_ROLES.MEMBER);
        return this.members.findByCommunity(id);
      }
      throw new ApiError(404, "Moderator membership not found", [], "MODERATOR_NOT_FOUND");
    }
    await this.members.updateMembership(id, userId, { $set: { role: COMMUNITY_ROLES.MEMBER } });
    await this.communities.updateById(id, { $pull: { moderators: new Types.ObjectId(userId) } });

    // Revert member's channel role to normal member in Stream
    await this.syncMemberToStreamChannels(id, userId, COMMUNITY_ROLES.MEMBER);

    return this.members.findByCommunity(id);
  }

  async removeMember(id: string, userId: string, actorId: string, actorRole?: string) {
    const community = await this.requireCommunity(id);
    await this.requireManager(id, actorId, actorRole);
    const membership = await this.members.findMembership(id, userId);
    if (!membership) throw new ApiError(404, "Community member not found", [], "MEMBER_NOT_FOUND");
    if (
      membership.role === COMMUNITY_ROLES.OWNER ||
      community.owner.toString() === userId ||
      (community.owner as any)?._id?.toString() === userId
    ) {
      throw new ApiError(400, "The owner cannot be removed", [], "OWNER_CANNOT_BE_REMOVED");
    }

    // Moderator cannot remove other moderators
    if (actorRole !== ROLES.ADMIN) {
      const actorMembership = await this.members.findMembership(id, actorId);
      if (actorMembership?.role === COMMUNITY_ROLES.MODERATOR && membership.role === COMMUNITY_ROLES.MODERATOR) {
        throw new ApiError(403, "Moderators cannot remove other moderators", [], "INSUFFICIENT_PERMISSIONS");
      }
    }

    const wasActive = isActiveMember(membership.status);

    await this.members.updateMembership(id, userId, {
      $set: {
        status: MEMBERSHIP_STATUS.LEFT,
        leftAt: new Date()
      }
    });
    await this.communities.updateById(id, { $pull: { moderators: new Types.ObjectId(userId) } });

    if (wasActive) {
      await this.communities.incrementMemberCount(id, -1);
    }

    await this.syncMemberRemovalFromStreamChannels(id, userId, "removed");

    return this.members.findByCommunity(id);
  }

  private async requireCommunity(id: string) {
    const community = await this.communities.findById(id);
    if (!community || community.isDeleted) {
      throw new ApiError(404, "Community not found", [], "COMMUNITY_NOT_FOUND");
    }
    return community;
  }

  private async syncMemberToStreamChannels(
    communityId: string,
    userId: string,
    role: CommunityRole
  ): Promise<void> {
    try {
      await streamService.addMemberToCommunityChannels(communityId, userId, role);
    } catch (err) {
      const detail = err instanceof Error ? ` ${err.message}` : "";
      console.error(
        `[CommunityService] Community ${communityId} membership for ${userId} is saved, but Stream channel synchronization failed.${detail}`
      );
      throw new ApiError(
        503,
        `Community membership is saved, but chat access could not be synchronized. Retry the membership action to try again.${detail}`,
        [],
        "COMMUNITY_CHAT_SYNC_FAILED"
      );
    }
  }

  private async syncMemberRemovalFromStreamChannels(
    communityId: string,
    userId: string,
    membershipAction: "left" | "removed" | "banned" | "suspended"
  ): Promise<void> {
    try {
      await streamService.removeMemberFromCommunityChannels(communityId, userId);
    } catch (err) {
      const detail = err instanceof Error ? ` ${err.message}` : "";
      console.error(
        `[CommunityService] Member ${userId} is ${membershipAction} in community ${communityId}, but Stream removal synchronization failed.${detail}`
      );
      throw new ApiError(
        503,
        `Community membership is ${membershipAction}, but Stream access removal is incomplete. Retry this membership action to try again.${detail}`,
        [],
        "COMMUNITY_CHAT_SYNC_FAILED"
      );
    }
  }

  private async requireMembership(id: string, userId: string) {
    const membership = await this.members.findMembership(id, userId);
    if (!membership || !isActiveMember(membership.status)) {
      if (membership && isRestrictedMember(membership.status)) {
        throw new ApiError(403, `Access restricted (${membership.status})`, [], "MEMBERSHIP_RESTRICTED");
      }
      throw new ApiError(403, "Active community membership is required", [], "MEMBERSHIP_REQUIRED");
    }
    return membership;
  }

  private async assertOwner(community: CommunityDocument, userId: string, role?: string) {
    if (role === ROLES.ADMIN) return;

    const isDirectOwner =
      community.owner.toString() === userId ||
      (community.owner as any)?._id?.toString() === userId;
    if (isDirectOwner) return;

    const membership = await this.members.findMembership(community._id.toString(), userId);
    if (membership?.role === COMMUNITY_ROLES.OWNER) return;

    throw new ApiError(403, "Only the community owner can perform this action", [], "OWNER_REQUIRED");
  }

  private async requireManager(id: string, userId: string, actorRole?: string) {
    if (actorRole === ROLES.ADMIN) return;
    const membership = await this.requireMembership(id, userId);
    if (membership.role !== COMMUNITY_ROLES.OWNER && membership.role !== COMMUNITY_ROLES.MODERATOR) {
      throw new ApiError(403, "Owner or moderator permissions are required", [], "MANAGER_REQUIRED");
    }
    return membership;
  }

  private async assertCollegeEligible(userId: string, community: CommunityDocument) {
    const user = await this.users.findById(userId);
    if (!user) throw new ApiError(404, "User not found", [], "USER_NOT_FOUND");

    const userDomain = user.email.split("@")[1]?.toLowerCase();
    const isApprovedDomain = userDomain && env.approvedEmailDomains.includes(userDomain);
    const hasCollegeCredentials = Boolean(user.rollNumber && user.department);

    if (!isApprovedDomain && !hasCollegeCredentials) {
      throw new ApiError(
        403,
        "You must have a verified college email domain or student credentials to join this community",
        [],
        "COLLEGE_VERIFICATION_REQUIRED"
      );
    }
  }

  private assertValidTransition(current: CommunityStatus, target: CommunityStatus) {
    const allowed = VALID_STATUS_TRANSITIONS[current] || [];
    if (!allowed.includes(target)) {
      throw new ApiError(
        400,
        `Cannot transition community status from ${current} to ${target}`,
        [],
        "INVALID_STATUS_TRANSITION"
      );
    }
  }

  private async assertUserExists(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new ApiError(404, "User not found", [], "USER_NOT_FOUND");
  }

  private async assertNameAvailable(name: string) {
    if (await this.communities.findByName(name)) {
      throw new ApiError(409, "A community with this name already exists", [], "COMMUNITY_NAME_EXISTS");
    }
  }

  private async uniqueSlug(name: string, currentId?: string) {
    const base = slugify(name);
    let slug = base || "community";
    let suffix = 1;
    while (true) {
      const existing = await this.communities.findBySlug(slug);
      if (!existing || existing._id.toString() === currentId) return slug;
      suffix += 1;
      slug = `${base}-${suffix}`;
    }
  }

  private async logAdminAction(
    actorId: string,
    action: string,
    targetId: string,
    details: Record<string, unknown>
  ) {
    try {
      await AdminLog.create({
        adminId: new Types.ObjectId(actorId),
        action,
        targetType: "Community",
        targetId,
        details
      });
    } catch {
      // Non-blocking audit log
    }
  }

  private async withViewerState(
    community: CommunityDocument,
    viewerId: string,
    role?: CommunityRole | null,
    status?: MembershipStatus | null
  ) {
    let membershipRole = role;
    let membershipStatus = status;

    if (membershipRole === undefined || membershipStatus === undefined) {
      const membership = await this.members.findMembership(community._id.toString(), viewerId);
      membershipRole = membership?.role ?? null;
      membershipStatus = membership?.status ?? null;
    }

    // Check if suspended membership has expired
    let isSuspended = membershipStatus === MEMBERSHIP_STATUS.SUSPENDED;
    if (isSuspended) {
      const membership = await this.members.findMembership(community._id.toString(), viewerId);
      if (membership?.suspendedUntil && new Date() > new Date(membership.suspendedUntil)) {
        isSuspended = false;
        membershipStatus = MEMBERSHIP_STATUS.LEFT;
      }
    }

    const isBanned = membershipStatus === MEMBERSHIP_STATUS.BANNED;
    const isPending = membershipStatus === MEMBERSHIP_STATUS.PENDING;
    const isMember = Boolean(isActiveMember(membershipStatus));

    const json = community.toJSON();
    const ownerId = community.owner
      ? (community.owner as any)._id
        ? (community.owner as any)._id.toString()
        : community.owner.toString()
      : undefined;

    return {
      ...json,
      ownerId,
      membershipRole,
      membershipStatus,
      isMember,
      isPending,
      isBanned,
      isSuspended
    };
  }
}

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

export const communityService = new CommunityService(
  communityRepository,
  communityMemberRepository,
  userRepository,
  sharedStorageService
);
