import React from "react";
import { Play, Pause, XCircle, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import type { UploadProgressInfo, UploadStatus } from "../../services/upload-engine.service";

interface UploadProgressWidgetProps {
  status: UploadStatus;
  progress: UploadProgressInfo | null;
  fileName: string;
  error?: string | null;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
}

export function UploadProgressWidget({
  status,
  progress,
  fileName,
  error,
  onPause,
  onResume,
  onCancel
}: UploadProgressWidgetProps) {
  if (status === "idle") return null;

  const formatMb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);
  const formatSpeed = (bytesPerSec: number) => {
    if (bytesPerSec >= 1024 * 1024) {
      return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
    }
    return `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
  };

  const percentage = progress?.percentage || 0;
  const loadedMb = progress ? formatMb(progress.loadedBytes) : "0";
  const totalMb = progress ? formatMb(progress.totalBytes) : "0";
  const speedText = progress ? formatSpeed(progress.speedBytesPerSec) : "Calculating...";
  const etaText = progress && progress.etaSeconds > 0 ? `${progress.etaSeconds}s remaining` : "Calculating...";

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] p-4 space-y-3">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {status === "completed" ? (
            <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
          ) : status === "error" ? (
            <AlertTriangle size={18} className="text-rose-500 shrink-0" />
          ) : (
            <Loader2 size={18} className="text-[#1E90FF] animate-spin shrink-0" />
          )}
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
            {fileName}
          </span>
        </div>

        {/* Status Badge */}
        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-[#1E90FF]/10 text-[#1E90FF]">
          {status}
        </span>
      </div>

      {/* Progress Bar */}
      {(status === "uploading" || status === "paused" || status === "completing") && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
            <span>
              {loadedMb} MB / {totalMb} MB ({percentage}%)
            </span>
            <span>
              {status === "paused" ? "Paused" : `${speedText} • ${etaText}`}
            </span>
          </div>

          <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              style={{ width: `${percentage}%` }}
              className={`h-full transition-all duration-200 ${
                status === "paused" ? "bg-amber-500" : "bg-[#1E90FF]"
              }`}
            />
          </div>

          {progress && progress.totalChunks > 1 && (
            <div className="text-[10px] text-slate-400">
              Chunk {progress.activeChunkIndex} of {progress.totalChunks} (8 MB chunks)
            </div>
          )}
        </div>
      )}

      {/* Error Banner */}
      {status === "error" && error && (
        <div className="text-xs font-semibold text-rose-500 bg-rose-50 dark:bg-rose-500/10 p-2.5 rounded-xl">
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-end gap-2 pt-1">
        {status === "uploading" && onPause && (
          <button
            type="button"
            onClick={onPause}
            className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400"
          >
            <Pause size={14} />
            <span>Pause</span>
          </button>
        )}

        {status === "paused" && onResume && (
          <button
            type="button"
            onClick={onResume}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#1E90FF] hover:underline"
          >
            <Play size={14} />
            <span>Resume</span>
          </button>
        )}

        {(status === "uploading" || status === "paused" || status === "initiating" || status === "error") && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1 text-xs font-bold text-rose-500 hover:text-rose-600"
          >
            <XCircle size={14} />
            <span>{status === "error" ? "Dismiss" : "Cancel"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
