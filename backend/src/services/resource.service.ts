import type { Express } from "express";
import { COMMUNITY_ROLES } from "../constants/community-roles.js";
import { communityMemberRepository, type CommunityMemberRepository } from "../repositories/community-member.repository.js";
import { resourceRepository, type ResourceRepository } from "../repositories/resource.repository.js";
import { LocalStorageProvider } from "../uploads/local-storage.provider.js";
import { ApiError } from "../utils/api-error.js";
import { StorageService } from "./storage.service.js";
import type { CreateResourceInput, ListResourcesQuery, UpdateResourceInput } from "../validators/resource.validator.js";

export class ResourceService {
  constructor(
    private readonly resources: ResourceRepository,
    private readonly members: CommunityMemberRepository,
    private readonly storage: StorageService
  ) {}

  async listResources(communityId: string | undefined, userId: string, query: ListResourcesQuery) {
    if (communityId) {
      await this.requireMembership(communityId, userId);
      return this.resources.list({ communityId, ...query });
    }
    return this.resources.list({ ...query });
  }

  async getResource(resourceId: string, userId: string) {
    const resource = await this.resources.findById(resourceId);
    if (!resource) throw new ApiError(404, "Resource not found", [], "RESOURCE_NOT_FOUND");
    await this.requireMembership(resource.communityId._id.toString(), userId);
    return resource;
  }

  async createResource(
    communityId: string,
    userId: string,
    input: CreateResourceInput,
    file: Express.Multer.File
  ) {
    await this.requireMembership(communityId, userId);
    if (!file) throw new ApiError(400, "File is required", [], "FILE_REQUIRED");

    const stored = await this.storage.uploadResource(file);

    const resource = await this.resources.create({
      title: input.title,
      description: input.description,
      fileName: file.originalname,
      fileUrl: stored.url,
      fileSize: stored.size,
      fileType: stored.mimeType,
      category: input.category,
      tags: input.tags,
      uploadedBy: userId,
      communityId,
      visibility: input.visibility
    });

    return this.resources.findById(resource.id);
  }

  async updateResource(
    resourceId: string,
    userId: string,
    input: UpdateResourceInput,
    file?: Express.Multer.File
  ) {
    const existing = await this.resources.findById(resourceId);
    if (!existing) throw new ApiError(404, "Resource not found", [], "RESOURCE_NOT_FOUND");
    if (existing.uploadedBy._id.toString() !== userId) {
      throw new ApiError(403, "Only the uploader can edit this resource", [], "RESOURCE_EDIT_FORBIDDEN");
    }

    const update: Record<string, unknown> = {};
    if (input.title !== undefined) update.title = input.title;
    if (input.description !== undefined) update.description = input.description;
    if (input.category !== undefined) update.category = input.category;
    if (input.tags !== undefined) update.tags = input.tags;
    if (input.visibility !== undefined) update.visibility = input.visibility;

    if (file) {
      const stored = await this.storage.uploadResource(file);
      update.fileName = file.originalname;
      update.fileUrl = stored.url;
      update.fileSize = stored.size;
      update.fileType = stored.mimeType;
      const oldKey = existing.fileUrl.replace(/^\/uploads\//, "");
      await this.storage.delete(oldKey).catch(() => {});
    }

    const updated = await this.resources.updateById(resourceId, { $set: update });
    if (!updated) throw new ApiError(404, "Resource not found", [], "RESOURCE_NOT_FOUND");
    return updated;
  }

  async deleteResource(resourceId: string, userId: string) {
    const resource = await this.resources.findById(resourceId);
    if (!resource) throw new ApiError(404, "Resource not found", [], "RESOURCE_NOT_FOUND");

    const communityId = resource.communityId._id.toString();
    const membership = await this.members.findMembership(communityId, userId);
    if (!membership) throw new ApiError(403, "Community membership is required", [], "MEMBERSHIP_REQUIRED");

    const isOwner = membership.role === COMMUNITY_ROLES.OWNER;
    const isModerator = membership.role === COMMUNITY_ROLES.MODERATOR;
    const isUploader = resource.uploadedBy._id.toString() === userId;

    if (!isOwner && !isModerator && !isUploader) {
      throw new ApiError(403, "Only owners, moderators, and the uploader can delete this resource", [], "RESOURCE_DELETE_FORBIDDEN");
    }

    const deleted = await this.resources.deleteById(resourceId);
    const key = resource.fileUrl.replace(/^\/uploads\//, "");
    await this.storage.delete(key).catch(() => {});
    return deleted;
  }

  async trackDownload(resourceId: string, userId: string) {
    const resource = await this.resources.findById(resourceId);
    if (!resource) throw new ApiError(404, "Resource not found", [], "RESOURCE_NOT_FOUND");
    await this.requireMembership(resource.communityId._id.toString(), userId);

    const updated = await this.resources.incrementDownloadCount(resourceId);
    return updated;
  }

  private async requireMembership(communityId: string, userId: string) {
    const membership = await this.members.findMembership(communityId, userId);
    if (!membership) throw new ApiError(403, "Community membership is required", [], "RESOURCE_MEMBERSHIP_REQUIRED");
    return membership;
  }
}

export const resourceService = new ResourceService(
  resourceRepository,
  communityMemberRepository,
  new StorageService(new LocalStorageProvider())
);
