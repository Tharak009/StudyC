import type { Request, Response } from "express";
import { userService } from "../services/user.service.js";
import { ApiResponse } from "../utils/api-response.js";
import type { UpdateProfileInput } from "../validators/user.validator.js";

export class UserController {
  async profile(request: Request, response: Response) {
    const profile = await userService.getProfile(request.user!.id);
    response.json(new ApiResponse(200, profile, "Profile retrieved"));
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
}

export const userController = new UserController();
