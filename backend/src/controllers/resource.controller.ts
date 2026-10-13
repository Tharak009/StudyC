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
      request.user!.id,
      request.user!.role
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

  async rate(request: Request, response: Response) {
    const resource = await resourceService.rateResource(
      param(request, "resourceId"),
      request.user!.id,
      request.body.rating
    );
    response.json(new ApiResponse(200, resource, "Resource rated"));
  }

  // ── Smart Cloud Upload Engine Handlers ────────────────────────────────────

  async initiateUpload(request: Request, response: Response) {
    const result = await resourceService.initiateUpload(
      param(request, "communityId"),
      request.user!.id,
      request.body
    );
    response.status(201).json(new ApiResponse(201, result, "Upload initiated"));
  }

  async getPartUrls(request: Request, response: Response) {
    const rawParts = request.query.parts as string;
    const partNumbers = rawParts
      ? rawParts.split(",").map((p) => parseInt(p.trim(), 10)).filter((p) => !isNaN(p))
      : [];
    const result = await resourceService.getPartUrls(
      param(request, "sessionId"),
      request.user!.id,
      partNumbers
    );
    response.json(new ApiResponse(200, result, "Part URLs generated"));
  }

  async completeUpload(request: Request, response: Response) {
    const resource = await resourceService.completeUpload(
      param(request, "sessionId"),
      request.user!.id,
      request.body
    );
    response.json(new ApiResponse(200, resource, "Upload completed"));
  }

  async abortUpload(request: Request, response: Response) {
    await resourceService.abortUpload(
      param(request, "sessionId"),
      request.user!.id
    );
    response.json(new ApiResponse(200, null, "Upload aborted"));
  }

  async getDownloadUrl(request: Request, response: Response) {
    const result = await resourceService.getDownloadUrl(
      param(request, "resourceId"),
      request.user!.id
    );
    response.json(new ApiResponse(200, result, "Download URL generated"));
  }

  async getPreviewUrl(request: Request, response: Response) {
    const result = await resourceService.getPreviewUrl(
      param(request, "resourceId"),
      request.user!.id
    );
    response.json(new ApiResponse(200, result, "Preview URL generated"));
  }

  async saveLocalPart(request: Request, response: Response) {
    const sessionId = (request.query.sessionId || request.query.uploadId) as string;
    const partNumber = parseInt(request.query.partNumber as string, 10);
    const etag = await resourceService.saveLocalPart(
      sessionId,
      request.user!.id,
      partNumber,
      request
    );
    response.setHeader("ETag", etag);
    response.json(new ApiResponse(200, { etag }, "Local part saved"));
  }
}

const param = (request: Request, key: string): string => request.params[key] as string;

export const resourceController = new ResourceController();

