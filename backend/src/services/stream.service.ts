import { StreamChat } from "stream-chat";
import { env } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";
import {
  toStreamUserId,
  fromStreamUserId,
  toStreamDmChannelId,
  toStreamCommunityChannelId
} from "../utils/stream-id.js";
import { Community, type IChannel } from "../models/community.model.js";
import { CommunityMember } from "../models/community-member.model.js";
import { isActiveMember, ACTIVE_MEMBERSHIP_STATUSES } from "../constants/community-membership.js";
import { User } from "../models/user.model.js";
import { blockService } from "./block.service.js";

export interface StreamUserData {
  _id?: unknown;
  id?: unknown;
  fullName?: string;
  name?: string;
  profilePicture?: string;
  role?: string;
  department?: string;
  rollNumber?: string;
}

export interface CreateCommunityChannelInput {
  name: string;
  category: "announcements" | "focus" | "watercooler" | "stages";
  topic?: string;
  isPrivate?: boolean;
}

export interface StreamChannelSummary {
  id: string;
  cid: string;
  name: string;
  studyConnectType: "dm" | "community";
  communityId?: string;
  channelTier?: "announcements" | "focus" | "watercooler" | "stages";
  topic?: string;
  memberCount?: number;
}

export class StreamService {
  private client: StreamChat | null = null;

  /**
   * Returns a singleton StreamChat server client instance
   */
  public getClient(): StreamChat {
    if (!this.client) {
      if (!env.STREAM_API_KEY || !env.STREAM_API_SECRET) {
        throw new ApiError(
          500,
          "Stream Chat credentials are not configured on the server",
          [],
          "STREAM_NOT_CONFIGURED"
        );
      }
      this.client = StreamChat.getInstance(env.STREAM_API_KEY, env.STREAM_API_SECRET);
    }
    return this.client;
  }

  /**
   * Checks whether Stream Chat credentials are configured
   */
  public isConfigured(): boolean {
    return Boolean(env.STREAM_API_KEY && env.STREAM_API_SECRET);
  }

  private hasEnsuredUploadConfig = false;

  /**
   * Ensures Stream App Settings allow uploads up to 25MB for both files and images.
   */
  public async ensureUploadConfig(): Promise<void> {
    if (this.hasEnsuredUploadConfig) return;
    try {
      const client = this.getClient();
      await client.updateAppSettings({
        file_upload_config: {
          size_limit: 25 * 1024 * 1024
        },
        image_upload_config: {
          size_limit: 25 * 1024 * 1024
        }
      });
      this.hasEnsuredUploadConfig = true;
    } catch (err) {
      console.warn("Could not update Stream upload size limit settings:", err);
    }
  }

  /**
   * Generates a signed Stream Chat JWT token for a StudyConnect user.
   */
  public createUserToken(userId: string): string {
    const client = this.getClient();
    this.ensureUploadConfig().catch(() => {});
    const streamUserId = toStreamUserId(userId);
    return client.createToken(streamUserId);
  }

  /**
   * Syncs/upserts user profile details into Stream Chat with safe attributes.
   */
  public async upsertStreamUser(user: StreamUserData): Promise<string> {
    const client = this.getClient();
    const rawId = String(user.id || user._id);
    const streamUserId = toStreamUserId(rawId);

    await client.upsertUser({
      id: streamUserId,
      name: user.fullName || user.name || "Student",
      image: user.profilePicture || undefined,
      role: user.role === "ADMIN" ? "admin" : "user",
      department: user.department,
      rollNumber: user.rollNumber
    } as any);

    return streamUserId;
  }

  // ── Phase 2: Direct Messages (DMs) ──────────────────────────────────────────

