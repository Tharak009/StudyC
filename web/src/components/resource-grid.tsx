import type { Resource } from "../types/resource";
import { ResourceCard } from "./resource-card";

interface ResourceGridProps {
  resources: Resource[];
  isOwner?: boolean;
  onDownload: (resource: Resource) => void;
  isLoading: boolean;
}

export function ResourceGrid({ resources, onDownload, isLoading }: ResourceGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]"
          >
            <div className="mb-3 flex items-center gap-3">
              <div className="size-11 rounded-xl bg-slate-200 dark:bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-white/10" />
                <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-white/10" />
              </div>
            </div>
            <div className="h-3 w-full rounded bg-slate-200 dark:bg-white/10" />
          </div>
        ))}
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">No resources found</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {resources.map((resource) => (
        <ResourceCard
          key={resource._id}
          resource={resource}
          onDownload={onDownload}
        />
      ))}
    </div>
  );
}
