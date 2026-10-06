import type { ResourcePayload } from "../../../types/chat";
import { FileText, Download, ExternalLink, FileCode, Archive, File } from "lucide-react";

interface ResourceCardProps {
  resource: ResourcePayload;
}

const getFileIcon = (fileType: string) => {
  const lower = fileType.toLowerCase();
  if (lower.includes("pdf")) return FileText;
  if (lower.includes("zip") || lower.includes("rar") || lower.includes("tar")) return Archive;
  if (lower.includes("js") || lower.includes("ts") || lower.includes("py") || lower.includes("java") || lower.includes("cpp"))
    return FileCode;
  return File;
};

const formatBytes = (bytes?: number) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function ResourceCard({ resource }: ResourceCardProps) {
  const FileIcon = getFileIcon(resource.fileType);

  const handleDownload = () => {
    if (resource.downloadUrl) {
      window.open(resource.downloadUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border/80 bg-card/95 p-4 shadow-sm backdrop-blur transition-all hover:border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          <FileText className="h-3.5 w-3.5" />
          <span>Campus Vault Resource</span>
        </div>
        {resource.subject && (
          <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">
            {resource.subject}
          </span>
        )}
      </div>

      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          <FileIcon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground truncate">
            {resource.title}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {[resource.fileType.toUpperCase(), formatBytes(resource.fileSize)]
              .filter(Boolean)
              .join(" • ")}
          </p>
          {resource.uploadedByName && (
            <p className="text-[11px] text-muted-foreground/80 mt-0.5">
              By {resource.uploadedByName}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3.5 pt-3 border-t border-border/50 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Download</span>
        </button>
      </div>
    </div>
  );
}
