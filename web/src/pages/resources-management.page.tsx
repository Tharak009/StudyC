import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { SearchBar } from "../components/search-bar";
import { useAdminResources, useDeleteResource } from "../hooks/use-admin";

export function ResourcesManagementPage() {
  const [search, setSearch] = useState("");
  const [resourceToDelete, setResourceToDelete] = useState<any | null>(null);
  const deleteResource = useDeleteResource();

  // Close delete confirmation dialog on Escape key
  useEffect(() => {
    if (!resourceToDelete) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleteResource.isPending) {
        setResourceToDelete(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [resourceToDelete, deleteResource.isPending]);
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
                    className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/10 cursor-pointer"
                    onClick={() => setResourceToDelete(resource)}
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

      {/* ── Resource Deletion Confirmation Modal ───────────────────────── */}
      <AnimatePresence>
        {resourceToDelete && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget && !deleteResource.isPending) {
                setResourceToDelete(null);
              }
            }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md bg-white dark:bg-[#0F1A30] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl"
            >
              <button
                type="button"
                disabled={deleteResource.isPending}
                onClick={() => setResourceToDelete(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 text-rose-500 mb-3">
                <div className="p-2.5 rounded-xl bg-rose-500/10">
                  <AlertTriangle size={22} />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Are you sure you want to delete this resource?
                </h3>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                Are you sure you want to delete "{resourceToDelete.fileName || resourceToDelete.title}"? This action cannot be undone.
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={deleteResource.isPending}
                  onClick={() => setResourceToDelete(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  No
                </button>
                <button
                  type="button"
                  disabled={deleteResource.isPending}
                  onClick={() => {
                    deleteResource.mutate(resourceToDelete._id, {
                      onSettled: () => setResourceToDelete(null)
                    });
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  {deleteResource.isPending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      <span>Yes, Delete</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
