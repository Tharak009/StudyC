import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Download, File, FileText, Image, Presentation, Trash2, Users } from "lucide-react";
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
                      onClick={() => {
                        if (window.confirm("Delete this resource?")) {
                          deleteMutation.mutate(r._id, {
                            onSuccess: () => navigate(`/communities/${r.communityId._id}/resources`)
                          });
                        }
                      }}
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
