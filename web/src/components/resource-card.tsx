import { Download, File, FileText, Image, Presentation } from "lucide-react";
import { Link } from "react-router";
import type { Resource } from "../types/resource";
import { Avatar } from "./avatar";

interface ResourceCardProps {
  resource: Resource;
  onDownload: (resource: Resource) => void;
}

export function ResourceCard({ resource, onDownload }: ResourceCardProps) {
  const Icon = iconFor(resource.fileType);
  const size = formatSize(resource.fileSize);

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:shadow-md dark:border-white/10 dark:bg-white/[0.04]">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/[0.06]">
            <Icon size={20} className="text-slate-600 dark:text-slate-300" />
          </div>
          <div className="min-w-0">
            <Link
              to={`/communities/${resource.communityId._id}/resources/${resource._id}`}
              className="text-sm font-semibold leading-tight hover:text-signal-600 dark:hover:text-signal-300"
            >
              <span className="line-clamp-2">{resource.title}</span>
            </Link>
            <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
              {resource.category} &middot; {size}
            </span>
          </div>
        </div>
      </div>

      {resource.description && (
        <p className="mb-3 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {resource.description}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {resource.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-white/[0.06] dark:text-slate-300"
          >
            #{tag}
          </span>
        ))}
        {resource.tags.length > 3 && (
          <span className="text-xs text-slate-400">+{resource.tags.length - 3}</span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Avatar
            name={resource.uploadedBy.fullName}
            src={resource.uploadedBy.profilePicture}
            className="size-6"
          />
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {resource.uploadedBy.fullName.split(" ")[0]}
          </span>
          <span className="text-xs text-slate-400">
            {resource.downloadCount} downloads
          </span>
        </div>
        <button
          className="icon-button size-8 rounded-full transition-colors hover:bg-signal-50 hover:text-signal-600 dark:hover:bg-signal-500/10 dark:hover:text-signal-300"
          type="button"
          onClick={() => onDownload(resource)}
          aria-label="Download"
        >
          <Download size={15} />
        </button>
      </div>
    </article>
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
