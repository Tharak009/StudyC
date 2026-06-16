import type { Request, Response } from "express";
import { resourceService } from "../services/resource.service.js";
import { ApiResponse } from "../utils/api-response.js";
import type { CreateResourceInput, ListResourcesQuery, UpdateResourceInput } from "../validators/resource.validator.js";

export class ResourceController {
  async list(request: Request, response: Response) {
    const communityId = request.params.communityId as string | undefined;
    const resources = await resourceService.listResources(
      communityId,
      request.user!.id,
      request.validated?.query as ListResourcesQuery
    );
    response.json(new ApiResponse(200, resources, "Resources retrieved"));
  }

  async getById(request: Request, response: Response) {
    const resource = await resourceService.getResource(
      param(request, "resourceId"),
      request.user!.id
    );
    response.json(new ApiResponse(200, resource, "Resource retrieved"));
  }

  async create(request: Request, response: Response) {
    const resource = await resourceService.createResource(
      param(request, "communityId"),
      request.user!.id,
      request.body as CreateResourceInput,
      request.file!
    );
    response.status(201).json(new ApiResponse(201, resource, "Resource uploaded"));
  }

  async update(request: Request, response: Response) {
    const resource = await resourceService.updateResource(
      param(request, "resourceId"),
      request.user!.id,
      request.body as UpdateResourceInput,
      request.file
    );
    response.json(new ApiResponse(200, resource, "Resource updated"));
  }

  async delete(request: Request, response: Response) {
    await resourceService.deleteResource(
      param(request, "resourceId"),
      request.user!.id
    );
    response.json(new ApiResponse(200, null, "Resource deleted"));
  }

  async download(request: Request, response: Response) {
    const resource = await resourceService.trackDownload(
      param(request, "resourceId"),
      request.user!.id
    );
    response.json(new ApiResponse(200, resource, "Download tracked"));
  }
}

const param = (request: Request, key: string): string => request.params[key] as string;

export const resourceController = new ResourceController();
