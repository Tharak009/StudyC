import type { Request, Response } from "express";
import { communityService } from "../services/community.service.js";
import { ApiResponse } from "../utils/api-response.js";
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
}

export const communityController = new CommunityController();

const param = (request: Request, key: string): string => request.params[key] as string;
