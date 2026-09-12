import React from "react";
import {
  FileText,
  FileCode,
  FileArchive,
  FileSpreadsheet,
  FileCheck,
  Download,
  ExternalLink
} from "lucide-react";
import { getMediaUrl } from "../../../utils/media-url";

interface FileDocumentCardProps {
  originalName: string;
  size: number;
  url: string;
  mimeType?: string;
  isMe?: boolean;
}

export const FileDocumentCard: React.FC<FileDocumentCardProps> = ({
  originalName,
  size,
  url,
  mimeType = "",
  isMe = false
}) => {
  const ext = originalName.split(".").pop()?.toLowerCase() || "";

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 KB";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const getIcon = () => {
    if (ext === "pdf" || mimeType.includes("pdf")) {
      return <FileText className="w-4 h-4 text-rose-500" />;
    }
    if (["doc", "docx"].includes(ext) || mimeType.includes("word")) {
      return <FileText className="w-4 h-4 text-blue-500" />;
    }
    if (["xls", "xlsx", "csv"].includes(ext) || mimeType.includes("sheet") || mimeType.includes("csv")) {
      return <FileSpreadsheet className="w-4 h-4 text-emerald-500" />;
    }
    if (["zip", "tar", "gz", "rar", "7z"].includes(ext) || mimeType.includes("zip")) {
      return <FileArchive className="w-4 h-4 text-amber-500" />;
    }
    if (["js", "ts", "jsx", "tsx", "py", "java", "c", "cpp", "html", "css", "json"].includes(ext)) {
      return <FileCode className="w-4 h-4 text-indigo-500" />;
    }
    return <FileCheck className="w-4 h-4 text-slate-500" />;
  };

  const authenticatedUrl = getMediaUrl(url);

  return (
    <div
      className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border my-1 transition-all ${
        isMe
          ? "bg-white/10 border-white/20 text-white"
          : "bg-slate-50 dark:bg-[#111b21] border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-xs"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`p-2 rounded-lg shrink-0 ${
            isMe ? "bg-white/15" : "bg-slate-200/60 dark:bg-slate-800"
          }`}
        >
          {getIcon()}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold truncate max-w-[160px] sm:max-w-[200px]" title={originalName}>
            {originalName}
          </p>
          <span className="text-[10px] opacity-75 tabular-nums block font-mono">
            {formatFileSize(size)} • {ext.toUpperCase() || "FILE"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <a
          href={authenticatedUrl}
          target="_blank"
          rel="noreferrer"
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            isMe ? "hover:bg-white/20 text-white" : "hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500"
          }`}
          title="Open in new tab"
          aria-label="Open document"
        >
          <ExternalLink size={14} />
        </a>
        <a
          href={authenticatedUrl}
          download={originalName}
          target="_blank"
          rel="noreferrer"
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            isMe ? "hover:bg-white/20 text-white" : "hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500"
          }`}
          title="Download document"
          aria-label="Download document"
        >
          <Download size={14} />
        </a>
      </div>
    </div>
  );
};
