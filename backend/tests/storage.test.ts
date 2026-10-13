import { describe, expect, it, vi, beforeEach } from "vitest";
import { StorageService } from "../src/services/storage.service.js";
import { ResourceService } from "../src/services/resource.service.js";
import { UploadSession } from "../src/models/upload-session.model.js";
import { ApiError } from "../src/utils/api-error.js";
import { env } from "../src/config/env.js";
import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { communityRepository } from "../src/repositories/community.repository.js";

// ── Mocks ───────────────────────────────────────────────────────────────────


const mockStorageProvider = {
  save: vi.fn(),
  delete: vi.fn()
};

const mockResourceRepo = {
  list: vi.fn(),
  findById: vi.fn(),
  findByContentHash: vi.fn(),
  create: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
  incrementDownloadCount: vi.fn(),
  countOtherReferences: vi.fn()
};

const mockMemberRepo = {
  findMembership: vi.fn()
};

describe("Smart Cloud Upload Engine — Unit Tests", () => {
  let storageService: StorageService;
  let resourceService: ResourceService;

  beforeEach(() => {
    vi.restoreAllMocks();
    (env as any).STORAGE_MODE = "LOCAL";
    (env as any).S3_BUCKET = undefined;
    (env as any).S3_ACCESS_KEY = undefined;
    (env as any).S3_SECRET_KEY = undefined;
    (env as any).S3_ENDPOINT = undefined;

    storageService = new StorageService(mockStorageProvider as any);
    resourceService = new ResourceService(
      mockResourceRepo as any,
      mockMemberRepo as any,
      storageService
    );
  });

  describe("StorageService", () => {
    it("detects local mode by default", () => {
      expect(storageService.isCloudActive()).toBe(false);
    });

    it("generates local upload ID and local part URL when cloud is inactive", async () => {
      const uploadId = await storageService.initiateMultipartUpload("uploads/comm1/test.pdf", "application/pdf");
      expect(uploadId).toMatch(/^local-upload-/);

      const partUrl = await storageService.generatePresignedPartUrl("uploads/comm1/test.pdf", uploadId, 1);
      expect(partUrl).toContain("/api/resources/upload/local-part-upload");
    });

    it("throws error when STORAGE_MODE=CLOUD but credentials missing", () => {
      (env as any).STORAGE_MODE = "CLOUD";
      (env as any).S3_BUCKET = undefined;
      (env as any).S3_ACCESS_KEY = undefined;
      (env as any).S3_SECRET_KEY = undefined;

      expect(() => new StorageService(mockStorageProvider as any)).toThrow(
        /Production storage mode is configured as CLOUD/
      );
    });
  });

  describe("ResourceService — Upload Initiation", () => {
    it("initiates upload for active community member", async () => {
      mockMemberRepo.findMembership.mockResolvedValue({
        communityId: "507f1f77bcf86cd799439011",
        userId: "user-456",
        role: "MEMBER",
        status: "ACTIVE"
      });

      vi.spyOn(UploadSession, "create").mockResolvedValue({
        _id: { toString: () => "session-789" },
        uploadId: "local-upload-123",
        s3Key: "uploads/507f1f77bcf86cd799439011/uuid_test.pdf",
        totalParts: 2,
        fileName: "test.pdf"
      } as any);

      const result = await resourceService.initiateUpload("507f1f77bcf86cd799439011", "user-456", {
        fileName: "test.pdf",
        fileSize: 10 * 1024 * 1024,
        mimeType: "application/pdf",
        totalParts: 2,
        title: "Test File",
        description: "Desc",
        category: "NOTES",
        visibility: "COMMUNITY",
        tags: ["pdf"]
      });

      expect(result.sessionId).toBe("session-789");
      expect(result.totalParts).toBe(2);
      expect(result.partSize).toBe(5 * 1024 * 1024);
      expect(result.directCloud).toBe(false);
    });

    it("resolves community slug to ObjectId when initiating upload with slug (e.g. campus-vault)", async () => {
      vi.spyOn(communityRepository, "findBySlug").mockResolvedValue({
        _id: { toString: () => "507f1f77bcf86cd799439011" }
      } as any);

      mockMemberRepo.findMembership.mockResolvedValue({
        communityId: "507f1f77bcf86cd799439011",
        userId: "user-456",
        role: "MEMBER",
        status: "ACTIVE"
      });

      vi.spyOn(UploadSession, "create").mockResolvedValue({
        _id: { toString: () => "session-789" },
        uploadId: "local-upload-123",
        s3Key: "uploads/507f1f77bcf86cd799439011/uuid_test.pdf",
        totalParts: 2,
        fileName: "test.pdf"
      } as any);

      const result = await resourceService.initiateUpload("campus-vault", "user-456", {
        fileName: "test.pdf",
        fileSize: 10 * 1024 * 1024,
        mimeType: "application/pdf",
        totalParts: 2,
        title: "Test File",
        description: "Desc",
        category: "NOTES",
        visibility: "COMMUNITY",
        tags: ["pdf"]
      });

      expect(result.sessionId).toBe("session-789");
      expect(communityRepository.findBySlug).toHaveBeenCalledWith("campus-vault");
    });


    it("rejects file size > 1 GB", async () => {
      mockMemberRepo.findMembership.mockResolvedValue({
        communityId: "507f1f77bcf86cd799439011",
        userId: "user-456",
        role: "MEMBER",
        status: "ACTIVE"
      });

      await expect(
        resourceService.initiateUpload("507f1f77bcf86cd799439011", "user-456", {
          fileName: "huge.iso",
          fileSize: 1024 * 1024 * 1024 + 1,
          mimeType: "application/octet-stream",
          totalParts: 5,
          title: "Huge ISO",
          description: "",
          category: "NOTES",
          visibility: "COMMUNITY",
          tags: []
        })
      ).rejects.toThrow(ApiError);
    });

    it("rejects non-community member initiation", async () => {
      mockMemberRepo.findMembership.mockResolvedValue(null);

      await expect(
        resourceService.initiateUpload("507f1f77bcf86cd799439011", "user-stranger", {
          fileName: "test.pdf",
          fileSize: 1000,
          mimeType: "application/pdf",
          totalParts: 1,
          title: "Test",
          description: "",
          category: "NOTES",
          visibility: "COMMUNITY",
          tags: []
        })
      ).rejects.toThrow(/membership is required/i);
    });
  });

  describe("ResourceService — Part URLs", () => {
    it("generates part URLs for session owner", async () => {
      vi.spyOn(UploadSession, "findById").mockResolvedValue({
        _id: "session-789",
        userId: { toString: () => "user-456" },
        status: "INITIATED",
        totalParts: 3,
        s3Key: "uploads/507f1f77bcf86cd799439011/file.pdf",
        uploadId: "local-123",
        expiresAt: new Date(Date.now() + 3600000),
        save: vi.fn().mockResolvedValue(true)
      } as any);

      const partUrls = await resourceService.getPartUrls("session-789", "user-456", [1, 2]);

      expect(partUrls).toHaveLength(2);
      expect(partUrls![0]!.partNumber).toBe(1);
      expect(partUrls![1]!.partNumber).toBe(2);
    });

    it("rejects non-owner attempt to fetch part URLs with 403", async () => {
      vi.spyOn(UploadSession, "findById").mockResolvedValue({
        _id: "session-789",
        userId: { toString: () => "user-456" },
        status: "INITIATED",
        totalParts: 3,
        expiresAt: new Date(Date.now() + 3600000)
      } as any);

      await expect(
        resourceService.getPartUrls("session-789", "user-stranger", [1])
      ).rejects.toThrow(ApiError);
    });

    it("rejects request if session is expired or completed", async () => {
      vi.spyOn(UploadSession, "findById").mockResolvedValue({
        _id: "session-789",
        userId: { toString: () => "user-456" },
        status: "COMPLETED",
        totalParts: 3,
        expiresAt: new Date(Date.now() + 3600000)
      } as any);

      await expect(
        resourceService.getPartUrls("session-789", "user-456", [1])
      ).rejects.toThrow(/already completed/i);
    });

    it("saves local part chunk looking up UploadSession by string uploadId", async () => {
      vi.spyOn(UploadSession, "findOne").mockResolvedValue({
        _id: "607f1f77bcf86cd799439011",
        uploadId: "local-upload-12345",
        userId: { toString: () => "user-456" },
        status: "IN_PROGRESS"
      } as any);

      vi.spyOn(storageService, "saveLocalPart").mockResolvedValue('"etag-1"');

      const etag = await resourceService.saveLocalPart("local-upload-12345", "user-456", 1, {} as any);
      expect(etag).toBe('"etag-1"');
      expect(UploadSession.findOne).toHaveBeenCalledWith({ uploadId: "local-upload-12345" });
    });
  });

  describe("ResourceService — Complete Upload", () => {
    it("completes upload, updates session status, and creates Resource", async () => {
      const saveSpy = vi.fn().mockResolvedValue(true);

      vi.spyOn(UploadSession, "findById").mockResolvedValue({
        _id: "session-789",
        userId: { toString: () => "user-456" },
        communityId: { toString: () => "507f1f77bcf86cd799439011" },
        status: "IN_PROGRESS",
        totalParts: 2,
        s3Key: "uploads/507f1f77bcf86cd799439011/file.pdf",
        uploadId: "local-123",
        fileName: "file.pdf",
        fileSize: 1000,
        mimeType: "application/pdf",
        title: "Test File",
        description: "Desc",
        category: "NOTES",
        visibility: "COMMUNITY",
        tags: ["pdf"],
        expiresAt: new Date(Date.now() + 3600000),
        save: saveSpy
      } as any);

      mockResourceRepo.create.mockResolvedValue({ id: "res-999" });
      mockResourceRepo.findById.mockResolvedValue({ _id: "res-999", title: "Test File" });

      const resource = await resourceService.completeUpload("session-789", "user-456", {
        completedParts: [
          { partNumber: 1, etag: '"etag-1"' },
          { partNumber: 2, etag: '"etag-2"' }
        ]
      });

      expect(resource).toBeDefined();
      expect(resource!._id).toBe("res-999");
      expect(saveSpy).toHaveBeenCalled();
    });

    it("prevents duplicate completion", async () => {
      vi.spyOn(UploadSession, "findById").mockResolvedValue({
        _id: "session-789",
        userId: { toString: () => "user-456" },
        status: "COMPLETED",
        totalParts: 2,
        expiresAt: new Date(Date.now() + 3600000)
      } as any);

      await expect(
        resourceService.completeUpload("session-789", "user-456", {
          completedParts: [{ partNumber: 1, etag: '"etag-1"' }]
        })
      ).rejects.toThrow(/already been completed/i);
    });

    it("rejects completion with duplicate part numbers", async () => {
      vi.spyOn(UploadSession, "findById").mockResolvedValue({
        _id: "session-789",
        userId: { toString: () => "user-456" },
        status: "IN_PROGRESS",
        totalParts: 2,
        expiresAt: new Date(Date.now() + 3600000)
      } as any);

      await expect(
        resourceService.completeUpload("session-789", "user-456", {
          completedParts: [
            { partNumber: 1, etag: '"etag-1"' },
            { partNumber: 1, etag: '"etag-2"' }
          ]
        })
      ).rejects.toThrow(/Duplicate part number/i);
    });

    it("rejects completion with missing ETag", async () => {
      vi.spyOn(UploadSession, "findById").mockResolvedValue({
        _id: "session-789",
        userId: { toString: () => "user-456" },
        status: "IN_PROGRESS",
        totalParts: 1,
        expiresAt: new Date(Date.now() + 3600000)
      } as any);

      await expect(
        resourceService.completeUpload("session-789", "user-456", {
          completedParts: [{ partNumber: 1, etag: "  " }]
        })
      ).rejects.toThrow(/Missing or invalid ETag/i);
    });
  });

  describe("ResourceService — Abort Upload", () => {
    it("aborts active upload session and cleans up", async () => {
      const saveSpy = vi.fn().mockResolvedValue(true);

      vi.spyOn(UploadSession, "findById").mockResolvedValue({
        _id: "session-789",
        userId: { toString: () => "user-456" },
        status: "IN_PROGRESS",
        s3Key: "uploads/507f1f77bcf86cd799439011/file.pdf",
        uploadId: "local-123",
        save: saveSpy
      } as any);

      await resourceService.abortUpload("session-789", "user-456");

      expect(saveSpy).toHaveBeenCalled();
    });

    it("rejects non-owner abort attempt with 403", async () => {
      vi.spyOn(UploadSession, "findById").mockResolvedValue({
        _id: "session-789",
        userId: { toString: () => "user-456" },
        status: "IN_PROGRESS"
      } as any);

      await expect(
        resourceService.abortUpload("session-789", "user-stranger")
      ).rejects.toThrow(ApiError);
    });
  });

  describe("ResourceService — Download URL & Authorization", () => {
    it("generates download URL for active community member and tracks download", async () => {
      mockResourceRepo.findById.mockResolvedValue({
        _id: "res-999",
        fileName: "lecture.pdf",
        fileUrl: "uploads/507f1f77bcf86cd799439011/lecture.pdf",
        communityId: { _id: { toString: () => "507f1f77bcf86cd799439011" } }
      });

      mockMemberRepo.findMembership.mockResolvedValue({
        communityId: "507f1f77bcf86cd799439011",
        userId: "user-456",
        role: "MEMBER",
        status: "ACTIVE"
      });

      const result = await resourceService.getDownloadUrl("res-999", "user-456");

      expect(result.downloadUrl).toBeDefined();
      expect(mockResourceRepo.incrementDownloadCount).toHaveBeenCalledWith("res-999");
    });

    it("rejects download for non-community member with 403", async () => {
      mockResourceRepo.findById.mockResolvedValue({
        _id: "res-999",
        fileName: "lecture.pdf",
        fileUrl: "uploads/507f1f77bcf86cd799439011/lecture.pdf",
        communityId: { _id: { toString: () => "507f1f77bcf86cd799439011" } }
      });

      mockMemberRepo.findMembership.mockResolvedValue(null);

      await expect(
        resourceService.getDownloadUrl("res-999", "user-stranger")
      ).rejects.toThrow(/membership is required/i);
    });
  });

  describe("Backblaze B2 & Cloud Storage Enhancements", () => {
    it("activates cloud storage mode and parses endpoint when configured", () => {
      (env as any).STORAGE_MODE = "CLOUD";
      (env as any).S3_BUCKET = "studyconnect-test-uploads";
      (env as any).S3_ACCESS_KEY = "test-key-id";
      (env as any).S3_SECRET_KEY = "test-app-key";
      (env as any).S3_ENDPOINT = "s3.eu-central-003.backblazeb2.com";
      (env as any).S3_REGION = "eu-central-003";

      const cloudStorage = new StorageService(mockStorageProvider as any);
      expect(cloudStorage.isCloudActive()).toBe(true);
    });

    it("extractCloudKey correctly parses various URL and key formats", () => {
      (env as any).STORAGE_MODE = "CLOUD";
      (env as any).S3_BUCKET = "studyconnect-test-uploads";
      (env as any).S3_ACCESS_KEY = "test-key-id";
      (env as any).S3_SECRET_KEY = "test-app-key";

      const cloudStorage = new StorageService(mockStorageProvider as any);

      // Path-style B2 URL
      expect(
        cloudStorage.extractCloudKey(
          "https://s3.eu-central-003.backblazeb2.com/studyconnect-test-uploads/vault/notes_123.pdf"
        )
      ).toBe("vault/notes_123.pdf");

      // Virtual-hosted style B2 URL
      expect(
        cloudStorage.extractCloudKey(
          "https://studyconnect-test-uploads.s3.eu-central-003.backblazeb2.com/vault/notes_123.pdf"
        )
      ).toBe("vault/notes_123.pdf");

      // Direct cloud key
      expect(cloudStorage.extractCloudKey("vault/notes_123.pdf")).toBe("vault/notes_123.pdf");

      // Local /uploads path should return null
      expect(cloudStorage.extractCloudKey("/uploads/vault/notes_123.pdf")).toBeNull();
      expect(cloudStorage.extractCloudKey("")).toBeNull();
    });

    it("deletes cloud object on resource deletion when no other references exist", async () => {
      const mockStorage = {
        isCloudActive: () => true,
        deleteCloudObject: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined)
      };

      const resService = new ResourceService(
        mockResourceRepo as any,
        mockMemberRepo as any,
        mockStorage as any
      );

      mockResourceRepo.findById.mockResolvedValue({
        id: "res-cloud-1",
        fileUrl: "https://s3.eu-central-003.backblazeb2.com/studyconnect-test-uploads/vault/cloud-file.pdf",
        contentHash: "hash-123",
        uploadedBy: "user-admin",
        communityId: null
      });

      // otherRefCount is 0
      mockResourceRepo.countOtherReferences.mockResolvedValue(0);
      mockResourceRepo.deleteById.mockResolvedValue(true);

      const deleted = await resService.deleteResource("res-cloud-1", "user-admin");
      expect(deleted).toBe(true);
      expect(mockStorage.deleteCloudObject).toHaveBeenCalledWith(
        "https://s3.eu-central-003.backblazeb2.com/studyconnect-test-uploads/vault/cloud-file.pdf"
      );
    });

    it("skips cloud object deletion if duplicate resource references the same content", async () => {
      const mockStorage = {
        isCloudActive: () => true,
        deleteCloudObject: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined)
      };

      const resService = new ResourceService(
        mockResourceRepo as any,
        mockMemberRepo as any,
        mockStorage as any
      );

      mockResourceRepo.findById.mockResolvedValue({
        id: "res-cloud-1",
        fileUrl: "https://s3.eu-central-003.backblazeb2.com/studyconnect-test-uploads/vault/shared-file.pdf",
        contentHash: "hash-shared",
        uploadedBy: "user-admin",
        communityId: null
      });

      // otherRefCount is 1 (another resource points to the same file)
      mockResourceRepo.countOtherReferences.mockResolvedValue(1);
      mockResourceRepo.deleteById.mockResolvedValue(true);

      const deleted = await resService.deleteResource("res-cloud-1", "user-admin");
      expect(deleted).toBe(true);
      expect(mockStorage.deleteCloudObject).not.toHaveBeenCalled();
    });

    it("preserves local file deletion for /uploads/ without calling deleteCloudObject", async () => {
      const mockStorage = {
        isCloudActive: () => true,
        deleteCloudObject: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined)
      };

      const resService = new ResourceService(
        mockResourceRepo as any,
        mockMemberRepo as any,
        mockStorage as any
      );

      mockResourceRepo.findById.mockResolvedValue({
        id: "res-local-1",
        fileUrl: "/uploads/vault/local-doc.pdf",
        contentHash: "hash-local",
        uploadedBy: "user-admin",
        communityId: null
      });

      mockResourceRepo.countOtherReferences.mockResolvedValue(0);
      mockResourceRepo.deleteById.mockResolvedValue(true);

      const deleted = await resService.deleteResource("res-local-1", "user-admin");
      expect(deleted).toBe(true);
      expect(mockStorage.deleteCloudObject).not.toHaveBeenCalled();
    });

    it("generates presigned preview URL for unconverted cloud resources", async () => {
      const mockStorage = {
        isCloudActive: () => true,
        generatePresignedPreviewUrl: vi.fn().mockResolvedValue("https://signed-preview-url.com")
      };

      const resService = new ResourceService(
        mockResourceRepo as any,
        mockMemberRepo as any,
        mockStorage as any
      );

      mockResourceRepo.findById.mockResolvedValue({
        id: "res-pdf-cloud",
        fileUrl: "https://s3.eu-central-003.backblazeb2.com/studyconnect-test-uploads/vault/paper.pdf",
        fileName: "paper.pdf",
        fileType: "application/pdf",
        communityId: null
      });

      const previewInfo = await resService.getPreviewUrl("res-pdf-cloud", "user-123");
      expect(mockStorage.generatePresignedPreviewUrl).toHaveBeenCalledWith(
        "https://s3.eu-central-003.backblazeb2.com/studyconnect-test-uploads/vault/paper.pdf"
      );
      expect(previewInfo.previewUrl).toBe("https://signed-preview-url.com");
      expect(previewInfo.isConvertedPdf).toBe(false);
    });
  });
});

