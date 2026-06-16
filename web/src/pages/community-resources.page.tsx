import { useMutation, useQuery } from "@tanstack/react-query";
import { LoaderCircle, Upload } from "lucide-react";
import { useState, useCallback } from "react";
import { Link, useParams } from "react-router";
import { communitiesApi } from "../api/communities.api";
import { resourcesApi } from "../api/resources.api";
import { CategoryFilter } from "../components/category-filter";
import { ResourceGrid } from "../components/resource-grid";
import { SearchBar } from "../components/search-bar";
import { TagFilter } from "../components/tag-filter";
import { useCommunityResources } from "../hooks/use-resource";
import type { Resource } from "../types/resource";

export function CommunityResourcesPage() {
  const { id } = useParams();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState<"recent" | "downloads" | "name">("recent");

  const community = useQuery({
    queryKey: ["community", id],
    queryFn: () => communitiesApi.details(id!),
    enabled: Boolean(id)
  });

  const resources = useCommunityResources(id, {
    search: search || undefined,
    category: category || undefined,
    tag: tag || undefined,
    sort
  });

  const allResources = resources.data?.pages.flatMap((p) => p.items) ?? [];
  const allTags = [...new Set(allResources.flatMap((r) => r.tags))];

  const downloadMutation = useMutation({
    mutationFn: (resourceId: string) => resourcesApi.download(resourceId)
  });

  const handleDownload = useCallback(
    (resource: Resource) => {
      if (resource.fileUrl) window.open(resource.fileUrl, "_blank");
      downloadMutation.mutate(resource._id);
    },
    [downloadMutation]
  );

  const isOwner = community.data?.membershipRole === "OWNER";

  return (
    <div className="animate-fade-up">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.025em]">Resources</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {community.data?.name ?? "Community"} &middot; {resources.data?.pages[0]?.total ?? 0} files
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="field text-sm"
            value={sort}
            onChange={(event) => setSort(event.target.value as typeof sort)}
          >
            <option value="recent">Most recent</option>
            <option value="downloads">Most downloaded</option>
            <option value="name">Name A-Z</option>
          </select>
          {community.data?.isMember && (
            <Link to={`/communities/${id}/resources/upload`} className="primary-button">
              <Upload size={16} />
              Upload
            </Link>
          )}
        </div>
      </div>

      <div className="mb-4">
        <SearchBar value={search} onChange={setSearch} />
      </div>

      <div className="mb-4 space-y-3">
        <CategoryFilter selected={category} onChange={setCategory} />
        <TagFilter tags={allTags} selected={tag} onChange={setTag} />
      </div>

      {resources.isLoading ? (
        <ResourceGrid resources={[]} isOwner={isOwner} onDownload={handleDownload} isLoading />
      ) : (
        <>
          <ResourceGrid
            resources={allResources}
            isOwner={isOwner}
            onDownload={handleDownload}
            isLoading={false}
          />

          {resources.hasNextPage && (
            <div className="mt-6 text-center">
              <button
                className="secondary-button"
                type="button"
                onClick={() => resources.fetchNextPage()}
                disabled={resources.isFetchingNextPage}
              >
                {resources.isFetchingNextPage && <LoaderCircle className="animate-spin" size={14} />}
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
