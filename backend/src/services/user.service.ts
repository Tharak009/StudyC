import type { Express } from "express";
import { ApiError } from "../utils/api-error.js";
import { userRepository, type IUserRepository } from "../repositories/user.repository.js";
import { LocalStorageProvider } from "../uploads/local-storage.provider.js";
import { StorageService } from "./storage.service.js";

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

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await this.users.updateById(userId, { $set: input });
    if (!user) throw new ApiError(404, "User profile not found", [], "USER_NOT_FOUND");
    return user.toJSON();
  }

  async searchUsers(query: string, currentUserId: string) {
    if (query.length < 2) return [];
    return this.users.search(query, currentUserId, 20);
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
  new StorageService(new LocalStorageProvider())
);
