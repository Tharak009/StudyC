import type { Request, Response } from "express";
import { friendshipService } from "../services/friendship.service.js";
import { ApiResponse } from "../utils/api-response.js";

export class FriendshipController {
  async listFriends(request: Request, response: Response) {
    const friends = await friendshipService.listFriends(request.user!.id);
    response.json(new ApiResponse(200, friends, "Friends retrieved successfully"));
  }

  async listRequests(request: Request, response: Response) {
    const requests = await friendshipService.listRequests(request.user!.id);
    response.json(new ApiResponse(200, requests, "Friend requests retrieved successfully"));
  }

  async getStatus(request: Request, response: Response) {
    const userId = request.params.userId as string;
    const status = await friendshipService.getFriendshipStatus(request.user!.id, userId);
    response.json(new ApiResponse(200, status, "Friendship status retrieved"));
  }

  async sendRequest(request: Request, response: Response) {
    const userId = request.params.userId as string;
    const result = await friendshipService.sendFriendRequest(request.user!.id, userId);
    response.status(201).json(new ApiResponse(201, result, "Friend request sent"));
  }

  async cancelRequest(request: Request, response: Response) {
    const userId = request.params.userId as string;
    const result = await friendshipService.cancelFriendRequest(request.user!.id, userId);
    response.json(new ApiResponse(200, result, "Friend request cancelled"));
  }

  async acceptRequest(request: Request, response: Response) {
    const userId = request.params.userId as string;
    const result = await friendshipService.acceptFriendRequest(request.user!.id, userId);
    response.json(new ApiResponse(200, result, "Friend request accepted"));
  }

  async declineRequest(request: Request, response: Response) {
    const userId = request.params.userId as string;
    const result = await friendshipService.declineFriendRequest(request.user!.id, userId);
    response.json(new ApiResponse(200, result, "Friend request declined"));
  }

  async removeFriend(request: Request, response: Response) {
    const userId = request.params.userId as string;
    const result = await friendshipService.removeFriend(request.user!.id, userId);
    response.json(new ApiResponse(200, result, "Friend removed"));
  }
}

export const friendshipController = new FriendshipController();
