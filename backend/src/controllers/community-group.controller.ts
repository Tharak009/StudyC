import type { Request, Response } from "express";
import { communityGroupService } from "../services/community-group.service.js";
import { ApiResponse } from "../utils/api-response.js";
import type {
  AttachGroupInput,
  CreateGroupInput,
  UpdateGroupInput
} from "../validators/community-group.validator.js";

export class CommunityGroupController {
  async list(request: Request, response: Response) {
    const groups = await communityGroupService.listGroups(param(request, "communityId"));
    response.json(new ApiResponse(200, groups, "Community groups retrieved"));
  }

  async create(request: Request, response: Response) {
    const group = await communityGroupService.createGroup(
      param(request, "communityId"),
      request.user!.id,
      request.body as CreateGroupInput,
      request.user?.role
    );
    response.status(201).json(new ApiResponse(201, group, "Community group created"));
  }

  async attach(request: Request, response: Response) {
    const group = await communityGroupService.attachExistingGroup(
      param(request, "communityId"),
      request.user!.id,
      request.body as AttachGroupInput,
      request.user?.role
    );
    response.status(201).json(new ApiResponse(201, group, "Existing group attached to community"));
  }

  async get(request: Request, response: Response) {
    const group = await communityGroupService.getGroup(
      param(request, "communityId"),
      param(request, "groupId")
    );
    response.json(new ApiResponse(200, group, "Community group retrieved"));
  }

  async update(request: Request, response: Response) {
    const group = await communityGroupService.updateGroup(
      param(request, "communityId"),
      param(request, "groupId"),
      request.user!.id,
      request.body as UpdateGroupInput,
      request.user?.role
    );
    response.json(new ApiResponse(200, group, "Community group updated"));
  }

  async archive(request: Request, response: Response) {
    const group = await communityGroupService.archiveGroup(
      param(request, "communityId"),
      param(request, "groupId"),
      request.user!.id,
      request.user?.role
    );
    response.json(new ApiResponse(200, group, "Community group archived"));
  }

  async delete(request: Request, response: Response) {
    await communityGroupService.deleteGroup(
      param(request, "communityId"),
      param(request, "groupId"),
      request.user!.id,
      request.user?.role
    );
    response.json(new ApiResponse(200, null, "Community group deleted"));
  }
}

export const communityGroupController = new CommunityGroupController();

const param = (request: Request, key: string): string => request.params[key] as string;
