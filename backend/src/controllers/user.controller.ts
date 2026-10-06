import type { Request, Response } from "express";
import { userService } from "../services/user.service.js";
import { blockService } from "../services/block.service.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import type { UpdateProfileInput } from "../validators/user.validator.js";

export class UserController {
  async profile(request: Request, response: Response) {
    const profile = await userService.getProfile(request.user!.id);
    response.json(new ApiResponse(200, profile, "Profile retrieved"));
  }

  async getPublicProfile(request: Request, response: Response) {
    const targetUserId = (Array.isArray(request.params.userId) ? request.params.userId[0] : request.params.userId) || "";
    if (!targetUserId) {
      throw new ApiError(400, "User ID is required", [], "MISSING_USER_ID");
    }
    const profile = await userService.getPublicProfile(targetUserId, request.user!.id);
    response.json(new ApiResponse(200, profile, "Public profile retrieved"));
  }

  async updateProfile(request: Request, response: Response) {
    const profile = await userService.updateProfile(
      request.user!.id,
      request.body as UpdateProfileInput
    );
    response.json(new ApiResponse(200, profile, "Profile updated"));
  }

  async uploadProfilePicture(request: Request, response: Response) {
    const profile = await userService.uploadProfilePicture(request.user!.id, request.file);
    response.json(new ApiResponse(200, profile, "Profile picture updated"));
  }

  async search(request: Request, response: Response) {
    const query = (request.query.q as string) ?? "";
    const users = await userService.searchUsers(query, request.user!.id);
    response.json(new ApiResponse(200, users, "Users found"));
  }

  async blockUser(request: Request, response: Response) {
    const targetUserId = (Array.isArray(request.params.userId) ? request.params.userId[0] : request.params.userId) || "";
    if (!targetUserId) {
      throw new ApiError(400, "User ID is required", [], "MISSING_USER_ID");
    }
    const result = await blockService.blockUser(request.user!.id, targetUserId);
    response.json(new ApiResponse(200, result, "User blocked successfully"));
  }

  async unblockUser(request: Request, response: Response) {
    const targetUserId = (Array.isArray(request.params.userId) ? request.params.userId[0] : request.params.userId) || "";
    if (!targetUserId) {
      throw new ApiError(400, "User ID is required", [], "MISSING_USER_ID");
    }
    const result = await blockService.unblockUser(request.user!.id, targetUserId);
    response.json(new ApiResponse(200, result, "User unblocked successfully"));
  }

  async listBlocked(request: Request, response: Response) {
    const blocked = await blockService.listBlocked(request.user!.id);
    response.json(new ApiResponse(200, blocked, "Blocked users retrieved"));
  }
}

export const userController = new UserController();
