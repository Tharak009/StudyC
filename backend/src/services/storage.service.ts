import type { Express } from "express";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  PutBucketCorsCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env.js";
import { GridFSStorageProvider } from "../uploads/gridfs.provider.js";
import { ApiError } from "../utils/api-error.js";

export interface StoredFile {
  key: string;
  url: string;
  mimeType: string;
  size: number;
}

export interface CompleteUploadResult {
  fileUrl: string;
  contentHash: string;
}

export interface StorageProvider {
  save(file: Express.Multer.File, namespace: string): Promise<StoredFile>;
  delete(key: string): Promise<void>;
}

export class StorageService {
  private s3Client: S3Client | null = null;
  private bucket: string | null = null;
  private cloudStorageActive = false;

  constructor(private readonly provider: StorageProvider) {
    const isCloudConfigured = Boolean(
      env.S3_BUCKET && env.S3_ACCESS_KEY && env.S3_SECRET_KEY
    );

    if (env.STORAGE_MODE === "CLOUD" && !isCloudConfigured) {
      throw new Error(
        "Production storage mode is configured as CLOUD (STORAGE_MODE=CLOUD), but cloud credentials (S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY) are missing!"
      );
    }

    if (isCloudConfigured && env.STORAGE_MODE !== "LOCAL") {
      let endpoint = env.S3_ENDPOINT?.trim();
      if (endpoint && !endpoint.startsWith("http://") && !endpoint.startsWith("https://")) {
        endpoint = `https://${endpoint}`;
      }
      if (endpoint && endpoint.endsWith("/")) {
        endpoint = endpoint.slice(0, -1);
      }

      this.s3Client = new S3Client({
        region: env.S3_REGION || "auto",
        credentials: {
          accessKeyId: env.S3_ACCESS_KEY,
          secretAccessKey: env.S3_SECRET_KEY
        },
        endpoint: endpoint || undefined,
        forcePathStyle: true
      });
      this.bucket = env.S3_BUCKET;
      this.cloudStorageActive = true;
      void this.ensureBucketCors().catch(() => {});
    }
  }

  async ensureBucketCors(): Promise<void> {
    if (!this.cloudStorageActive || !this.s3Client || !this.bucket) {
      return;
    }
    try {
      await this.s3Client.send(
        new PutBucketCorsCommand({
          Bucket: this.bucket,
          CORSConfiguration: {
            CORSRules: [
              {
                AllowedOrigins: ["*"],
                AllowedMethods: ["GET", "PUT", "POST", "HEAD", "DELETE"],
                AllowedHeaders: ["*"],
                ExposeHeaders: ["ETag", "Content-Range", "Accept-Ranges", "Content-Length"],
                MaxAgeSeconds: 3600
              }
            ]
          }
        })
      );
    } catch (err: any) {
      console.warn("[StorageService] Could not ensure bucket CORS configuration:", err?.message);
    }
  }

  isCloudActive(): boolean {
    return this.cloudStorageActive;
  }

