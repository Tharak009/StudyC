import type { Express } from "express";
import { Types } from "mongoose";
import { COMMUNITY_ROLES, type CommunityRole } from "../constants/community-roles.js";
import { COMMUNITY_VISIBILITY } from "../constants/community.js";
import type { CommunityDocument } from "../models/community.model.js";
import { communityMemberRepository, type CommunityMemberRepository } from "../repositories/community-member.repository.js";
import { communityRepository, type CommunityListOptions, type CommunityRepository } from "../repositories/community.repository.js";
import { userRepository, type IUserRepository } from "../repositories/user.repository.js";
import { LocalStorageProvider } from "../uploads/local-storage.provider.js";
import { ApiError } from "../utils/api-error.js";
import type { CreateCommunityInput, ListCommunitiesQuery, UpdateCommunityInput } from "../validators/community.validator.js";
import { StorageService } from "./storage.service.js";

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
    const community = await this.communities.create({
      ...input,
      slug: await this.uniqueSlug(input.name),
      owner: ownerId,
      bannerImage,
      memberCount: 1
    });

    await this.members.create({
      communityId: community._id,
      userId: new Types.ObjectId(ownerId),
      role: COMMUNITY_ROLES.OWNER
    });
    return this.withViewerState(community, ownerId);
  }

  async list(query: ListCommunitiesQuery, viewerId: string) {
    const memberships = await this.members.findByUser(viewerId);
    const options: CommunityListOptions = {
      search: query.search,
      category: query.category,
      visibleCommunityIds: memberships.map((membership) => membership.communityId.toString()),
      page: query.page,
      limit: query.limit
    };
    const result = await this.communities.list(options);
    const items = await Promise.all(result.items.map((community) => this.withViewerState(community, viewerId)));
    return { ...result, items };
  }

  async details(id: string, viewerId: string) {
    const community = await this.requireCommunity(id);
    const viewerMembership = await this.members.findMembership(id, viewerId);
    if (community.visibility === COMMUNITY_VISIBILITY.PRIVATE && !viewerMembership) {
      throw new ApiError(403, "This private community is available to members only", [], "PRIVATE_COMMUNITY");
    }
    return this.withViewerState(community, viewerId, viewerMembership?.role);
  }

  async update(id: string, input: UpdateCommunityInput, actorId: string, banner?: Express.Multer.File) {
    const community = await this.requireCommunity(id);
    await this.assertOwner(community._id.toString(), actorId);
    if (input.name && input.name.toLowerCase() !== community.name.toLowerCase()) {
      await this.assertNameAvailable(input.name);
    }

    const nextBanner = banner ? await this.storage.uploadCommunityBanner(banner) : undefined;
    const update = {
      ...input,
      ...(input.name && { slug: await this.uniqueSlug(input.name, community._id.toString()) }),
      ...(nextBanner && { bannerImage: nextBanner.url })
    };
    const updated = await this.communities.updateById(id, { $set: update });
    if (!updated) throw new ApiError(404, "Community not found", [], "COMMUNITY_NOT_FOUND");

    if (nextBanner && community.bannerImage) {
      await this.storage.delete(community.bannerImage.replace(/^\/uploads\//, ""));
    }
    return this.withViewerState(updated, actorId, COMMUNITY_ROLES.OWNER);
  }

  async delete(id: string, actorId: string) {
    const community = await this.requireCommunity(id);
    await this.assertOwner(id, actorId);
    await this.members.deleteMany({ communityId: community._id });
    await this.communities.deleteById(id);
    if (community.bannerImage) await this.storage.delete(community.bannerImage.replace(/^\/uploads\//, ""));
  }

  async join(id: string, userId: string) {
    const community = await this.requireCommunity(id);
    const existing = await this.members.findMembership(id, userId);
    if (existing) return this.withViewerState(community, userId, existing.role);

    await this.members.create({
      communityId: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
      role: COMMUNITY_ROLES.MEMBER
    });
    const updated = await this.communities.incrementMemberCount(id, 1);
    return this.withViewerState(updated ?? community, userId, COMMUNITY_ROLES.MEMBER);
  }

  async leave(id: string, userId: string) {
    await this.requireCommunity(id);
    const membership = await this.members.findMembership(id, userId);
    if (!membership) throw new ApiError(404, "You are not a member of this community", [], "MEMBERSHIP_NOT_FOUND");
    if (membership.role === COMMUNITY_ROLES.OWNER) {
      throw new ApiError(400, "Owners must delete the community instead of leaving it", [], "OWNER_CANNOT_LEAVE");
    }
    await this.members.deleteMembership(id, userId);
    await this.communities.incrementMemberCount(id, -1);
  }

  async membersList(id: string, actorId: string) {
    await this.requireCommunity(id);
    await this.requireMembership(id, actorId);
    return this.members.findByCommunity(id);
  }

  async addModerator(id: string, userId: string, actorId: string) {
    const community = await this.requireCommunity(id);
    await this.assertOwner(id, actorId);
    if (community.owner.toString() === userId) {
      throw new ApiError(400, "The owner already has full community permissions", [], "OWNER_ALREADY_PRIVILEGED");
    }
    await this.assertUserExists(userId);
    const membership = await this.members.findMembership(id, userId);
    if (!membership) {
      await this.members.create({
        communityId: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
        role: COMMUNITY_ROLES.MODERATOR
      });
      await this.communities.incrementMemberCount(id, 1);
    } else {
      await this.members.updateMembership(id, userId, { $set: { role: COMMUNITY_ROLES.MODERATOR } });
    }
    await this.communities.updateById(id, { $addToSet: { moderators: new Types.ObjectId(userId) } });
    return this.members.findByCommunity(id);
  }

  async removeModerator(id: string, userId: string, actorId: string) {
    await this.assertOwner(id, actorId);
    const membership = await this.members.findMembership(id, userId);
    if (!membership || membership.role !== COMMUNITY_ROLES.MODERATOR) {
      throw new ApiError(404, "Moderator membership not found", [], "MODERATOR_NOT_FOUND");
    }
    await this.members.updateMembership(id, userId, { $set: { role: COMMUNITY_ROLES.MEMBER } });
    await this.communities.updateById(id, { $pull: { moderators: new Types.ObjectId(userId) } });
    return this.members.findByCommunity(id);
  }

  async removeMember(id: string, userId: string, actorId: string) {
    await this.requireManager(id, actorId);
    const membership = await this.members.findMembership(id, userId);
    if (!membership) throw new ApiError(404, "Community member not found", [], "MEMBER_NOT_FOUND");
    if (membership.role === COMMUNITY_ROLES.OWNER) {
      throw new ApiError(400, "The owner cannot be removed", [], "OWNER_CANNOT_BE_REMOVED");
    }
    await this.members.deleteMembership(id, userId);
    await this.communities.updateById(id, { $pull: { moderators: new Types.ObjectId(userId) } });
    await this.communities.incrementMemberCount(id, -1);
    return this.members.findByCommunity(id);
  }

  private async requireCommunity(id: string) {
    const community = await this.communities.findById(id);
    if (!community) throw new ApiError(404, "Community not found", [], "COMMUNITY_NOT_FOUND");
    return community;
  }

  private async requireMembership(id: string, userId: string) {
    const membership = await this.members.findMembership(id, userId);
    if (!membership) throw new ApiError(403, "Community membership is required", [], "MEMBERSHIP_REQUIRED");
    return membership;
  }

  private async assertOwner(id: string, userId: string) {
    const membership = await this.requireMembership(id, userId);
    if (membership.role !== COMMUNITY_ROLES.OWNER) {
      throw new ApiError(403, "Only the community owner can perform this action", [], "OWNER_REQUIRED");
    }
  }

  private async requireManager(id: string, userId: string) {
    const membership = await this.requireMembership(id, userId);
    if (membership.role !== COMMUNITY_ROLES.OWNER && membership.role !== COMMUNITY_ROLES.MODERATOR) {
      throw new ApiError(403, "Owner or moderator permissions are required", [], "MANAGER_REQUIRED");
    }
    return membership;
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
    let slug = base;
    let suffix = 1;
    while (true) {
      const existing = await this.communities.findBySlug(slug);
      if (!existing || existing._id.toString() === currentId) return slug;
      suffix += 1;
      slug = `${base}-${suffix}`;
    }
  }

  private async withViewerState(community: CommunityDocument, viewerId: string, role?: CommunityRole) {
    const membershipRole =
      role ?? (await this.members.findMembership(community._id.toString(), viewerId))?.role ?? null;
    return {
      ...community.toJSON(),
      membershipRole,
      isMember: Boolean(membershipRole)
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
  new StorageService(new LocalStorageProvider())
);
