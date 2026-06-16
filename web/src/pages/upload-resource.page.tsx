import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { communitiesApi } from "../api/communities.api";
import { resourcesApi } from "../api/resources.api";
import { UploadForm } from "../components/upload-form";
import { useCreateResource, useUpdateResource } from "../hooks/use-resource";
import type { ResourceFormData } from "../types/resource";
import { getErrorMessage } from "../utils/errors";

export function UploadResourcePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");

  const community = useQuery({
    queryKey: ["community", id],
    queryFn: () => communitiesApi.details(id!),
    enabled: Boolean(id)
  });

  const existingResource = useQuery({
    queryKey: ["resource", editId],
    queryFn: () => resourcesApi.details(editId!),
    enabled: Boolean(editId)
  });

  const createMutation = useCreateResource(id);
  const updateMutation = useUpdateResource();

  const isEdit = Boolean(editId && existingResource.data);

  const handleSubmit = async (data: ResourceFormData, file: File) => {
    try {
      if (isEdit && editId) {
        await updateMutation.mutateAsync({ resourceId: editId, data, file });
      } else {
        await createMutation.mutateAsync({ data, file });
      }
      navigate(`/communities/${id}/resources`);
    } catch {
      // error displayed via mutation state
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  const initialData = isEdit && existingResource.data ? {
    title: existingResource.data.title,
    description: existingResource.data.description,
    category: existingResource.data.category,
    tags: existingResource.data.tags,
    visibility: existingResource.data.visibility
  } : undefined;

  if ((!community.isLoading && !community.data?.isMember) || (existingResource.isFetched && !existingResource.data)) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-red-500">You don't have access to upload resources here.</p>
        <button className="secondary-button mt-4" type="button" onClick={() => navigate(`/communities/${id}`)}>
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl animate-fade-up">
      <Link
        to={`/communities/${id}/resources`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-signal-600 hover:text-signal-700 dark:text-signal-300"
      >
        <ArrowLeft size={16} />
        Back to resources
      </Link>

      <h1 className="mb-2 text-xl font-semibold">
        {isEdit ? "Edit resource" : "Upload resource"}
      </h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        {community.data?.name ?? "Community"}
      </p>

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-300">
          {getErrorMessage(error)}
        </p>
      )}

      {isEdit && existingResource.isLoading ? (
        <div className="py-8 text-center text-sm text-slate-500">Loading...</div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.04]">
          <UploadForm
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={() => navigate(`/communities/${id}/resources`)}
            isPending={isPending}
            isEdit={isEdit}
          />
        </div>
      )}
    </div>
  );
}
