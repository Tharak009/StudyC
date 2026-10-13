import { useState, useCallback, useRef } from "react";
import {
  SmartUploadEngine,
  type UploadProgressInfo,
  type UploadStatus
} from "../services/upload-engine.service";
import { resourcesApi } from "../api/resources.api";
import type { ResourceFormData, Resource } from "../types/resource";

export interface UseSmartUploadReturn {
  file: File | null;
  status: UploadStatus;
  progress: UploadProgressInfo | null;
  error: string | null;
  isUploading: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  startUpload: (communityId: string, formData: ResourceFormData, selectedFile: File) => Promise<Resource | undefined>;
  pauseUpload: () => void;
  resumeUpload: () => void;
  cancelUpload: () => void;
  resetUpload: () => void;
}

export function useSmartUpload(onSuccessCallback?: (resource: Resource) => void): UseSmartUploadReturn {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState<UploadProgressInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const engineRef = useRef<SmartUploadEngine | null>(null);

  const startUpload = useCallback(
    async (communityId: string, formData: ResourceFormData, selectedFile: File): Promise<Resource | undefined> => {
      setFile(selectedFile);
      setError(null);
      setProgress(null);

      try {
        const engine = new SmartUploadEngine(selectedFile, {
          communityId,
          formData,
          onProgress: (p) => setProgress(p),
          onStatusChange: (s) => setStatus(s),
          onError: (err) => {
            const msg = (err as any)?.response?.data?.message || err.message;
            setError(msg);
          },
          onSuccess: (res) => {
            onSuccessCallback?.(res);
          },
          initiateApi: (cId, payload) => resourcesApi.initiateUpload(cId, payload),
          getPartUrlsApi: (sId, parts) => resourcesApi.getPartUrls(sId, parts),
          completeApi: (sId, parts) => resourcesApi.completeUpload(sId, parts),
          abortApi: (sId) => resourcesApi.abortUpload(sId)
        });

        engineRef.current = engine;
        const result = await engine.start();
        return result;
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || "Failed to upload file";
        setError(msg);
        throw err;
      }
    },
    [onSuccessCallback]
  );

  const pauseUpload = useCallback(() => {
    engineRef.current?.pause();
  }, []);

  const resumeUpload = useCallback(() => {
    engineRef.current?.resume();
  }, []);

  const cancelUpload = useCallback(() => {
    engineRef.current?.cancel();
    setFile(null);
    setProgress(null);
    setStatus("idle");
  }, []);

  const resetUpload = useCallback(() => {
    engineRef.current?.cancel();
    setFile(null);
    setProgress(null);
    setStatus("idle");
    setError(null);
  }, []);

  const isUploading = status === "initiating" || status === "uploading" || status === "completing";
  const isPaused = status === "paused";
  const isCompleted = status === "completed";

  return {
    file,
    status,
    progress,
    error,
    isUploading,
    isPaused,
    isCompleted,
    startUpload,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    resetUpload
  };
}
