import { Download, File, FileText, Image, Presentation } from "lucide-react";
import { Link } from "react-router";
import type { Resource } from "../types/resource";

interface ResourceListProps {
  resources: Resource[];
  onDownload: (resource: Resource) => void;
  isLoading: boolean;
}

export function ResourceList({ resources, onDownload, isLoading }: ResourceListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex animate-pulse items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]"
          >
            <div className="size-10 rounded-lg bg-slate-200 dark:bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-white/10" />
              <div className="h-3 w-1/4 rounded bg-slate-200 dark:bg-white/10" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">No resources found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {resources.map((resource) => {
        const Icon = iconFor(resource.fileType);
        const size = formatSize(resource.fileSize);

        return (
          <div
            key={resource._id}
            className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.06]"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/[0.06]">
              <Icon size={18} className="text-slate-600 dark:text-slate-300" />
            </div>

            <div className="min-w-0 flex-1">
              <Link
                to={`/communities/${resource.communityId._id}/resources/${resource._id}`}
                className="text-sm font-semibold hover:text-signal-600 dark:hover:text-signal-300"
              >
                <span className="line-clamp-1">{resource.title}</span>
              </Link>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {resource.category.replace(/_/g, " ")} &middot; {size} &middot; {resource.downloadCount} downloads &middot; {resource.uploadedBy.fullName}
              </p>
            </div>

            <button
              className="icon-button size-8 shrink-0 rounded-full transition-colors hover:bg-signal-50 hover:text-signal-600 dark:hover:bg-signal-500/10 dark:hover:text-signal-300"
              type="button"
              onClick={() => onDownload(resource)}
              aria-label="Download"
            >
              <Download size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function iconFor(mimeType: string) {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return Presentation;
  if (mimeType.includes("pdf")) return FileText;
  return File;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
