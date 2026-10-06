import React from "react";
import { X, RotateCcw, FileText, Loader2, AlertCircle } from "lucide-react";

export interface PendingAttachment {
  id: string;
  file: File;
  type: "image" | "file";
  previewUrl?: string;
  progress: number; // 0 to 100
  status: "pending" | "uploading" | "success" | "error";
  errorMsg?: string;
  uploadedUrl?: string;
  abortController?: AbortController;
}

interface AttachmentPreviewBarProps {
  attachments: PendingAttachment[];
  onRemove: (id: string) => void;
  onRetry?: (id: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentPreviewBar({
  attachments,
  onRemove,
  onRetry
}: AttachmentPreviewBarProps) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="flex items-center gap-2.5 px-2 py-2 mb-2 overflow-x-auto no-scrollbar scrollbar-none [scrollbar-width:none]">
      {attachments.map((att) => {
        const isImage = att.type === "image" && att.previewUrl;
        const isUploading = att.status === "uploading";
        const isError = att.status === "error";

        return (
          <div
            key={att.id}
            className={`relative flex items-center gap-2 p-1.5 rounded-xl border shrink-0 max-w-[200px] transition-all ${
              isError
                ? "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-900/60"
                : "bg-slate-100 dark:bg-[#151F33] border-slate-200 dark:border-slate-700/70"
            }`}
          >
            {/* Thumbnail or Icon */}
            {isImage ? (
              <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-slate-200 dark:bg-slate-800">
                <img
                  src={att.previewUrl}
                  alt={att.file.name}
                  className="w-full h-full object-cover"
                />
                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-[10px] font-bold">
                    {att.progress}%
                  </div>
                )}
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-sky-100 dark:bg-sky-950/50 text-[#005FFF] flex items-center justify-center shrink-0">
                <FileText size={18} />
              </div>
            )}

            {/* File info */}
            <div className="flex flex-col min-w-0 flex-1 pr-5">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={att.file.name}>
                {att.file.name}
              </span>
              <span className="text-[10px] text-slate-400">
                {isUploading ? `Uploading ${att.progress}%` : isError ? "Upload failed" : formatSize(att.file.size)}
              </span>

              {/* Progress bar */}
              {isUploading && (
                <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
                  <div
                    className="h-full bg-[#005FFF] transition-all duration-150"
                    style={{ width: `${att.progress}%` }}
                  />
                </div>
              )}
            </div>

            {/* Remove / Cancel button */}
            <button
              type="button"
              onClick={() => onRemove(att.id)}
              className="absolute top-1 right-1 p-1 rounded-full bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-700/80 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Remove"
              aria-label="Remove attachment"
            >
              <X size={12} />
            </button>

            {/* Retry button on error */}
            {isError && onRetry && (
              <button
                type="button"
                onClick={() => onRetry(att.id)}
                className="absolute bottom-1 right-1 p-1 rounded-full bg-red-100 hover:bg-red-200 dark:bg-red-900/50 text-red-600 dark:text-red-300 transition-colors cursor-pointer"
                title="Retry upload"
              >
                <RotateCcw size={12} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
