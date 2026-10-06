import React from "react";
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  File,
  Download,
  ExternalLink
} from "lucide-react";

interface FileAttachmentCardProps {
  attachment: {
    asset_url?: string;
    title?: string;
    file_size?: number | string;
    mime_type?: string;
  };
  isSelectMode?: boolean;
  isMine?: boolean;
}

// Format bytes into human-readable string
function formatFileSize(bytes?: number | string): string {
  if (bytes === undefined || bytes === null) return "";
  const num = typeof bytes === "string" ? parseInt(bytes, 10) : bytes;
  if (isNaN(num) || num <= 0) return "";
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
}

// Determine file icon and theme color based on mime type or extension
function getFileMeta(title?: string, mimeType?: string) {
  const ext = (title?.split(".").pop() || "").toLowerCase();
  const mime = (mimeType || "").toLowerCase();

  if (ext === "pdf" || mime.includes("pdf")) {
    return {
      icon: FileText,
      color: "text-rose-500",
      bgColor: "bg-rose-50 dark:bg-rose-950/40",
      borderColor: "border-rose-200 dark:border-rose-900/50"
    };
  }
  if (["doc", "docx"].includes(ext) || mime.includes("word") || mime.includes("document")) {
    return {
      icon: FileText,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/40",
      borderColor: "border-blue-200 dark:border-blue-900/50"
    };
  }
  if (["xls", "xlsx", "csv"].includes(ext) || mime.includes("sheet") || mime.includes("excel") || mime.includes("csv")) {
    return {
      icon: FileSpreadsheet,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
      borderColor: "border-emerald-200 dark:border-emerald-900/50"
    };
  }
  if (["ppt", "pptx"].includes(ext) || mime.includes("presentation") || mime.includes("powerpoint")) {
    return {
      icon: FileText,
      color: "text-amber-500",
      bgColor: "bg-amber-50 dark:bg-amber-950/40",
      borderColor: "border-amber-200 dark:border-amber-900/50"
    };
  }
  if (["zip", "rar", "tar", "gz", "7z"].includes(ext) || mime.includes("zip") || mime.includes("compressed")) {
    return {
      icon: FileArchive,
      color: "text-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-950/40",
      borderColor: "border-purple-200 dark:border-purple-900/50"
    };
  }
  if (["js", "ts", "tsx", "jsx", "py", "java", "c", "cpp", "html", "css", "json"].includes(ext) || mime.includes("json")) {
    return {
      icon: FileCode,
      color: "text-sky-500",
      bgColor: "bg-sky-50 dark:bg-sky-950/40",
      borderColor: "border-sky-200 dark:border-sky-900/50"
    };
  }
  return {
    icon: File,
    color: "text-slate-500",
    bgColor: "bg-slate-100 dark:bg-slate-800",
    borderColor: "border-slate-200 dark:border-slate-700"
  };
}

export function FileAttachmentCard({
  attachment,
  isSelectMode = false,
  isMine = false
}: FileAttachmentCardProps) {
  const fileName = attachment.title || "Document";
  const fileSize = formatFileSize(attachment.file_size);
  const fileUrl =
    attachment.asset_url || (attachment as any).url || (attachment as any).file_url;
  const meta = getFileMeta(fileName, attachment.mime_type);
  const Icon = meta.icon;

  const handleDownload = (e: React.MouseEvent) => {
    if (isSelectMode) {
      e.preventDefault();
      return;
    }
    // Let native link handle open/download
  };

  return (
    <div
      className={`my-1 p-2.5 rounded-xl border flex items-center justify-between gap-3 max-w-sm transition-all ${
        isMine
          ? "bg-white/10 border-white/20 text-white"
          : "bg-white dark:bg-[#111A2E] border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-100"
      } shadow-xs`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className={`p-2 rounded-lg shrink-0 ${meta.bgColor} ${meta.color}`}>
          <Icon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold truncate leading-tight" title={fileName}>
            {fileName}
          </p>
          {fileSize && (
            <p className={`text-[11px] mt-0.5 ${isMine ? "text-white/70" : "text-slate-400 dark:text-slate-500"}`}>
              {fileSize}
            </p>
          )}
        </div>
      </div>

      {fileUrl && (
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          download={fileName}
          onClick={handleDownload}
          className={`p-2 rounded-lg transition-colors shrink-0 cursor-pointer ${
            isMine
              ? "hover:bg-white/20 text-white"
              : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
          title="Download file"
          aria-label={`Download ${fileName}`}
        >
          <Download size={16} />
        </a>
      )}
    </div>
  );
}