  /**
   * Safely gets or creates a deterministic 1-on-1 Direct Message channel on Stream Chat.
   * - Enforces bidirectional blocking checks.
   * - Validates target user existence.
   * - Derives deterministic ID: `dm_<sorted_userIds>`.
   * - Idempotent across multiple calls.
   */
  public async getOrCreateDmChannel(
    currentUserId: string,
    targetUserId: string
  ): Promise<{
    channelId: string;
    channelCid: string;
    targetUser: {
      id: string;
      studyConnectId: string;
      name: string;
      rollNumber?: string;
      department?: string;
      image?: string;
    };
  }> {
    if (!currentUserId || !targetUserId) {
      throw new ApiError(400, "Both participants are required", [], "INVALID_PARTICIPANTS");
    }

    if (currentUserId === targetUserId) {
      throw new ApiError(422, "Cannot create a direct message channel with yourself", [], "SELF_DM_FORBIDDEN");
    }

    // 1. Verify target user exists
    const [targetUser, currentUser] = await Promise.all([
      User.findById(targetUserId).lean().exec(),
      User.findById(currentUserId).lean().exec()
    ]);

    if (!targetUser) {
      throw new ApiError(404, "Target user not found", [], "USER_NOT_FOUND");
    }

    // 2. Check blocking restrictions (bidirectional)
    const isBlocked = await blockService.isBlocked(currentUserId, targetUserId);
    if (isBlocked) {
      throw new ApiError(
        403,
        "Cannot start a direct message with this user due to privacy or block restrictions",
        [],
        "BLOCKED_USER"
      );
    }

    // 3. Upsert both users to Stream Chat to ensure metadata exists
    await Promise.allSettled([
      currentUser && this.upsertStreamUser(currentUser as any),
      this.upsertStreamUser(targetUser as any)
    ]);

    // 4. Derive deterministic DM channel ID
    const streamUserA = toStreamUserId(currentUserId);
    const streamUserB = toStreamUserId(targetUserId);
    const channelId = toStreamDmChannelId(currentUserId, targetUserId);

    const client = this.getClient();
    const channel = client.channel("messaging", channelId, {
      members: [streamUserA, streamUserB],
      created_by_id: streamUserA,
      studyConnectType: "dm"
    } as any);

    await channel.create();

    return {
      channelId,
      channelCid: channel.cid,
      targetUser: {
        id: streamUserB,
        studyConnectId: targetUserId,
        name: targetUser.fullName,
        rollNumber: targetUser.rollNumber,
        department: targetUser.department,
        image: targetUser.profilePicture
      }
    };
  }

  // ── Phase 2: Community / Study Circle Channels ──────────────────────────────

  /**
   * Default channel tier specifications for a StudyConnect community
   */
  public getDefaultChannelSpecs(): Array<{
    key: string;
    name: string;
    category: "announcements" | "focus" | "watercooler" | "stages";
    topic: string;
    isStrictStudyMode?: boolean;
  }> {
    return [
      {
        key: "announcements",
        name: "Announcements",
        category: "announcements",
        topic: "Official community notices, syllabus, and exam schedules",
        isStrictStudyMode: true
      },
      {
        key: "general-study",
        name: "General Study Room",
        category: "focus",
        topic: "Peer coursework questions and collaborative study discussions",
        isStrictStudyMode: true
      },
      {
        key: "code-review",
        name: "Code & Assignments",
        category: "focus",
        topic: "Share snippets, debug runtime errors, and review coursework code",
        isStrictStudyMode: true
      },
      {
        key: "campus-watercooler",
        name: "Campus Watercooler",
        category: "watercooler",
        topic: "Casual study breaks, campus chatter, and music sharing",
        isStrictStudyMode: false
      },
      {
        key: "live-study-stage",
        name: "Live Study Stage",
        category: "stages",
        topic: "Audio study stage and whiteboard discussions",
        isStrictStudyMode: false
      }
    ];
  }

