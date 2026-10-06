import { Types } from "mongoose";
import { GROUP_STATUS, GROUP_TYPES } from "../constants/community-group.js";
import { Community } from "../models/community.model.js";
import { CommunityGroup, type CommunityGroupDocument } from "../models/community-group.model.js";
import { ApiError } from "../utils/api-error.js";
import {
  toStreamAnnouncementChannelId,
  toStreamGroupChannelId,
  toStreamUserId
} from "../utils/stream-id.js";
import type {
  AttachGroupInput,
  CreateGroupInput,
  UpdateGroupInput
} from "../validators/community-group.validator.js";
import { streamService } from "./stream.service.js";

export class CommunityGroupService {
  /**
   * Ensures that the dedicated Announcements group and corresponding Stream Chat
   * channel exist for a community. Idempotent.
   */
  async ensureAnnouncementGroup(
    communityId: string,
    ownerId: string
  ): Promise<CommunityGroupDocument> {
    const commId = new Types.ObjectId(communityId);
    let existing = await CommunityGroup.findOne({
      communityId: commId,
      isAnnouncement: true,
      isDeleted: false
    });

    if (existing) {
      return existing;
    }

    const streamChannelId = toStreamAnnouncementChannelId(communityId);

    // Create or get the Stream Chat channel
    try {
      if (streamService.isConfigured()) {
        const client = streamService.getClient();
        const ownerStreamId = toStreamUserId(ownerId);
        const channel = client.channel("messaging", streamChannelId, {
          name: "Announcements",
          studyConnectType: "community_announcement",
          communityId,
          created_by_id: ownerStreamId,
          isAnnouncement: true
        } as any);
        await channel.create();
      }
    } catch (err) {
      console.warn(`[CommunityGroupService] Could not pre-create announcement channel on Stream:`, err);
    }

    const announcementGroup = await CommunityGroup.create({
      communityId: commId,
      name: "Announcements",
      description: "Official community notices, syllabus, and announcements from admins.",
      type: GROUP_TYPES.ANNOUNCEMENT,
      streamChannelId,
      createdBy: new Types.ObjectId(ownerId),
      status: GROUP_STATUS.ACTIVE,
      sortOrder: 0,
      isAnnouncement: true
    });

    await Community.findByIdAndUpdate(commId, {
      $set: { announcementGroupId: announcementGroup._id },
      $inc: { groupCount: 1 }
    });

    return announcementGroup;
  }

  /**
   * Lists all active groups belonging to a Community.
   * Guaranteed order: Announcements first, then by sortOrder, then by creation date.
   */
  async listGroups(communityId: string): Promise<CommunityGroupDocument[]> {
    const community = await Community.findById(communityId);
    if (!community || community.isDeleted) {
      throw new ApiError(404, "Community not found", [], "COMMUNITY_NOT_FOUND");
    }

    // Ensure announcements group exists (self-healing for older communities)
    if (!community.announcementGroupId) {
      await this.ensureAnnouncementGroup(communityId, community.owner.toString()).catch(() => {});
    }

    return CommunityGroup.find({
      communityId: community._id,
      isDeleted: false
    }).sort({ isAnnouncement: -1, sortOrder: 1, createdAt: 1 });
  }

  /**
   * Creates a new Group inside a Community.
   * Authorized for Community Owner.
   */
  async createGroup(
    communityId: string,
    creatorId: string,
    input: CreateGroupInput,
    userRole?: string
  ): Promise<CommunityGroupDocument> {
    const community = await Community.findById(communityId);
    if (!community || community.isDeleted) {
      throw new ApiError(404, "Community not found", [], "COMMUNITY_NOT_FOUND");
    }

    const isOwner = community.owner.toString() === creatorId || userRole === "ADMIN";
    if (!isOwner) {
      throw new ApiError(
        403,
        "Only the community owner can create groups in this community",
        [],
        "FORBIDDEN"
      );
    }

    const groupDoc = new CommunityGroup({
      communityId: community._id,
      name: input.name.trim(),
      description: input.description?.trim() || "",
      icon: input.icon?.trim() || "",
      type: input.type || GROUP_TYPES.DISCUSSION,
      createdBy: new Types.ObjectId(creatorId),
      status: GROUP_STATUS.ACTIVE,
      sortOrder: (community.groupCount || 0) + 1,
      isAnnouncement: false
    });

    const streamChannelId = toStreamGroupChannelId(communityId, groupDoc._id.toString());
    groupDoc.streamChannelId = streamChannelId;

    // Create the Stream Chat channel
    if (streamService.isConfigured()) {
      try {
        const client = streamService.getClient();
        const ownerStreamId = toStreamUserId(creatorId);
        const channel = client.channel("messaging", streamChannelId, {
          name: groupDoc.name,
          studyConnectType: "community_group",
          communityId,
          groupId: groupDoc._id.toString(),
          groupType: groupDoc.type,
          topic: groupDoc.description,
          created_by_id: ownerStreamId,
          isAnnouncement: false
        } as any);
        await channel.create();
      } catch (err) {
        console.warn(`[CommunityGroupService] Could not create Stream channel for group ${groupDoc._id}:`, err);
      }
    }

    await groupDoc.save();

    await Community.findByIdAndUpdate(community._id, {
      $inc: { groupCount: 1 }
    });

    return groupDoc;
  }