// ── Opt-in Live Backblaze B2 / S3 Integration Test ─────────────────────────

const runLiveTest =
  process.env.RUN_B2_INTEGRATION_TESTS === "true" ||
  process.env.RUN_R2_INTEGRATION_TESTS === "true";

(runLiveTest ? describe : describe.skip)("Live Backblaze B2 Cloud Integration Test", () => {
  it("performs real multipart upload, complete, download byte comparison, and cleanup", async () => {
    const bucket = process.env.S3_BUCKET;
    const accessKey = process.env.S3_ACCESS_KEY;
    const secretKey = process.env.S3_SECRET_KEY;
    const endpoint = process.env.S3_ENDPOINT;

    if (!bucket || !accessKey || !secretKey) {
      throw new Error("Live B2 integration test enabled but credentials are missing!");
    }

    let formattedEndpoint = endpoint?.trim();
    if (formattedEndpoint && !formattedEndpoint.startsWith("http://") && !formattedEndpoint.startsWith("https://")) {
      formattedEndpoint = `https://${formattedEndpoint}`;
    }

    const s3Client = new S3Client({
      region: process.env.S3_REGION || "auto",
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
      endpoint: formattedEndpoint || undefined,
      forcePathStyle: true
    });

    const key = `integration-tests/test-live-b2-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.txt`;
    const originalData = Buffer.from("StudyConnect Backblaze B2 Live Multipart Test " + Date.now() + " - " + "X".repeat(1024));

    let uploadId: string | null = null;
    let completedSuccessfully = false;

    try {
      // 1. Initiate Multipart Upload
      const createRes = await s3Client.send(
        new CreateMultipartUploadCommand({
          Bucket: bucket,
          Key: key,
          ContentType: "text/plain"
        })
      );
      uploadId = createRes.UploadId || null;
      expect(uploadId).toBeDefined();
      expect(typeof uploadId).toBe("string");

      // 2. Generate Presigned Part URL for Part 1
      const uploadPartCommand = new UploadPartCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId!,
        PartNumber: 1
      });
      const presignedPartUrl = await getSignedUrl(s3Client, uploadPartCommand, { expiresIn: 1800 });
      expect(presignedPartUrl).toBeDefined();

      // 3. Upload file part via HTTP PUT to presigned URL
      const putRes = await fetch(presignedPartUrl, {
        method: "PUT",
        body: originalData,
        headers: { "Content-Type": "text/plain" }
      });
      expect(putRes.ok).toBe(true);

      let etag = putRes.headers.get("etag") || putRes.headers.get("ETag");
      expect(etag).toBeDefined();
      let formattedEtag = etag!.trim();
      if (!formattedEtag.startsWith('"')) formattedEtag = `"${formattedEtag}`;
      if (!formattedEtag.endsWith('"')) formattedEtag = `${formattedEtag}"`;

      // 4. Complete Multipart Upload
      await s3Client.send(
        new CompleteMultipartUploadCommand({
          Bucket: bucket,
          Key: key,
          UploadId: uploadId!,
          MultipartUpload: {
            Parts: [{ PartNumber: 1, ETag: formattedEtag }]
          }
        })
      );
      completedSuccessfully = true;

      // 5. Generate Presigned Download URL and Verify Downloaded Bytes Match Original Data
      const getObjectCommand = new GetObjectCommand({
        Bucket: bucket,
        Key: key
      });
      const downloadPresignedUrl = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: 3600 });
      expect(downloadPresignedUrl).toBeDefined();

      const downloadRes = await fetch(downloadPresignedUrl);
      expect(downloadRes.ok).toBe(true);
      const downloadedBuffer = Buffer.from(await downloadRes.arrayBuffer());

      expect(downloadedBuffer.equals(originalData)).toBe(true);
    } finally {
      // 6. Cleanup: Abort if uncompleted, and delete created object
      if (uploadId && !completedSuccessfully) {
        await s3Client
          .send(new AbortMultipartUploadCommand({ Bucket: bucket, Key: key, UploadId: uploadId }))
          .catch(() => {});
      }
      await s3Client
        .send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
        .catch(() => {});
    }
  }, 60_000);
});

