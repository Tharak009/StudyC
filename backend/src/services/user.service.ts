import type { Express } from "express";
import { USER_STATUS } from "../constants/user-status.js";
import { ApiError } from "../utils/api-error.js";
import { userRepository, type IUserRepository } from "../repositories/user.repository.js";
import { StorageService, sharedStorageService } from "./storage.service.js";
import { blockService } from "./block.service.js";

export interface UpdateProfileInput {
  fullName?: string;
  department?: string;
  academicYear?: number;
  bio?: string;
  interests?: string[];
}

export class UserService {
  constructor(
    private readonly users: IUserRepository,
    private readonly storage: StorageService
  ) {}

  async getProfile(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new ApiError(404, "User profile not found", [], "USER_NOT_FOUND");
    return user.toJSON();
  }

  async getPublicProfile(targetUserId: string, currentUserId: string) {
    const isBlocked = await blockService.isBlocked(currentUserId, targetUserId);
    if (isBlocked) {
      throw new ApiError(403, "Cannot view profile of this user", [], "USER_BLOCKED");
    }

    const user = await this.users.findById(targetUserId);
    if (!user || user.status !== USER_STATUS.ACTIVE) {
      throw new ApiError(404, "User profile not found", [], "USER_NOT_FOUND");
    }

    return {
      id: user.id,
      fullName: user.fullName,
      department: user.department,
      academicYear: user.academicYear,
      profilePicture: user.profilePicture,
      bio: user.bio,
      interests: user.interests,
      karma: user.karma
    };
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await this.users.updateById(userId, { $set: input });
    if (!user) throw new ApiError(404, "User profile not found", [], "USER_NOT_FOUND");
    return user.toJSON();
  }

  async searchUsers(query: string, currentUserId: string) {
    if (query.length < 2) return [];
    const blockedIds = await blockService.getBlockedUserIds(currentUserId);
    const excluded = [currentUserId, ...blockedIds];
    return this.users.search(query, excluded, 20);
  }

  async uploadProfilePicture(userId: string, file?: Express.Multer.File) {
    if (!file) throw new ApiError(400, "A profile picture is required", [], "FILE_REQUIRED");

    const existing = await this.users.findById(userId);
    if (!existing) throw new ApiError(404, "User profile not found", [], "USER_NOT_FOUND");

    const stored = await this.storage.uploadProfilePicture(file);
    const oldKey = existing.profilePicture?.replace(/^\/uploads\//, "");
    const user = await this.users.updateById(userId, { $set: { profilePicture: stored.url } });
    if (oldKey) await this.storage.delete(oldKey);
    return user?.toJSON();
  }
}

export const userService = new UserService(
  userRepository,
  sharedStorageService
);
