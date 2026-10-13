import { describe, it, expect, vi } from "vitest";
import {
  SmartUploadEngine,
  DEFAULT_CHUNK_SIZE,
  MAX_FILE_SIZE_BYTES,
  type UploadInitiateResponse,
  type PartUrlInfo
} from "../services/upload-engine.service";

describe("SmartUploadEngine Unit Tests", () => {
  it("correctly calculates total parts for different file sizes", () => {
    expect(SmartUploadEngine.calculateParts(1024, DEFAULT_CHUNK_SIZE)).toBe(1);
    expect(SmartUploadEngine.calculateParts(DEFAULT_CHUNK_SIZE, DEFAULT_CHUNK_SIZE)).toBe(1);
    expect(SmartUploadEngine.calculateParts(DEFAULT_CHUNK_SIZE + 1, DEFAULT_CHUNK_SIZE)).toBe(2);

    // 1 GB file
    const oneGb = 1024 * 1024 * 1024;
    expect(SmartUploadEngine.calculateParts(oneGb, DEFAULT_CHUNK_SIZE)).toBe(128);
  });

  it("throws error when file exceeds 1 GB limit", () => {
    const oversizedFile = new File(["a".repeat(100)], "oversized.zip", { type: "application/zip" });
    Object.defineProperty(oversizedFile, "size", { value: MAX_FILE_SIZE_BYTES + 1 });

    expect(() => {
      new SmartUploadEngine(oversizedFile, {
        communityId: "comm-1",
        formData: { title: "Test", description: "", category: "NOTES", visibility: "COMMUNITY", tags: [] },
        initiateApi: vi.fn(),
        getPartUrlsApi: vi.fn(),
        completeApi: vi.fn(),
        abortApi: vi.fn()
      });
    }).toThrow(/File size exceeds the maximum limit of 1 GB/);
  });

  it("executes full upload flow with chunking and returns final resource", async () => {
    const mockFile = new File(["hello world test content"], "notes.pdf", { type: "application/pdf" });
    Object.defineProperty(mockFile, "size", { value: 20 * 1024 * 1024 }); // 20 MB -> 3 chunks of 8MB

    const mockInitiate = vi.fn().mockResolvedValue({
      sessionId: "session-123",
      uploadId: "upload-abc",
      key: "resources/notes.pdf",
      totalParts: 3,
      partSize: DEFAULT_CHUNK_SIZE,
      directCloud: true
    });

    const mockGetPartUrls = vi.fn().mockResolvedValue([
      { partNumber: 1, url: "https://cloud-storage.mock/part1" },
      { partNumber: 2, url: "https://cloud-storage.mock/part2" },
      { partNumber: 3, url: "https://cloud-storage.mock/part3" }
    ]);

    const mockComplete = vi.fn().mockResolvedValue({
      id: "res-999",
      title: "Distributed Systems Notes",
      fileUrl: "/uploads/resources/notes.pdf"
    });

    const mockAbort = vi.fn().mockResolvedValue(undefined);

    const onProgress = vi.fn();
    const onStatusChange = vi.fn();

    // Mock axios PUT in engine
    vi.mock("axios", () => ({
      default: {
        put: vi.fn().mockImplementation((_url, _data, config) => {
          config?.onUploadProgress?.({ loaded: 8 * 1024 * 1024, total: 8 * 1024 * 1024 });
          return Promise.resolve({
            headers: { etag: '"etag-mock-123"' }
          });
        })
      }
    }));

    const engine = new SmartUploadEngine(mockFile, {
      communityId: "comm-1",
      formData: { title: "Distributed Systems Notes", description: "Exam summary", category: "NOTES", visibility: "COMMUNITY", tags: ["dist"] },
      chunkSize: DEFAULT_CHUNK_SIZE,
      initiateApi: mockInitiate,
      getPartUrlsApi: mockGetPartUrls,
      completeApi: mockComplete,
      abortApi: mockAbort,
      onProgress,
      onStatusChange
    });

    expect(engine.getStatus()).toBe("idle");

    const result = await engine.start();

    expect(mockInitiate).toHaveBeenCalledWith("comm-1", expect.objectContaining({
      fileName: "notes.pdf",
      totalParts: 3
    }));

    expect(mockGetPartUrls).toHaveBeenCalledWith("session-123", [1, 2, 3]);

    expect(mockComplete).toHaveBeenCalledWith("session-123", [
      { partNumber: 1, etag: "etag-mock-123" },
      { partNumber: 2, etag: "etag-mock-123" },
      { partNumber: 3, etag: "etag-mock-123" }
    ]);

    expect(result.id).toBe("res-999");
    expect(onStatusChange).toHaveBeenCalledWith("completed");
  });

  it("extracts server error message and sets error status on 409 duplicate resource conflict", async () => {
    const mockFile = new File(["test duplicate content"], "StudyConnect_B2_Test_Document.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });
    Object.defineProperty(mockFile, "size", { value: 1024 });

    const mockInitiate = vi.fn().mockResolvedValue({
      sessionId: "session-dup-123",
      uploadId: "upload-dup-abc",
      key: "resources/StudyConnect_B2_Test_Document.docx",
      totalParts: 1,
      partSize: DEFAULT_CHUNK_SIZE,
      directCloud: true
    });

    const mockGetPartUrls = vi.fn().mockResolvedValue([
      { partNumber: 1, url: "https://cloud-storage.mock/part1" }
    ]);

    const duplicateError: any = new Error("Request failed with status code 409");
    duplicateError.response = {
      status: 409,
      data: {
        success: false,
        message: "A resource with identical file content already exists in the Academic Vault",
        code: "DUPLICATE_RESOURCE"
      }
    };

    const mockComplete = vi.fn().mockRejectedValue(duplicateError);
    const mockAbort = vi.fn().mockResolvedValue(undefined);
    const onError = vi.fn();
    const onStatusChange = vi.fn();

    const engine = new SmartUploadEngine(mockFile, {
      communityId: "comm-1",
      formData: { title: "Test Doc", description: "", category: "NOTES", visibility: "COMMUNITY", tags: [] },
      initiateApi: mockInitiate,
      getPartUrlsApi: mockGetPartUrls,
      completeApi: mockComplete,
      abortApi: mockAbort,
      onError,
      onStatusChange
    });

    await expect(engine.start()).rejects.toThrow(
      "A resource with identical file content already exists in the Academic Vault"
    );

    expect(engine.getStatus()).toBe("error");
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "A resource with identical file content already exists in the Academic Vault"
      })
    );
  });
});
