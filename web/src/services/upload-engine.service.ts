import axios from "axios";
import { tokenService } from "./token.service";
import { uploadSessionStorage, type StoredUploadSession } from "./upload-session-storage";
import type { ResourceFormData } from "../types/resource";

export const DEFAULT_CHUNK_SIZE = 8 * 1024 * 1024; // 8 MB chunks
export const MAX_FILE_SIZE_BYTES = 1024 * 1024 * 1024; // 1 GB limit

export interface UploadProgressInfo {
  loadedBytes: number;
  totalBytes: number;
  percentage: number;
  speedBytesPerSec: number;
  etaSeconds: number;
  activeChunkIndex: number;
  totalChunks: number;
}

export type UploadStatus =
  | "idle"
  | "initiating"
  | "uploading"
  | "paused"
  | "completing"
  | "completed"
  | "error"
  | "cancelled";

export interface UploadInitiateResponse {
  sessionId: string;
  uploadId?: string;
  key?: string;
  totalParts: number;
  partSize: number;
  directCloud: boolean;
}

export interface PartUrlInfo {
  partNumber: number;
  url: string;
}

export interface SmartUploadOptions {
  communityId: string;
  formData: ResourceFormData;
  chunkSize?: number;
  onProgress?: (progress: UploadProgressInfo) => void;
  onStatusChange?: (status: UploadStatus) => void;
  onError?: (error: Error) => void;
  onSuccess?: (resource: any) => void;
  // Injected API methods
  initiateApi: (communityId: string, payload: {
    fileName: string;
    fileSize: number;
    mimeType: string;
    totalParts: number;
    title: string;
    description: string;
    category: string;
    department?: string;
    semester?: string;
    subjectCode?: string;
    visibility: string;
    tags: string[];
  }) => Promise<UploadInitiateResponse>;
  getPartUrlsApi: (sessionId: string, partNumbers: number[]) => Promise<PartUrlInfo[]>;
  completeApi: (sessionId: string, completedParts: Array<{ partNumber: number; etag: string }>) => Promise<any>;
  abortApi: (sessionId: string) => Promise<void>;
}

export class SmartUploadEngine {
  private file: File;
  private options: SmartUploadOptions;
  private chunkSize: number;
  private totalParts: number;
  private sessionId: string | null = null;
  private uploadId?: string;
  private key?: string;
  private completedParts: Map<number, string> = new Map(); // partNumber -> etag
  private status: UploadStatus = "idle";
  private isPaused = false;
  private isCancelled = false;

  private startTime = 0;
  private loadedBytesMap: Map<number, number> = new Map();
  private abortController: AbortController | null = null;