  /**
   * Attaches an existing Stream Chat group/channel to a Community.
   */
  async attachExistingGroup(
    communityId: string,
    actorId: string,
    input: AttachGroupInput,
    userRole?: string
  ): Promise<CommunityGroupDocument> {
    const community = await Community.findById(communityId);
    if (!community || community.isDeleted) {
      throw new ApiError(404, "Community not found", [], "COMMUNITY_NOT_FOUND");
    }

    const isOwner = community.owner.toString() === actorId || userRole === "ADMIN";
    if (!isOwner) {
      throw new ApiError(403, "Only community owners can attach groups", [], "FORBIDDEN");
    }

    // Check if channel is already attached to any group
    const existing = await CommunityGroup.findOne({
      streamChannelId: input.streamChannelId,
      isDeleted: false
    });
    if (existing) {
      throw new ApiError(
        409,
        "This chat channel is already attached to a community group",
        [],
        "CHANNEL_ALREADY_ATTACHED"
      );
    }

    const group = await CommunityGroup.create({
      communityId: community._id,
      name: input.name.trim(),
      description: input.description?.trim() || "",
      icon: input.icon?.trim() || "",
      type: input.type || GROUP_TYPES.DISCUSSION,
      streamChannelId: input.streamChannelId.trim(),
      createdBy: new Types.ObjectId(actorId),
      status: GROUP_STATUS.ACTIVE,
      sortOrder: (community.groupCount || 0) + 1,
      isAnnouncement: false
    });

    await Community.findByIdAndUpdate(community._id, {
      $inc: { groupCount: 1 }
    });

    return group;
  }

  /**
   * Retrieves single group metadata.
   */
  async getGroup(communityId: string, groupId: string): Promise<CommunityGroupDocument> {
    const group = await CommunityGroup.findOne({
      _id: new Types.ObjectId(groupId),
      communityId: new Types.ObjectId(communityId),
      isDeleted: false
    });

    if (!group) {
      throw new ApiError(404, "Community group not found", [], "GROUP_NOT_FOUND");
    }

    return group;
  }

  /**
   * Updates group metadata.
   */
  async updateGroup(
    communityId: string,
    groupId: string,
    actorId: string,
    input: UpdateGroupInput,
    userRole?: string
  ): Promise<CommunityGroupDocument> {
    const group = await this.getGroup(communityId, groupId);
    const community = await Community.findById(communityId);
    if (!community) throw new ApiError(404, "Community not found");

    const isOwner = community.owner.toString() === actorId || userRole === "ADMIN";
    if (!isOwner) {
      throw new ApiError(403, "Only the community owner can update groups", [], "FORBIDDEN");
    }

    if (group.isAnnouncement && input.name && input.name !== "Announcements") {
      throw new ApiError(400, "The announcement space name cannot be altered", [], "INVALID_OPERATION");
    }

    if (input.name) group.name = input.name.trim();
    if (input.description !== undefined) group.description = input.description.trim();
    if (input.icon !== undefined) group.icon = input.icon.trim();
    if (input.status) group.status = input.status as any;
    if (input.sortOrder !== undefined) group.sortOrder = input.sortOrder;

    await group.save();

    // Optionally update Stream channel name/topic
    if (streamService.isConfigured() && input.name) {
      try {
        const client = streamService.getClient();
        const channel = client.channel("messaging", group.streamChannelId);
        await channel.updatePartial({
          set: {
            name: group.name,
            topic: group.description
          } as any
        });
      } catch {}
    }

    return group;
  }

  /**
   * Archives a community group.
   */
  async archiveGroup(
    communityId: string,
    groupId: string,
    actorId: string,
    userRole?: string
  ): Promise<CommunityGroupDocument> {
    return this.updateGroup(
      communityId,
      groupId,
      actorId,
      { status: GROUP_STATUS.ARCHIVED },
      userRole
    );
  }

  /**
   * Soft deletes a group.
   * Preserves Stream Chat history.
   */
  async deleteGroup(
    communityId: string,
    groupId: string,
    actorId: string,
    userRole?: string
  ): Promise<void> {
    const group = await this.getGroup(communityId, groupId);
    const community = await Community.findById(communityId);
    if (!community) throw new ApiError(404, "Community not found");

    const isOwner = community.owner.toString() === actorId || userRole === "ADMIN";
    if (!isOwner) {
      throw new ApiError(403, "Only the community owner can delete groups", [], "FORBIDDEN");
    }

    if (group.isAnnouncement) {
      throw new ApiError(
        400,
        "The community announcement space cannot be deleted",
        [],
        "ANNOUNCEMENT_CANNOT_BE_DELETED"
      );
    }

    group.isDeleted = true;
    group.status = GROUP_STATUS.DELETED;
    group.deletedAt = new Date();
    group.deletedBy = new Types.ObjectId(actorId);
    await group.save();

    await Community.findByIdAndUpdate(community._id, {
      $inc: { groupCount: -1 }
    });
  }
}

export const communityGroupService = new CommunityGroupService();
