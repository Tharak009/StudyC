import type { Request, Response } from "express";
import { Types } from "mongoose";
import { communityService } from "../services/community.service.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { Community, type IChannel } from "../models/community.model.js";
import { AdminLog } from "../models/admin-log.model.js";
import { getSocketServer } from "../sockets/index.js";
import type {
  CreateCommunityInput,
  ListCommunitiesQuery,
  UpdateCommunityInput
} from "../validators/community.validator.js";

export class CommunityController {
  async create(request: Request, response: Response) {
    const community = await communityService.create(
      request.body as CreateCommunityInput,
      request.user!.id,
      request.file
    );
    response.status(201).json(new ApiResponse(201, community, "Community created"));
  }

  async list(request: Request, response: Response) {
    const communities = await communityService.list(
      request.validated?.query as ListCommunitiesQuery,
      request.user!.id
    );
    response.json(new ApiResponse(200, communities, "Communities retrieved"));
  }

  async details(request: Request, response: Response) {
    const community = await communityService.details(param(request, "id"), request.user!.id);
    response.json(new ApiResponse(200, community, "Community retrieved"));
  }

  async update(request: Request, response: Response) {
    const community = await communityService.update(
      param(request, "id"),
      request.body as UpdateCommunityInput,
      request.user!.id,
      request.file
    );
    response.json(new ApiResponse(200, community, "Community updated"));
  }

  async delete(request: Request, response: Response) {
    await communityService.delete(param(request, "id"), request.user!.id);
    response.json(new ApiResponse(200, null, "Community deleted"));
  }

  async join(request: Request, response: Response) {
    const community = await communityService.join(param(request, "id"), request.user!.id);
    response.json(new ApiResponse(200, community, "Joined community"));
  }

  async leave(request: Request, response: Response) {
    await communityService.leave(param(request, "id"), request.user!.id);
    response.json(new ApiResponse(200, null, "Left community"));
  }

  async members(request: Request, response: Response) {
    const members = await communityService.membersList(param(request, "id"), request.user!.id);
    response.json(new ApiResponse(200, members, "Community members retrieved"));
  }

  async addModerator(request: Request, response: Response) {
    const members = await communityService.addModerator(
      param(request, "id"),
      request.body.userId,
      request.user!.id
    );
    response.json(new ApiResponse(200, members, "Moderator added"));
  }

  async removeModerator(request: Request, response: Response) {
    const members = await communityService.removeModerator(
      param(request, "id"),
      param(request, "userId"),
      request.user!.id
    );
    response.json(new ApiResponse(200, members, "Moderator removed"));
  }

  async removeMember(request: Request, response: Response) {
    const members = await communityService.removeMember(
      param(request, "id"),
      param(request, "userId"),
      request.user!.id
    );
    response.json(new ApiResponse(200, members, "Member removed"));
  }

  async updateChannelStudyMode(request: Request, response: Response) {
    const communityId = param(request, "id");
    const channelId = param(request, "channelId");
    const userId = request.user!.id;
    const userRole = request.user!.role;

    const community = await Community.findById(communityId);
    if (!community) {
      throw new ApiError(404, "Community not found", [], "COMMUNITY_NOT_FOUND");
    }

    const isOwner = community.owner.toString() === userId;
    const isModerator = community.moderators.some((m) => m.toString() === userId);
    const isAdmin = userRole === "ADMIN";

    if (!isOwner && !isModerator && !isAdmin) {
      throw new ApiError(
        403,
        "Only verified room moderators or administrators can configure study mode",
        [],
        "FORBIDDEN_STUDY_MODE"
      );
    }

    const {
      isStrictStudyMode,
      academicContextTags,
      strictnessThreshold,
      allowCodeSnippetsOnly,
      strikeLimitBeforeTimeout,
      timeoutDurationMinutes
    } = request.body;

    let targetChannel = community.channels.find(
      (c) => c._id?.toString() === channelId || c.name.toLowerCase() === channelId.toLowerCase()
    );

    if (!targetChannel) {
      const newChan: IChannel = {
        name: channelId,
        type: "text",
        isStrictStudyMode: isStrictStudyMode ?? true,
        academicContextTags: Array.isArray(academicContextTags)
          ? academicContextTags
          : ["algorithms", "code", "homework", "exam"],
        strictnessThreshold:
          typeof strictnessThreshold === "number" ? strictnessThreshold : 0.4,
        allowCodeSnippetsOnly: Boolean(allowCodeSnippetsOnly),
        strikeLimitBeforeTimeout: strikeLimitBeforeTimeout ?? 3,
        timeoutDurationMinutes: timeoutDurationMinutes ?? 5
      };
      community.channels.push(newChan);
      targetChannel = newChan;
    } else {
      if (typeof isStrictStudyMode === "boolean") targetChannel.isStrictStudyMode = isStrictStudyMode;
      if (Array.isArray(academicContextTags)) targetChannel.academicContextTags = academicContextTags;
      if (typeof strictnessThreshold === "number") targetChannel.strictnessThreshold = strictnessThreshold;
      if (typeof allowCodeSnippetsOnly === "boolean") targetChannel.allowCodeSnippetsOnly = allowCodeSnippetsOnly;
      if (typeof strikeLimitBeforeTimeout === "number") targetChannel.strikeLimitBeforeTimeout = strikeLimitBeforeTimeout;
      if (typeof timeoutDurationMinutes === "number") targetChannel.timeoutDurationMinutes = timeoutDurationMinutes;
    }

    await community.save();

    // Log admin / mod audit trail
    try {
      await AdminLog.create({
        adminId: new Types.ObjectId(userId),
        adminName: request.user?.fullName || "Room Moderator",
        action: "UPDATE_CHANNEL_STUDY_MODE",
        targetType: "Channel",
        targetId: channelId,
        details: {
          communityId,
          channelId,
          isStrictStudyMode: targetChannel?.isStrictStudyMode,
          academicContextTags: targetChannel?.academicContextTags,
          strictnessThreshold: targetChannel?.strictnessThreshold,
          allowCodeSnippetsOnly: targetChannel?.allowCodeSnippetsOnly
        }
      });
    } catch {}

    // Emit live socket event to all active room subscribers
    try {
      const io = getSocketServer();
      if (io) {
        const payload = {
          communityId,
          channelId,
          channel: targetChannel
        };
        io.to(`room:${communityId}`).emit("channel:studyModeUpdated", payload);
        io.to(`room:${communityId}:${channelId}`).emit("channel:studyModeUpdated", payload);
      }
    } catch {}

    response.json(new ApiResponse(200, targetChannel, "Channel study mode configuration updated"));
  }
}

export const communityController = new CommunityController();

const param = (request: Request, key: string): string => request.params[key] as string;