  /**
   * Ensures default and custom community channels exist in Stream Chat,
   * synchronizes community members, and assigns appropriate channel roles.
   */
  public async ensureCommunityChannels(
    communityId: string,
    currentUserId: string
  ): Promise<StreamChannelSummary[]> {
    const community = await Community.findById(communityId);
    if (!community) {
      throw new ApiError(404, "Community not found", [], "COMMUNITY_NOT_FOUND");
    }

    // Check membership
    const membership = await CommunityMember.findOne({
      communityId: community._id,
      userId: currentUserId
    }).lean().exec();

    if (membership && (membership.status === "BANNED" || membership.status === "SUSPENDED")) {
      throw new ApiError(403, `Access restricted (${membership.status})`, [], "MEMBERSHIP_RESTRICTED");
    }

    if (community.visibility === "private" && (!membership || !isActiveMember(membership.status))) {
      throw new ApiError(403, "Membership required to access this community's channels", [], "MEMBERSHIP_REQUIRED");
    }

    // Fetch all active community members to populate channel membership
    const members = await CommunityMember.find({
      communityId: community._id,
      status: { $in: [...ACTIVE_MEMBERSHIP_STATUSES, undefined as any] }
    }).lean().exec();
    const streamMembers = members.map((m) => {
      const isPrivileged = m.role === "OWNER" || m.role === "MODERATOR";
      return {
        user_id: toStreamUserId(m.userId.toString()),
        channel_role: isPrivileged ? "channel_moderator" : "channel_member"
      };
    });

    // Ensure the MongoDB community document has channel tier definitions
    if (!community.channels || community.channels.length === 0) {
      const defaultSpecs = this.getDefaultChannelSpecs();
      community.channels = defaultSpecs.map((spec) => ({
        name: spec.name,
        type: spec.category === "announcements" ? "announcement" : spec.category === "stages" ? "voice" : "text",
        category: spec.category,
        topic: spec.topic,
        isStrictStudyMode: spec.isStrictStudyMode ?? false,
        academicContextTags: ["algorithms", "coursework", "exams"],
        strictnessThreshold: 0.4,
        allowCodeSnippetsOnly: false,
        strikeLimitBeforeTimeout: 3,
        timeoutDurationMinutes: 5
      })) as any;
      await community.save();
    }

    const client = this.getClient();
    const ownerStreamId = toStreamUserId(community.owner.toString());
    const channelSummaries: StreamChannelSummary[] = [];

    for (const ch of community.channels) {
      const channelKey = ch.name.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
      const streamChannelId = toStreamCommunityChannelId(community._id.toString(), channelKey);

      const channel = client.channel("messaging", streamChannelId, {
        name: ch.name,
        studyConnectType: "community",
        communityId: community._id.toString(),
        communityName: community.name,
        channelId: ch._id?.toString() || channelKey,
        channelTier: (ch.category as any) || "focus",
        topic: ch.topic || "",
        isPrivate: Boolean(ch.isPrivate),
        created_by_id: ownerStreamId
      } as any);

      await channel.create();

      // Ensure members are synced into the channel
      if (streamMembers.length > 0) {
        try {
          await channel.addMembers(streamMembers as any);
        } catch (memErr) {
          console.warn(`Could not sync members for channel ${streamChannelId}:`, memErr);
        }
      }

      channelSummaries.push({
        id: streamChannelId,
        cid: channel.cid,
        name: ch.name,
        studyConnectType: "community",
        communityId: community._id.toString(),
        channelTier: (ch.category as any) || "focus",
        topic: ch.topic,
        memberCount: streamMembers.length
      });
    }

    return channelSummaries;
  }

