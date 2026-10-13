import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Calendar, Download, File, FileText, Image, Presentation, Trash2, Users, AlertTriangle, Loader2, X } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { resourcesApi } from "../api/resources.api";
import { Avatar } from "../components/avatar";
import { DownloadButton } from "../components/download-button";
import { LoadingScreen } from "../components/loading-screen";
import { useAuthStore } from "../store/auth.store";
import { useDeleteResource, useDownloadResource } from "../hooks/use-resource";

export function ResourceDetailsPage() {
  const { resourceId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user)!;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Close delete confirmation dialog on Escape key
  useEffect(() => {
    if (!showDeleteConfirm) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowDeleteConfirm(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showDeleteConfirm]);

  const resource = useQuery({
    queryKey: ["resource", resourceId],
    queryFn: () => resourcesApi.details(resourceId!),
    enabled: Boolean(resourceId)
  });

  const downloadMutation = useDownloadResource();
  const deleteMutation = useDeleteResource();

  if (resource.isLoading) return <LoadingScreen />;
  if (resource.isError || !resource.data) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-red-500">Resource could not be loaded.</p>
        <button className="secondary-button mt-4" type="button" onClick={() => navigate(-1)}>
          Go back
        </button>
      </div>
    );
  }

  const r = resource.data;
  const isUploader = r.uploadedBy._id === user._id;
  const Icon = iconFor(r.fileType);
  const size = formatSize(r.fileSize);

  return (
    <div className="animate-fade-up">
      <Link
        to={`/communities/${r.communityId._id}/resources`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-signal-600 hover:text-signal-700 dark:text-signal-300"
      >
        <ArrowLeft size={16} />
        Back to resources
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <section>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-start gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/[0.06]">
                <Icon size={28} className="text-slate-600 dark:text-slate-300" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-semibold">{r.title}</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {r.category.replace(/_/g, " ")} &middot; {size}
                </p>
              </div>
            </div>

            {r.description && (
              <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
                {r.description}
              </p>
            )}

            {r.tags.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {r.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium dark:bg-white/[0.06]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-6 border-t border-slate-100 pt-5 dark:border-white/[0.06]">
              <div className="flex flex-wrap gap-2">
                <DownloadButton resource={r} onDownload={(res) => downloadMutation.mutate(res._id)} isPending={downloadMutation.isPending} size="lg" />
                {isUploader && (
                  <>
                    <Link to={`/communities/${r.communityId._id}/resources/upload?edit=${r._id}`} className="secondary-button">
                      Edit
                    </Link>
                    <button
                      className="secondary-button hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Resource Deletion Confirmation Modal ───────────────────────── */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <div
              onClick={(e) => {
                if (e.target === e.currentTarget && !deleteMutation.isPending) {
                  setShowDeleteConfirm(false);
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
                  disabled={deleteMutation.isPending}
                  onClick={() => setShowDeleteConfirm(false)}
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
                  Are you sure you want to delete "{r.fileName || r.title}"? This action cannot be undone.
                </p>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    disabled={deleteMutation.isPending}
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    No
                  </button>
                  <button
                    type="button"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      deleteMutation.mutate(r._id, {
                        onSuccess: () => navigate(`/communities/${r.communityId._id}/resources`)
                      });
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-md transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {deleteMutation.isPending ? (
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

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
            <h2 className="mb-4 text-sm font-semibold">Details</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Avatar name={r.uploadedBy.fullName} src={r.uploadedBy.profilePicture} className="size-8" />
                <div>
                  <p className="text-sm font-medium">{r.uploadedBy.fullName}</p>
                  <p className="text-xs text-slate-500">Uploader</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-slate-500">
                <Calendar size={15} />
                <span>Uploaded {new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-500">
                <Download size={15} />
                <span>{r.downloadCount} downloads</span>
              </div>
              <div className="flex items-center gap-3 text-slate-500">
                <Users size={15} />
                <span>{r.communityId.name}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-500">
                <File size={15} />
                <span className="truncate">{r.fileName}</span>
              </div>
            </div>
          </section>
        </aside>
      </div>
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