  constructor(file: File, options: SmartUploadOptions) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File size exceeds the maximum limit of 1 GB (${(file.size / (1024 * 1024)).toFixed(1)} MB selected).`);
    }
    this.file = file;
    this.options = options;
    this.chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
    this.totalParts = Math.max(1, Math.ceil(file.size / this.chunkSize));
  }

  public getStatus(): UploadStatus {
    return this.status;
  }

  private setStatus(newStatus: UploadStatus) {
    this.status = newStatus;
    this.options.onStatusChange?.(newStatus);
  }

  public static calculateParts(fileSize: number, chunkSize = DEFAULT_CHUNK_SIZE): number {
    return Math.max(1, Math.ceil(fileSize / chunkSize));
  }

  public async start(): Promise<any> {
    try {
      this.setStatus("initiating");
      this.startTime = Date.now();

      // Check if session can be restored from IndexedDB
      const existing = await uploadSessionStorage.findMatchingSession(this.file.name, this.file.size);
      if (existing && existing.sessionId) {
        this.sessionId = existing.sessionId;
        this.uploadId = existing.uploadId;
        this.key = existing.key;
        if (existing.completedParts) {
          for (const p of existing.completedParts) {
            this.completedParts.set(p.partNumber, p.etag);
            const partLen = p.partNumber === this.totalParts ? (this.file.size - (p.partNumber - 1) * this.chunkSize) : this.chunkSize;
            this.loadedBytesMap.set(p.partNumber, partLen);
          }
        }
      }

      if (!this.sessionId) {
        // 1. Initiate fresh session via backend API
        const initRes = await this.options.initiateApi(this.options.communityId, {
          fileName: this.file.name,
          fileSize: this.file.size,
          mimeType: this.file.type || "application/octet-stream",
          totalParts: this.totalParts,
          title: this.options.formData.title,
          description: this.options.formData.description,
          category: this.options.formData.category,
          department: this.options.formData.department,
          semester: this.options.formData.semester,
          subjectCode: this.options.formData.subjectCode,
          visibility: this.options.formData.visibility,
          tags: this.options.formData.tags
        });

        this.sessionId = initRes.sessionId;
        this.uploadId = initRes.uploadId;
        this.key = initRes.key;

        // Persist initial session in IndexedDB
        await this.saveSessionState();
      }

      this.setStatus("uploading");
      this.emitProgress(1);

      // 2. Upload chunks
      await this.uploadAllChunks();

      if (this.isPaused) {
        this.setStatus("paused");
        return;
      }

      if (this.isCancelled) {
        this.setStatus("cancelled");
        return;
      }

      // 3. Complete upload
      this.setStatus("completing");
      const partsArray = Array.from(this.completedParts.entries())
        .map(([partNumber, etag]) => ({ partNumber, etag }))
        .sort((a, b) => a.partNumber - b.partNumber);

      const resource = await this.options.completeApi(this.sessionId, partsArray);

      // Clean up session storage
      if (this.sessionId) {
        await uploadSessionStorage.removeSession(this.sessionId);
      }

      this.setStatus("completed");
      this.options.onSuccess?.(resource);
      return resource;
    } catch (err: any) {
      if (!this.isCancelled && !this.isPaused) {
        this.setStatus("error");
        const serverMessage = err?.response?.data?.message;
        const errorMessage = serverMessage || err?.message || "Upload failed";
        const error = new Error(errorMessage);
        (error as any).response = err?.response;
        (error as any).status = err?.response?.status;
        (error as any).code = err?.response?.data?.code;
        (error as any).data = err?.response?.data?.data;

        // Clean up failed session from IndexedDB if it was rejected or failed with client error (4xx)
        if (this.sessionId && err?.response?.status && err.response.status >= 400 && err.response.status < 500) {
          uploadSessionStorage.removeSession(this.sessionId).catch(() => {});
        }

        this.options.onError?.(error);
        throw error;
      }
    }
  }

  public async pause(): Promise<void> {
    if (this.status !== "uploading") return;
    this.isPaused = true;
    this.abortController?.abort();
    await this.saveSessionState();
    this.setStatus("paused");
  }

  public async resume(): Promise<any> {
    if (this.status !== "paused") return;
    this.isPaused = false;
    this.setStatus("uploading");
    return this.startRemainingChunks();
  }

  public async cancel(): Promise<void> {
    this.isCancelled = true;
    this.isPaused = false;
    this.abortController?.abort();
    if (this.sessionId) {
      try {
        await this.options.abortApi(this.sessionId);
        await uploadSessionStorage.removeSession(this.sessionId);
      } catch {
        // Ignore best-effort abort
      }
    }
    this.setStatus("cancelled");
  }

  private async uploadAllChunks(): Promise<void> {
    return this.startRemainingChunks();
  }

  private async startRemainingChunks(): Promise<void> {
    const pendingParts: number[] = [];
    for (let p = 1; p <= this.totalParts; p++) {
      if (!this.completedParts.has(p)) {
        pendingParts.push(p);
      }
    }

    if (pendingParts.length === 0) return;

    // Fetch presigned URLs in batches of up to 10 parts
    const batchSize = 10;
    for (let i = 0; i < pendingParts.length; i += batchSize) {
      if (this.isPaused || this.isCancelled) break;

      const batchPartNumbers = pendingParts.slice(i, i + batchSize);
      let urlInfos: PartUrlInfo[];
      try {
        urlInfos = await this.options.getPartUrlsApi(this.sessionId!, batchPartNumbers);
      } catch (err: any) {
        // If session was invalid/expired on backend, clear IndexedDB and re-initiate session once
        if (this.sessionId) {
          await uploadSessionStorage.removeSession(this.sessionId);
          this.sessionId = null;
          this.completedParts.clear();
          this.loadedBytesMap.clear();
        }
        const initRes = await this.options.initiateApi(this.options.communityId, {
          fileName: this.file.name,
          fileSize: this.file.size,
          mimeType: this.file.type || "application/octet-stream",
          totalParts: this.totalParts,
          title: this.options.formData.title,
          description: this.options.formData.description,
          category: this.options.formData.category,
          department: this.options.formData.department,
          semester: this.options.formData.semester,
          subjectCode: this.options.formData.subjectCode,
          visibility: this.options.formData.visibility,
          tags: this.options.formData.tags
        });
        this.sessionId = initRes.sessionId;
        this.uploadId = initRes.uploadId;
        this.key = initRes.key;
        await this.saveSessionState();
        urlInfos = await this.options.getPartUrlsApi(this.sessionId, batchPartNumbers);
      }

      const urlMap = new Map(urlInfos.map((u) => [u.partNumber, u.url]));

      for (const partNum of batchPartNumbers) {
        if (this.isPaused || this.isCancelled) break;

        const presignedUrl = urlMap.get(partNum);
        if (!presignedUrl) {
          throw new Error(`Missing presigned URL for part ${partNum}`);
        }

        await this.uploadSingleChunkWithRetry(partNum, presignedUrl);
        await this.saveSessionState();
      }
    }
  }

  private async uploadSingleChunkWithRetry(partNumber: number, presignedUrl: string, maxRetries = 3): Promise<void> {
    let attempt = 0;
    let delay = 1000;

    while (attempt < maxRetries) {
      if (this.isPaused || this.isCancelled) return;
      attempt++;
      try {
        const start = (partNumber - 1) * this.chunkSize;
        const end = Math.min(this.file.size, start + this.chunkSize);
        const chunkBlob = this.file.slice(start, end);

        this.abortController = new AbortController();

        const isLocalUrl = presignedUrl.startsWith("/") || presignedUrl.includes("/api/resources/upload/local-part-upload");
        const headers: Record<string, string> = {
          "Content-Type": this.file.type || "application/octet-stream"
        };
        const token = tokenService.get();
        if (isLocalUrl && token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await axios.put(presignedUrl, chunkBlob, {
          headers,
          signal: this.abortController.signal,
          onUploadProgress: (progressEvent) => {
            this.loadedBytesMap.set(partNumber, progressEvent.loaded);
            this.emitProgress(partNumber);
          }
        });

        // ETag can be in etag or ETag header (case-insensitive in Axios)
        const headerEtag =
          (typeof (response.headers as any)?.get === "function" ? (response.headers as any).get("etag") : null) ||
          response.headers["etag"] ||
          response.headers["ETag"];

        if (!headerEtag && !isLocalUrl) {
          throw new Error("Missing ETag header in cloud storage response. Ensure CORS configuration exposes the ETag header.");
        }
        const rawEtag = headerEtag || `etag-part-${partNumber}`;
        const etag = String(rawEtag).trim().replace(/"/g, "");

        this.completedParts.set(partNumber, etag);
        this.loadedBytesMap.set(partNumber, end - start);
        this.emitProgress(partNumber);
        return;
      } catch (err: any) {
        if (this.isPaused || this.isCancelled) return;
        if (attempt >= maxRetries) {
          throw new Error(`Failed to upload chunk ${partNumber} after ${maxRetries} attempts: ${err.message}`);
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }

  private emitProgress(currentPartIndex: number) {
    let totalLoaded = 0;
    for (const loaded of this.loadedBytesMap.values()) {
      totalLoaded += loaded;
    }
    totalLoaded = Math.min(totalLoaded, this.file.size);

    const elapsedSec = (Date.now() - this.startTime) / 1000;
    const speed = elapsedSec > 0 ? totalLoaded / elapsedSec : 0;
    const remainingBytes = this.file.size - totalLoaded;
    const eta = speed > 0 ? Math.ceil(remainingBytes / speed) : 0;
    const percentage = Math.round((totalLoaded / this.file.size) * 100);

    this.options.onProgress?.({
      loadedBytes: totalLoaded,
      totalBytes: this.file.size,
      percentage,
      speedBytesPerSec: Math.round(speed),
      etaSeconds: eta,
      activeChunkIndex: currentPartIndex,
      totalChunks: this.totalParts
    });
  }

  private async saveSessionState() {
    if (!this.sessionId) return;
    const completedArr = Array.from(this.completedParts.entries()).map(([partNumber, etag]) => ({
      partNumber,
      etag
    }));

    const session: StoredUploadSession = {
      sessionId: this.sessionId,
      uploadId: this.uploadId,
      key: this.key,
      communityId: this.options.communityId,
      fileName: this.file.name,
      fileSize: this.file.size,
      mimeType: this.file.type || "application/octet-stream",
      totalParts: this.totalParts,
      completedParts: completedArr,
      updatedAt: Date.now()
    };

    await uploadSessionStorage.saveSession(session);
  }
}
