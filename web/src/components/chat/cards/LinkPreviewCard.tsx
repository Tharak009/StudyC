import type { LinkPreviewPayload } from "../../../types/chat";
import { ExternalLink, Globe } from "lucide-react";

interface LinkPreviewCardProps {
  preview: LinkPreviewPayload;
}

export function LinkPreviewCard({ preview }: LinkPreviewCardProps) {
  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group mt-2 block w-full max-w-md overflow-hidden rounded-xl border border-border/70 bg-card/80 transition-all hover:border-border hover:bg-card hover:shadow-sm"
    >
      {preview.imageUrl && (
        <div className="relative h-40 w-full overflow-hidden bg-muted">
          <img
            src={preview.imageUrl}
            alt={preview.title || "Link preview"}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              // Hide broken image
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
      )}

      <div className="p-3">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <Globe className="h-3 w-3" />
          <span className="truncate">{preview.domain || preview.siteName}</span>
          <ExternalLink className="ml-auto h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>

        {preview.title && (
          <h5 className="mt-1 line-clamp-2 text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
            {preview.title}
          </h5>
        )}

        {preview.description && (
          <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground leading-relaxed">
            {preview.description}
          </p>
        )}
      </div>
    </a>
  );
}
