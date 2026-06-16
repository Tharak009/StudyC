import { useState } from "react";
import { SearchBar } from "../components/search-bar";
import { useAdminResources, useDeleteResource } from "../hooks/use-admin";

export function ResourcesManagementPage() {
  const [search, setSearch] = useState("");
  const deleteResource = useDeleteResource();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useAdminResources({
    limit: 20,
    search: search || undefined
  });

  const resources = data?.pages.flatMap((p) => p.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  return (
    <div className="animate-fade-up">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">Resources</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {total} resource{total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="w-full sm:w-64">
          <SearchBar value={search} onChange={setSearch} placeholder="Search resources..." />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Community</th>
              <th className="px-4 py-3">Uploaded by</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Downloads</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {resources.map((resource) => (
              <tr key={resource._id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                <td className="px-4 py-3 font-medium">{resource.title}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{resource.communityId?.name ?? "Unknown"}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{resource.uploadedBy?.fullName ?? "Unknown"}</td>
                <td className="px-4 py-3">
                  <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium dark:bg-white/[0.06]">
                    {resource.category.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3">{resource.downloadCount}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/10"
                    onClick={() => { if (confirm("Delete this resource?")) deleteResource.mutate(resource._id); }}
                    disabled={deleteResource.isPending}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasNextPage && (
        <div className="mt-6 text-center">
          <button
            type="button"
            className="primary-button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
