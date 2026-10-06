import type { Request, Response } from "express";
import { streamService } from "../services/stream.service.js";
import { linkPreviewService } from "../services/link-preview.service.js";
import { env } from "../config/env.js";

import { ApiError } from "../utils/api-error.js";
import { toStreamUserId } from "../utils/stream-id.js";

export class StreamController {
  /**
   * GET /api/stream/token
   * Returns a Stream Chat JWT token for the authenticated StudyConnect user and syncs their profile.
   */
  async getToken(request: Request, response: Response): Promise<void> {
    const user = request.user;
    if (!user) {
      throw new ApiError(401, "Authentication required", [], "AUTH_REQUIRED");
    }

    const rawUserId = String(user.id || (user as any)._id);
    const streamUserId = toStreamUserId(rawUserId);

    try {
      await streamService.upsertStreamUser(user as any);
    } catch (upsertErr) {
      console.warn("Could not upsert user to Stream (non-fatal):", upsertErr);
    }

    const token = streamService.createUserToken(rawUserId);

    response.status(200).json({
      success: true,
      data: {
        token,
        apiKey: env.STREAM_API_KEY,
        user: {
          id: streamUserId,
          name: user.fullName || (user as any).name || "Student",
          image: (user as any).profilePicture,
          department: user.department,
          rollNumber: user.rollNumber,
          role: user.role
        }
      },
      message: "Stream token generated successfully"
    });
  }

  /**
   * POST /api/stream/dms
   * Creates or gets a deterministic 1-on-1 Direct Message Stream channel.
   * Enforces user existence, self-DM prevention, and bidirectional blocking.
   */
  async createOrGetDm(request: Request, response: Response): Promise<void> {
    const user = request.user;
    if (!user) {
      throw new ApiError(401, "Authentication required", [], "AUTH_REQUIRED");
    }

    const currentUserId = String(user.id || (user as any)._id);
    const { targetUserId } = request.body;

    if (!targetUserId || typeof targetUserId !== "string") {
      throw new ApiError(400, "targetUserId is required", [], "MISSING_TARGET_USER");
    }

    const result = await streamService.getOrCreateDmChannel(currentUserId, targetUserId.trim());

    response.status(200).json({
      success: true,
      data: result,
      message: "DM channel ready"
    });
  }

  /**
   * GET /api/stream/communities/:communityId/channels
   * Returns all Stream channels for the given community, ensuring default channels exist
   * and current user membership is synchronized.
   */
  async getCommunityChannels(request: Request, response: Response): Promise<void> {
    const user = request.user;
    if (!user) {
      throw new ApiError(401, "Authentication required", [], "AUTH_REQUIRED");
    }

    const currentUserId = String(user.id || (user as any)._id);
    const rawCommunityId = request.params.communityId;
    if (!rawCommunityId || typeof rawCommunityId !== "string") {
      throw new ApiError(400, "communityId parameter is required", [], "MISSING_COMMUNITY_ID");
    }
    const communityId: string = rawCommunityId;

    const channels = await streamService.ensureCommunityChannels(communityId, currentUserId);

    response.status(200).json({
      success: true,
      data: channels,
      message: "Community channels retrieved successfully"
    });
  }

  /**
   * POST /api/stream/communities/:communityId/channels
   * Privileged creation of a new community channel on Stream Chat.
   * Requires community OWNER, MODERATOR, or system ADMIN role.
   */
  async createCommunityChannel(request: Request, response: Response): Promise<void> {
    const user = request.user;
    if (!user) {
      throw new ApiError(401, "Authentication required", [], "AUTH_REQUIRED");
    }

    const currentUserId = String(user.id || (user as any)._id);
    const rawCommunityId = request.params.communityId;
    if (!rawCommunityId || typeof rawCommunityId !== "string") {
      throw new ApiError(400, "communityId parameter is required", [], "MISSING_COMMUNITY_ID");
    }
    const communityId: string = rawCommunityId;
    const { name, category = "focus", topic, isPrivate } = request.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      throw new ApiError(400, "Channel name is required", [], "INVALID_CHANNEL_NAME");
    }

    const validCategories = ["announcements", "focus", "watercooler", "stages"];
    if (!validCategories.includes(category)) {
      throw new ApiError(
        400,
        `Invalid category. Must be one of: ${validCategories.join(", ")}`,
        [],
        "INVALID_CATEGORY"
      );
    }

    const channel = await streamService.createCommunityChannel(communityId, currentUserId, {
      name: name.trim(),
      category,
      topic: topic ? String(topic).trim() : undefined,
      isPrivate: Boolean(isPrivate)
    });

    response.status(201).json({
      success: true,
      data: channel,
      message: "Community channel created successfully"
    });
  }

  /**
   * POST /api/stream/link-preview
   * Secure, SSRF-protected link preview generation for chat URLs.
   */
  async getLinkPreview(request: Request, response: Response): Promise<void> {
    const { url } = request.body;
    if (!url || typeof url !== "string") {
      throw new ApiError(400, "Valid URL is required", [], "INVALID_URL");
    }

    const preview = await linkPreviewService.getPreview(url.trim());
    response.status(200).json({
      success: true,
      data: preview,
      message: preview ? "Link preview generated" : "No preview available"
    });
  }
}

export const streamController = new StreamController();