  /**
   * Privileged creation of a new channel inside a community on Stream Chat.
   */
  public async createCommunityChannel(
    communityId: string,
    actorId: string,
    input: CreateCommunityChannelInput
  ): Promise<StreamChannelSummary> {
    const community = await Community.findById(communityId);
    if (!community) {
      throw new ApiError(404, "Community not found", [], "COMMUNITY_NOT_FOUND");
    }

    // Verify actor is owner or moderator
    const isOwner = community.owner.toString() === actorId;
    const isMod = community.moderators.some((m) => m.toString() === actorId);
    const actorUser = await User.findById(actorId).lean().exec();
    const isAdmin = actorUser?.role === "ADMIN";

    if (!isOwner && !isMod && !isAdmin) {
      throw new ApiError(
        403,
        "Only community owners, moderators, or admins can create channels",
        [],
        "FORBIDDEN"
      );
    }

    const channelKey = input.name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    const streamChannelId = toStreamCommunityChannelId(community._id.toString(), channelKey);

    // Save to MongoDB community channels array
    const existing = community.channels.find(
      (c) => c.name.toLowerCase() === input.name.trim().toLowerCase()
    );

    let channelRecord: IChannel;
    if (!existing) {
      channelRecord = {
        name: input.name.trim(),
        type: input.category === "announcements" ? "announcement" : input.category === "stages" ? "voice" : "text",
        category: input.category,
        topic: input.topic || "",
        isPrivate: Boolean(input.isPrivate),
        isStrictStudyMode: input.category === "focus",
        academicContextTags: ["study", "coursework"],
        strictnessThreshold: 0.4,
        allowCodeSnippetsOnly: false,
        strikeLimitBeforeTimeout: 3,
        timeoutDurationMinutes: 5
      };
      community.channels.push(channelRecord);
      await community.save();
    } else {
      channelRecord = existing;
    }

    // Sync to Stream Chat
    const members = await CommunityMember.find({
      communityId: community._id,
      status: { $in: [...ACTIVE_MEMBERSHIP_STATUSES, undefined as any] }
    }).lean().exec();
    const streamMembers = members.map((m) => {
      const isPrivileged = m.role === "OWNER" || m.role === "MODERATOR";
      return {
        user_id: toStreamUserId(m.userId.toString()),
        channel_role: isPrivileged ? "channel_moderator" : "channel_member"
      };
    });

    const client = this.getClient();
    const channel = client.channel("messaging", streamChannelId, {
      name: input.name.trim(),
      studyConnectType: "community",
      communityId: community._id.toString(),
      communityName: community.name,
      channelId: channelRecord._id?.toString() || channelKey,
      channelTier: input.category,
      topic: input.topic || "",
      isPrivate: Boolean(input.isPrivate),
      created_by_id: toStreamUserId(actorId)
    } as any);

    await channel.create();

    if (streamMembers.length > 0) {
      try {
        await channel.addMembers(streamMembers as any);
      } catch (memErr) {
        console.warn(`Could not sync members for channel ${streamChannelId}:`, memErr);
      }
    }

    return {
      id: streamChannelId,
      cid: channel.cid,
      name: input.name.trim(),
      studyConnectType: "community",
      communityId: community._id.toString(),
      channelTier: input.category,
      topic: input.topic,
      memberCount: streamMembers.length
    };
  }

  /**
   * Adds a user to all Stream channels for a community upon joining.
   */
  public async addMemberToCommunityChannels(
    communityId: string,
    userId: string,
    role: string = "MEMBER"
  ): Promise<void> {
    try {
      const community = await Community.findById(communityId).lean().exec();
      if (!community || !community.channels) return;

      const client = this.getClient();
      const streamUserId = toStreamUserId(userId);
      const isPrivileged = role === "OWNER" || role === "MODERATOR";
      const channelRole = isPrivileged ? "channel_moderator" : "channel_member";

      await Promise.allSettled(
        community.channels.map(async (ch) => {
          const channelKey = ch.name.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
          const streamChannelId = toStreamCommunityChannelId(communityId, channelKey);
          const channel = client.channel("messaging", streamChannelId);
          await channel.addMembers([
            { user_id: streamUserId, channel_role: channelRole } as any
          ]);
        })
      );
    } catch (err) {
      console.warn(`Failed to add user ${userId} to community ${communityId} Stream channels:`, err);
    }
  }

  /**
   * Removes a user from all Stream channels for a community upon leaving.
   */
  public async removeMemberFromCommunityChannels(
    communityId: string,
    userId: string
  ): Promise<void> {
    try {
      const community = await Community.findById(communityId).lean().exec();
      if (!community || !community.channels) return;

      const client = this.getClient();
      const streamUserId = toStreamUserId(userId);

      await Promise.allSettled(
        community.channels.map(async (ch) => {
          const channelKey = ch.name.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
          const streamChannelId = toStreamCommunityChannelId(communityId, channelKey);
          const channel = client.channel("messaging", streamChannelId);
          await channel.removeMembers([streamUserId]);
        })
      );
    } catch (err) {
      console.warn(`Failed to remove user ${userId} from community ${communityId} Stream channels:`, err);
    }
  }
}

export const streamService = new StreamService();
