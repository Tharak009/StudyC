import { randomUUID, createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { Express } from "express";
import { Readable } from "node:stream";
import mongoose, { isValidObjectId } from "mongoose";
import { env } from "../config/env.js";
import { COMMUNITY_ROLES } from "../constants/community-roles.js";
import { isActiveMember, isRestrictedMember } from "../constants/community-membership.js";
import { isPrivateCommunity } from "../constants/community.js";
import { communityMemberRepository, type CommunityMemberRepository } from "../repositories/community-member.repository.js";
import { communityRepository } from "../repositories/community.repository.js";
import { resourceRepository, type ResourceRepository } from "../repositories/resource.repository.js";
import { UploadSession } from "../models/upload-session.model.js";
import { ApiError } from "../utils/api-error.js";
import { StorageService, sharedStorageService } from "./storage.service.js";
import { previewConverterService } from "./preview-converter.service.js";
import type {
  CreateResourceInput,
  ListResourcesQuery,
  UpdateResourceInput,
  InitiateUploadInput,
  CompleteUploadInput
} from "../validators/resource.validator.js";

export class ResourceService {
  constructor(
    private readonly resources: ResourceRepository,
    private readonly members: CommunityMemberRepository,
    private readonly storage: StorageService
  ) {}

  private async isVaultCommunity(communityId?: string): Promise<{ isVault: boolean; resolvedId?: string }> {
    if (!communityId || communityId === "campus-vault") {
      let vaultComm: any = null;
      try {
        vaultComm = await communityRepository.findBySlug("campus-vault");
      } catch {
        // ignore if database not connected in standalone unit tests
      }
      return { isVault: true, resolvedId: vaultComm?._id?.toString() || vaultComm?.id };
    }
    if (mongoose.connection.readyState === 1) {
      if (isValidObjectId(communityId)) {
        const comm = await communityRepository.findById(communityId).catch(() => null);
        if (comm && (comm.slug === "campus-vault" || !isPrivateCommunity(comm.visibility) || comm.tags?.includes("academic-vault"))) {
          return { isVault: true, resolvedId: comm._id.toString() };
        }
      } else {
        const comm = await communityRepository.findBySlug(communityId).catch(() => null);
        if (comm && (comm.slug === "campus-vault" || !isPrivateCommunity(comm.visibility) || comm.tags?.includes("academic-vault"))) {
          return { isVault: true, resolvedId: comm._id.toString() };
        }
      }
    }
    return { isVault: false };
  }

  async listResources(communityId: string | undefined, userId: string, query: ListResourcesQuery) {
    if (communityId) {
      const { isVault, resolvedId } = await this.isVaultCommunity(communityId);
      if (isVault) {
        return this.resources.list({ communityId: resolvedId, ...query });
      }
      const { resolvedId: commId } = await this.requireMembership(communityId, userId);
      return this.resources.list({ communityId: commId, ...query });
    }
    return this.resources.list({ ...query });
  }

  async getResource(resourceId: string, userId: string) {
    const resource = await this.resources.findById(resourceId);
    if (!resource) throw new ApiError(404, "Resource not found", [], "RESOURCE_NOT_FOUND");
    if (resource.communityId && resource.visibility !== "PUBLIC") {
      const commIdStr = (resource.communityId as any)._id ? (resource.communityId as any)._id.toString() : resource.communityId.toString();
      const { isVault } = await this.isVaultCommunity(commIdStr);
      if (!isVault) {
        await this.requireMembership(commIdStr, userId);
      }
    }
    return resource;
  }

  async createResource(
    communityId: string | undefined,
    userId: string,
    input: CreateResourceInput,
    file: Express.Multer.File
  ) {
    let targetCommunityId: string | undefined;
    const { isVault, resolvedId: vaultId } = await this.isVaultCommunity(communityId);
    if (isVault) {
      targetCommunityId = vaultId;
    } else {
      const { resolvedId } = await this.requireMembership(communityId!, userId);
      targetCommunityId = resolvedId;
    }

    if (!file) throw new ApiError(400, "File is required", [], "FILE_REQUIRED");

    let contentHash: string | undefined;
    if (file.buffer) {
      contentHash = createHash("sha256").update(file.buffer).digest("hex");
      const existing = await this.resources.findByContentHash(contentHash);
      if (existing) {
        throw new ApiError(
          409,
          "A resource with identical file content already exists in the Academic Vault",
          [],
          "DUPLICATE_RESOURCE",
          {
            existingResource: {
              id: existing.id,
              title: existing.title,
              fileName: existing.fileName,
              fileUrl: existing.fileUrl
            }
          }
        );
      }
    }

    const stored = await this.storage.uploadResource(file);

    const extMatch = (file.originalname || "").match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch && extMatch[1] ? extMatch[1].toLowerCase() : "";
    const format = ext === "ipynb" ? "ipynb" : ["zip", "tar", "gz", "7z", "rar"].includes(ext) ? "zip" : ["pptx", "ppt"].includes(ext) ? "pptx" : ["docx", "doc"].includes(ext) ? "docx" : "pdf";

    try {
      const resource = await this.resources.create({
        title: input.title,
        description: input.description,
        fileName: file.originalname,
        fileUrl: stored.url,
        fileSize: stored.size,
        fileType: stored.mimeType,
        category: input.category,
        department: (input as any).department,
        semester: (input as any).semester,
        subjectCode: (input as any).subjectCode || input.tags?.[0]?.toUpperCase(),
        format,
        tags: input.tags,
        uploadedBy: userId,
        communityId: targetCommunityId,
        visibility: input.visibility,
        contentHash
      });

      // Background preview pre-conversion for Office documents to eliminate cold-start delay
      if (["pptx", "ppt", "docx", "doc"].includes(ext)) {
        void previewConverterService.getOrGeneratePreviewUrl(
          resource.id,
          resource.fileUrl,
          resource.fileName
        ).catch((err) => {
          console.warn(`[ResourceService] Background preview generation failed for ${resource.id}:`, err);
        });
      }

      return this.resources.findById(resource.id);
    } catch (err: any) {
      if (err?.code === 11000 && contentHash) {
        const existing = await this.resources.findByContentHash(contentHash);
        throw new ApiError(
          409,
          "A resource with identical file content already exists in the Academic Vault",
          [],
          "DUPLICATE_RESOURCE",
          {
            existingResource: {
              id: existing?.id,
              title: existing?.title,
              fileName: existing?.fileName,
              fileUrl: existing?.fileUrl
            }
          }
        );
      }
      throw err;
    }
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
      if (file.buffer) {
        update.contentHash = createHash("sha256").update(file.buffer).digest("hex");
      }
      const oldKey = existing.fileUrl.replace(/^\/uploads\//, "");
      await this.storage.delete(oldKey).catch(() => {});
    }

    const updated = await this.resources.updateById(resourceId, { $set: update });
    if (!updated) throw new ApiError(404, "Resource not found", [], "RESOURCE_NOT_FOUND");
    return updated;
  }

  async deleteResource(resourceId: string, userId: string, userRole?: string) {
    const resource = await this.resources.findById(resourceId);
    if (!resource) throw new ApiError(404, "Resource not found", [], "RESOURCE_NOT_FOUND");

    const uploaderIdStr = (resource.uploadedBy as any)?._id?.toString() || resource.uploadedBy?.toString();
    const isUploader = uploaderIdStr === userId;
    const isPlatformAdmin = userRole === "ADMIN";

    let isOwnerOrMod = false;
    if (resource.communityId) {
      const commIdStr = (resource.communityId as any)?._id?.toString() || resource.communityId?.toString();
      const { isVault } = await this.isVaultCommunity(commIdStr);
      if (!isVault) {
        try {
          const { membership } = await this.requireMembership(commIdStr, userId);
          isOwnerOrMod = membership.role === COMMUNITY_ROLES.OWNER || membership.role === COMMUNITY_ROLES.MODERATOR;
        } catch {
          // not a member of private community
        }
      }
    }

    if (!isUploader && !isPlatformAdmin && !isOwnerOrMod) {
      throw new ApiError(403, "Only the uploader or an authorized administrator can delete this resource", [], "RESOURCE_DELETE_FORBIDDEN");
    }

    // Clean up raw storage file if no other resource references it
    const otherRefCount = await this.resources.countOtherReferences(resource.fileUrl, resource.contentHash, resourceId);
    if (otherRefCount === 0) {
      if (resource.fileUrl.startsWith("/") || resource.fileUrl.startsWith("uploads/")) {
        const key = resource.fileUrl.replace(/^\/uploads\//, "");
        await this.storage.delete(key).catch(() => {});
      } else if (this.storage.isCloudActive()) {
        await this.storage.deleteCloudObject(resource.fileUrl);
      }
    }

    // Clean up temporary converted preview file if any
    await previewConverterService.cleanPreviewFile(resourceId).catch(() => {});

    const deleted = await this.resources.deleteById(resourceId);
    return deleted;
  }

  async trackDownload(resourceId: string, userId: string) {
    const resource = await this.resources.findById(resourceId);
    if (!resource) throw new ApiError(404, "Resource not found", [], "RESOURCE_NOT_FOUND");
    if (resource.communityId) {
      const commIdStr = resource.communityId._id.toString();
      const { isVault } = await this.isVaultCommunity(commIdStr);
      if (!isVault) {
        await this.requireMembership(commIdStr, userId);
      }
    }

    const updated = await this.resources.incrementDownloadCount(resourceId);
    return updated;
  }

  // ── Smart Cloud Upload Engine Methods ─────────────────────────────────────

  async initiateUpload(communityId: string | undefined, userId: string, input: InitiateUploadInput) {
    let resolvedId: string | undefined;
    const { isVault, resolvedId: vaultId } = await this.isVaultCommunity(communityId);
    if (isVault) {
      resolvedId = vaultId;
    } else {
      const res = await this.requireMembership(communityId!, userId);
      resolvedId = res.resolvedId;
    }

    if (input.fileSize > 1024 * 1024 * 1024) {
      throw new ApiError(400, "File size exceeds 1 GB limit", [], "FILE_TOO_LARGE");
    }

    const sanitizedFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const pathPrefix = resolvedId || "vault";
    const s3Key = `${pathPrefix}/${randomUUID()}_${sanitizedFileName}`;

    const uploadId = await this.storage.initiateMultipartUpload(s3Key, input.mimeType);

    const session = await UploadSession.create({
      s3Key,
      uploadId,
      communityId: resolvedId,
      userId,
      fileName: input.fileName,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      totalParts: input.totalParts,
      title: input.title,
      description: input.description,
      category: input.category,
      department: input.department,
      semester: input.semester,
      subjectCode: input.subjectCode,
      visibility: input.visibility,
      tags: input.tags,
      status: "INITIATED"
    });

    const partSize = Math.ceil(input.fileSize / input.totalParts);

    return {
      sessionId: session._id.toString(),
      uploadId: session.uploadId,
      key: session.s3Key,
      totalParts: session.totalParts,
      partSize,
      directCloud: this.storage.isCloudActive()
    };
  }

  async getPartUrls(sessionId: string, userId: string, partNumbers: number[]) {
    const session = await UploadSession.findById(sessionId);
    if (!session) {
      throw new ApiError(404, "Upload session not found", [], "SESSION_NOT_FOUND");
    }
    if (session.userId.toString() !== userId) {
      throw new ApiError(403, "Access denied: session belongs to another user", [], "SESSION_FORBIDDEN");
    }
    if (session.status === "COMPLETED" || session.status === "ABORTED") {
      throw new ApiError(400, `Upload session is already ${session.status.toLowerCase()}`, [], "SESSION_INACTIVE");
    }
    if (session.expiresAt < new Date()) {
      throw new ApiError(400, "Upload session has expired", [], "SESSION_EXPIRED");
    }

    const partUrls = await Promise.all(
      partNumbers.map(async (partNum) => {
        if (partNum < 1 || partNum > session.totalParts) {
          throw new ApiError(400, `Invalid part number: ${partNum}`, [], "INVALID_PART_NUMBER");
        }
        const url = await this.storage.generatePresignedPartUrl(session.s3Key, session.uploadId, partNum);
        return { partNumber: partNum, url };
      })
    );

    if (session.status === "INITIATED") {
      session.status = "IN_PROGRESS";
      await session.save();
    }

    return partUrls;
  }

  async completeUpload(sessionId: string, userId: string, input: CompleteUploadInput) {
    const session = await UploadSession.findById(sessionId);
    if (!session) {
      throw new ApiError(404, "Upload session not found", [], "SESSION_NOT_FOUND");
    }
    if (session.userId.toString() !== userId) {
      throw new ApiError(403, "Access denied: session belongs to another user", [], "SESSION_FORBIDDEN");
    }
    if (session.status === "COMPLETED") {
      throw new ApiError(400, "Upload session has already been completed", [], "SESSION_ALREADY_COMPLETED");
    }
    if (session.status === "ABORTED") {
      throw new ApiError(400, "Upload session has been aborted", [], "SESSION_ABORTED");
    }
    if (session.expiresAt < new Date()) {
      throw new ApiError(400, "Upload session has expired", [], "SESSION_EXPIRED");
    }

    const seenParts = new Set<number>();
    for (const part of input.completedParts) {
      if (part.partNumber < 1 || part.partNumber > session.totalParts) {
        throw new ApiError(400, `Invalid part number: ${part.partNumber}`, [], "INVALID_PART_NUMBER");
      }
      if (seenParts.has(part.partNumber)) {
        throw new ApiError(400, `Duplicate part number: ${part.partNumber}`, [], "DUPLICATE_PART");
      }
      seenParts.add(part.partNumber);
      if (!part.etag || !part.etag.trim()) {
        throw new ApiError(400, `Missing or invalid ETag for part ${part.partNumber}`, [], "MISSING_ETAG");
      }
    }

    const { fileUrl, contentHash } = await this.storage.completeMultipartUpload(
      session.s3Key,
      session.uploadId,
      input.completedParts
    );

    if (contentHash) {
      const existing = await this.resources.findByContentHash(contentHash);
      if (existing) {
        await this.storage.delete(session.s3Key).catch(() => {});
        session.status = "ABORTED";
        await session.save();
        throw new ApiError(
          409,
          "A resource with identical file content already exists in the Academic Vault",
          [],
          "DUPLICATE_RESOURCE",
          {
            existingResource: {
              id: existing.id,
              title: existing.title,
              fileName: existing.fileName,
              fileUrl: existing.fileUrl
            }
          }
        );
      }
    }

    session.completedParts = input.completedParts;
    session.status = "COMPLETED";
    await session.save();

    const extMatch = (session.fileName || "").match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch && extMatch[1] ? extMatch[1].toLowerCase() : "";
    const format = ext === "ipynb" ? "ipynb" : ["zip", "tar", "gz", "7z", "rar"].includes(ext) ? "zip" : ["pptx", "ppt"].includes(ext) ? "pptx" : ["docx", "doc"].includes(ext) ? "docx" : "pdf";

    try {
      const resource = await this.resources.create({
        title: session.title,
        description: session.description,
        fileName: session.fileName,
        fileUrl,
        fileSize: session.fileSize,
        fileType: session.mimeType,
        category: session.category as any,
        department: session.department,
        semester: session.semester,
        subjectCode: session.subjectCode || session.tags?.[0]?.toUpperCase(),
        format,
        tags: session.tags,
        uploadedBy: session.userId.toString(),
        communityId: session.communityId ? session.communityId.toString() : undefined,
        visibility: session.visibility as any,
        contentHash
      });

      // Background preview pre-conversion for Office documents to eliminate cold-start delay
      if (["pptx", "ppt", "docx", "doc"].includes(ext)) {
        void previewConverterService.getOrGeneratePreviewUrl(
          resource.id,
          resource.fileUrl,
          resource.fileName
        ).catch((err) => {
          console.warn(`[ResourceService] Background preview generation failed for ${resource.id}:`, err);
        });
      }

      return this.resources.findById(resource.id);
    } catch (err: any) {
      if (err?.code === 11000 && contentHash) {
        await this.storage.delete(session.s3Key).catch(() => {});
        const existing = await this.resources.findByContentHash(contentHash);
        throw new ApiError(
          409,
          "A resource with identical file content already exists in the Academic Vault",
          [],
          "DUPLICATE_RESOURCE",
          {
            existingResource: {
              id: existing?.id,
              title: existing?.title,
              fileName: existing?.fileName,
              fileUrl: existing?.fileUrl
            }
          }
        );
      }
      throw err;
    }
  }

  async abortUpload(sessionId: string, userId: string) {
    const session = await UploadSession.findById(sessionId);
    if (!session) return;
    if (session.userId.toString() !== userId) {
      throw new ApiError(403, "Access denied: session belongs to another user", [], "SESSION_FORBIDDEN");
    }
    if (session.status === "COMPLETED" || session.status === "ABORTED") {
      return;
    }

    await this.storage.abortMultipartUpload(session.s3Key, session.uploadId);
    session.status = "ABORTED";
    await session.save();
  }

  async getDownloadUrl(resourceId: string, userId: string) {
    const resource = await this.resources.findById(resourceId);
    if (!resource) {
      throw new ApiError(404, "Resource not found", [], "RESOURCE_NOT_FOUND");
    }

    if (resource.communityId && resource.visibility !== "PUBLIC") {
      const commIdStr = (resource.communityId as any)._id ? (resource.communityId as any)._id.toString() : resource.communityId.toString();
      const { isVault } = await this.isVaultCommunity(commIdStr);
      if (!isVault) {
        await this.requireMembership(commIdStr, userId);
      }
    }

    await this.resources.incrementDownloadCount(resourceId);

    const downloadUrl = await this.storage.generatePresignedDownloadUrl(
      resource.fileUrl,
      resource.fileName
    );

    const expiresAtSeconds = this.storage.isCloudActive() ? 3600 : 0;
    return { downloadUrl, expiresAtSeconds };
  }

  async getPreviewUrl(resourceId: string, userId: string) {
    const resource = await this.resources.findById(resourceId);
    if (!resource) {
      throw new ApiError(404, "Resource not found", [], "RESOURCE_NOT_FOUND");
    }

    if (resource.communityId && resource.visibility !== "PUBLIC") {
      const commIdStr = (resource.communityId as any)._id ? (resource.communityId as any)._id.toString() : resource.communityId.toString();
      const { isVault } = await this.isVaultCommunity(commIdStr);
      if (!isVault) {
        await this.requireMembership(commIdStr, userId);
      }
    }

    const convertedUrl = await previewConverterService.getOrGeneratePreviewUrl(
      resource.id,
      resource.fileUrl,
      resource.fileName
    );

    let previewUrl = convertedUrl || resource.fileUrl;
    const isConvertedPdf = Boolean(convertedUrl && convertedUrl !== resource.fileUrl);

    // If unconverted and stored in cloud, prioritize local file if it exists on disk for zero-latency HTTP 206 range streaming
    if (!isConvertedPdf && previewUrl && (previewUrl.startsWith("http://") || previewUrl.startsWith("https://"))) {
      const key = this.storage.extractCloudKey(previewUrl);
      if (key) {
        const uploadsRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);
        const candidatePaths = [
          path.resolve(uploadsRoot, key),
          path.resolve(process.cwd(), "backend", env.UPLOAD_DIR, key)
        ];
        for (const cand of candidatePaths) {
          if (fs.existsSync(cand)) {
            previewUrl = `/uploads/${key.replace(/\\/g, "/")}`;
            break;
          }
        }
      }
    }

    // If previewing an unconverted cloud file from private B2 storage and no local file exists, generate a short-lived presigned GET URL
    if (!isConvertedPdf && this.storage.isCloudActive() && previewUrl && !previewUrl.startsWith("/")) {
      previewUrl = await this.storage.generatePresignedPreviewUrl(previewUrl);
    }

    return {
      previewUrl,
      isConvertedPdf,
      originalFileUrl: resource.fileUrl,
      fileName: resource.fileName,
      fileType: resource.fileType
    };
  }

  async saveLocalPart(sessionIdOrUploadId: string, userId: string, partNumber: number, inputStream: Readable) {
    const session = isValidObjectId(sessionIdOrUploadId)
      ? await UploadSession.findById(sessionIdOrUploadId)
      : await UploadSession.findOne({ uploadId: sessionIdOrUploadId });

    if (!session) {
      throw new ApiError(404, "Upload session not found", [], "SESSION_NOT_FOUND");
    }
    if (session.userId.toString() !== userId) {
      throw new ApiError(403, "Access denied: session belongs to another user", [], "SESSION_FORBIDDEN");
    }
    const etag = await this.storage.saveLocalPart(session.uploadId, partNumber, inputStream);
    return etag;
  }

  async rateResource(resourceId: string, userId: string, rating: number) {
    const resource = await this.resources.findById(resourceId);
    if (!resource) throw new ApiError(404, "Resource not found", [], "RESOURCE_NOT_FOUND");
    if (resource.communityId) {
      const commIdStr = resource.communityId._id.toString();
      const { isVault } = await this.isVaultCommunity(commIdStr);
      if (!isVault) {
        await this.requireMembership(commIdStr, userId);
      }
    }
    const updated = await this.resources.addRating(resourceId, rating);
    return updated;
  }

  private async requireMembership(communityId: string, userId: string) {
    let resolvedId = communityId;
    if (!isValidObjectId(communityId)) {
      const community = await communityRepository.findBySlug(communityId);
      if (community) {
        resolvedId = community._id.toString();
      } else {
        throw new ApiError(404, "Community not found", [], "COMMUNITY_NOT_FOUND");
      }
    }

    const membership = await this.members.findMembership(resolvedId, userId);
    if (!membership || !isActiveMember(membership.status)) {
      if (membership && isRestrictedMember(membership.status)) {
        throw new ApiError(403, `Access restricted (${membership.status})`, [], "MEMBERSHIP_RESTRICTED");
      }
      throw new ApiError(403, "Active community membership is required", [], "RESOURCE_MEMBERSHIP_REQUIRED");
    }
    return { membership, resolvedId };
  }
}

export const resourceService = new ResourceService(
  resourceRepository,
  communityMemberRepository,
  sharedStorageService
);