  async initiateMultipartUpload(key: string, contentType: string): Promise<string> {
    if (this.cloudStorageActive && this.s3Client && this.bucket) {
      try {
        const command = new CreateMultipartUploadCommand({
          Bucket: this.bucket,
          Key: key,
          ContentType: contentType || "application/octet-stream"
        });
        const res = await this.s3Client.send(command);
        if (!res.UploadId) {
          throw new ApiError(400, "Cloud upload initiation failed: missing upload ID", [], "CLOUD_INIT_FAILED");
        }
        return res.UploadId;
      } catch (err: any) {
        throw new ApiError(400, `Cloud upload initiation error: ${err?.message || "S3 error"}`, [], "CLOUD_INIT_FAILED");
      }
    }
    return `local-upload-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  async generatePresignedPartUrl(key: string, uploadId: string, partNumber: number): Promise<string> {
    if (this.cloudStorageActive && this.s3Client && this.bucket) {
      try {
        const command = new UploadPartCommand({
          Bucket: this.bucket,
          Key: key,
          UploadId: uploadId,
          PartNumber: partNumber
        });
        const presignedUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 1800 });
        return presignedUrl;
      } catch (err: any) {
        throw new ApiError(400, `Presigned part URL generation error: ${err?.message}`, [], "PRESIGNED_URL_FAILED");
      }
    }
    return `/api/resources/upload/local-part-upload?key=${encodeURIComponent(key)}&partNumber=${partNumber}&uploadId=${encodeURIComponent(uploadId)}`;
  }

  async saveLocalPart(uploadId: string, partNumber: number, inputStream: Readable): Promise<string> {
    try {
      const tempDir = path.resolve(process.cwd(), env.UPLOAD_DIR, "temp-sessions", uploadId);
      await fs.promises.mkdir(tempDir, { recursive: true });
      const partPath = path.join(tempDir, `part-${partNumber}`);
      const writeStream = fs.createWriteStream(partPath);
      await pipeline(inputStream, writeStream);
      return `"etag-local-part-${partNumber}"`;
    } catch {
      throw new ApiError(400, "Failed to store local upload chunk", [], "LOCAL_CHUNK_FAILED");
    }
  }

  async completeMultipartUpload(
    key: string,
    uploadId: string,
    completedParts: Array<{ partNumber: number; etag: string }>
  ): Promise<CompleteUploadResult> {
    if (this.cloudStorageActive && this.s3Client && this.bucket) {
      try {
        const parts = completedParts.map((p) => {
          let etag = p.etag.trim();
          if (!etag.startsWith('"')) etag = `"${etag}`;
          if (!etag.endsWith('"')) etag = `${etag}"`;
          return { PartNumber: p.partNumber, ETag: etag };
        });

        const command = new CompleteMultipartUploadCommand({
          Bucket: this.bucket,
          Key: key,
          UploadId: uploadId,
          MultipartUpload: { Parts: parts }
        });

        await this.s3Client.send(command);

        let fileUrl: string;
        if (env.S3_ENDPOINT) {
          let baseEndpoint = env.S3_ENDPOINT.trim();
          if (!baseEndpoint.startsWith("http://") && !baseEndpoint.startsWith("https://")) {
            baseEndpoint = `https://${baseEndpoint}`;
          }
          if (baseEndpoint.endsWith("/")) {
            baseEndpoint = baseEndpoint.slice(0, -1);
          }
          fileUrl = `${baseEndpoint}/${this.bucket}/${key}`;
        } else {
          fileUrl = `https://${this.bucket}.s3.amazonaws.com/${key}`;
        }

        let contentHash = "";
        try {
          const getObj = await this.s3Client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
          if (getObj.Body) {
            const hash = createHash("sha256");
            for await (const chunk of getObj.Body as any) {
              hash.update(chunk);
            }
            contentHash = hash.digest("hex");
          }
        } catch {
          contentHash = createHash("sha256").update(key).digest("hex");
        }

        return { fileUrl, contentHash };
      } catch (err: any) {
        throw new ApiError(400, `Cloud multipart completion error: ${err?.message}`, [], "CLOUD_COMPLETE_FAILED");
      }
    } else {
      try {
        const uploadsRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);
        const destination = path.resolve(uploadsRoot, key);
        await fs.promises.mkdir(path.dirname(destination), { recursive: true });

        const tempDir = path.resolve(uploadsRoot, "temp-sessions", uploadId);
        const sorted = [...completedParts].sort((a, b) => a.partNumber - b.partNumber);

        const hash = createHash("sha256");
        const writeStream = fs.createWriteStream(destination);
        for (const part of sorted) {
          const partPath = path.join(tempDir, `part-${part.partNumber}`);
          if (fs.existsSync(partPath)) {
            const data = await fs.promises.readFile(partPath);
            hash.update(data);
            writeStream.write(data);
          }
        }
        writeStream.end();
        const contentHash = hash.digest("hex");

        await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
        const fileUrl = `/uploads/${key.replace(/\\/g, "/")}`;
        return { fileUrl, contentHash };
      } catch {
        throw new ApiError(400, "Failed to assemble local multipart upload", [], "LOCAL_COMPLETE_FAILED");
      }
    }
  }

  async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
    if (this.cloudStorageActive && this.s3Client && this.bucket) {
      try {
        const command = new AbortMultipartUploadCommand({
          Bucket: this.bucket,
          Key: key,
          UploadId: uploadId
        });
        await this.s3Client.send(command);
      } catch {
        // Best effort
      }
    } else {
      const tempDir = path.resolve(process.cwd(), env.UPLOAD_DIR, "temp-sessions", uploadId);
      await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  extractCloudKey(fileUrl: string): string | null {
    if (!fileUrl || fileUrl.startsWith("/")) return null;

    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
      try {
        const urlObj = new URL(fileUrl);
        let pathname = decodeURIComponent(urlObj.pathname);
        if (pathname.startsWith("/")) {
          pathname = pathname.substring(1);
        }
        if (this.bucket && pathname.startsWith(`${this.bucket}/`)) {
          return pathname.substring(this.bucket.length + 1);
        }
        return pathname;
      } catch {
        return null;
      }
    }

    if (this.bucket && fileUrl.startsWith(`${this.bucket}/`)) {
      return fileUrl.substring(this.bucket.length + 1);
    }

    return fileUrl;
  }

  async generatePresignedPreviewUrl(fileUrl: string, expiresIn = 1800): Promise<string> {
    if (this.cloudStorageActive && this.s3Client && this.bucket && fileUrl && !fileUrl.startsWith("/")) {
      try {
        const key = this.extractCloudKey(fileUrl);
        if (!key) return fileUrl;

        const command = new GetObjectCommand({
          Bucket: this.bucket,
          Key: key
        });

        return await getSignedUrl(this.s3Client, command, { expiresIn });
      } catch (err: any) {
        console.warn("[StorageService] Failed to generate presigned preview URL:", err);
        return fileUrl;
      }
    }
    return fileUrl;
  }

  async generatePresignedDownloadUrl(fileUrl: string, fileName: string): Promise<string> {
    if (this.cloudStorageActive && this.s3Client && this.bucket && fileUrl && !fileUrl.startsWith("/")) {
      try {
        const key = this.extractCloudKey(fileUrl) || fileUrl;

        const command = new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
          ResponseContentDisposition: `attachment; filename="${fileName}"`
        });

        const presignedUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
        return presignedUrl;
      } catch {
        return fileUrl;
      }
    }
    return fileUrl || "#";
  }

  async deleteCloudObject(fileUrlOrKey: string): Promise<void> {
    if (!this.cloudStorageActive || !this.s3Client || !this.bucket) {
      return;
    }
    const key = this.extractCloudKey(fileUrlOrKey) || fileUrlOrKey;
    if (!key || key.startsWith("/")) {
      return;
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
      });
      await this.s3Client.send(command);
    } catch (err: any) {
      throw new ApiError(
        502,
        `Cloud object deletion failed: ${err?.message || "Storage error"}`,
        [],
        "CLOUD_DELETE_FAILED"
      );
    }
  }

  async downloadCloudObjectToPath(fileUrl: string, destinationPath: string): Promise<boolean> {
    if (!this.cloudStorageActive || !this.s3Client || !this.bucket || !fileUrl || fileUrl.startsWith("/")) {
      return false;
    }
    const key = this.extractCloudKey(fileUrl);
    if (!key) return false;

    try {
      const getObj = await this.s3Client.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      }));
      if (!getObj.Body) return false;

      await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });
      const writeStream = fs.createWriteStream(destinationPath);
      await pipeline(getObj.Body as any, writeStream);
      return true;
    } catch (err) {
      console.warn(`[StorageService] Failed to download cloud object ${key}:`, err);
      return false;
    }
  }

  uploadProfilePicture(file: Express.Multer.File): Promise<StoredFile> {
    return this.provider.save(file, "profiles");
  }

  uploadCommunityBanner(file: Express.Multer.File): Promise<StoredFile> {
    return this.provider.save(file, "communities");
  }

  uploadChatAttachment(file: Express.Multer.File): Promise<StoredFile> {
    return this.provider.save(file, "chat");
  }

  uploadDirectMessageAttachment(file: Express.Multer.File): Promise<StoredFile> {
    return this.provider.save(file, "direct-messages");
  }

  uploadResource(file: Express.Multer.File): Promise<StoredFile> {
    return this.provider.save(file, "resources");
  }

  uploadEventPoster(file: Express.Multer.File): Promise<StoredFile> {
    return this.provider.save(file, "events");
  }

  delete(key: string): Promise<void> {
    return this.provider.delete(key);
  }
}

export const defaultStorageProvider = new GridFSStorageProvider();
export const sharedStorageService = new StorageService(defaultStorageProvider);
