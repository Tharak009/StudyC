import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, ChevronLeft, LoaderCircle, Save, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";
import { z } from "zod";
import { communitiesApi } from "../api/communities.api";
import { DashboardSidebar } from "../components/layout/dashboard-sidebar";
import { FormField } from "../components/form-field";
import { getErrorMessage } from "../utils/errors";
import {
  COMMUNITY_CATEGORIES,
  type CommunityCategory,
  type CommunityType,
  type CommunityVisibility,
  type CommunityJoinPolicy
} from "../types/community";

const COMMUNITY_TYPES = [
  { label: "Academic", value: "ACADEMIC" },
  { label: "Study Group", value: "STUDY_GROUP" },
  { label: "College", value: "COLLEGE" },
  { label: "Club", value: "CLUB" },
  { label: "Interest", value: "INTEREST" },
  { label: "Project", value: "PROJECT" }
] as const;

const VISIBILITY_OPTIONS = [
  { label: "Public", value: "PUBLIC" },
  { label: "Private", value: "PRIVATE" },
  { label: "College Only", value: "COLLEGE_ONLY" },
  { label: "Invite Only", value: "INVITE_ONLY" }
] as const;

const JOIN_POLICY_OPTIONS = [
  { label: "Open Access", value: "OPEN" },
  { label: "Application Required", value: "APPLICATION" },
  { label: "Invite Only", value: "INVITE_ONLY" }
] as const;

const schema = z.object({
  name: z.string().min(3).max(50),
  description: z.string().max(1000),
  category: z.string().min(1),
  type: z.enum(["ACADEMIC", "STUDY_GROUP", "COLLEGE", "CLUB", "INTEREST", "PROJECT"]),
  tagsText: z.string(),
  visibility: z.enum(["PUBLIC", "PRIVATE", "COLLEGE_ONLY", "INVITE_ONLY", "public", "private"]),
  joinPolicy: z.enum(["OPEN", "APPLICATION", "INVITE_ONLY"]),
  icon: z.string().optional(),
  bannerImage: z.instanceof(FileList).optional()
});

type FormValues = z.infer<typeof schema>;

export function CommunityFormPage({ mode }: { mode?: "create" | "edit" } = {}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = mode === "edit" || (mode === undefined && Boolean(id));
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const existing = useQuery({
    queryKey: ["community", id],
    queryFn: () => communitiesApi.details(id!),
    enabled: isEdit && Boolean(id)
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: existing.data
      ? {
          name: existing.data.name,
          description: existing.data.description,
          category: existing.data.category,
          type: existing.data.type || "ACADEMIC",
          tagsText: existing.data.tags.join(", "),
          visibility: existing.data.visibility || "PUBLIC",
          joinPolicy: existing.data.joinPolicy || "OPEN",
          icon: existing.data.icon || ""
        }
      : {
          name: "",
          description: "",
          category: "PROGRAMMING",
          type: "ACADEMIC",
          tagsText: "",
          visibility: "PUBLIC",
          joinPolicy: "OPEN",
          icon: ""
        }
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        name: values.name,
        description: values.description,
        category: values.category as CommunityCategory,
        type: values.type as CommunityType,
        tags: values.tagsText.split(",").map((tag) => tag.trim()).filter(Boolean),
        visibility: values.visibility as CommunityVisibility,
        joinPolicy: values.joinPolicy as CommunityJoinPolicy,
        icon: values.icon,
        bannerImage: values.bannerImage?.[0]
      };
      return isEdit ? communitiesApi.update(id!, payload) : communitiesApi.create(payload);
    },
    onSuccess: (community) => {
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      queryClient.setQueryData(["community", community._id], community);
      reset({
        name: community.name,
        description: community.description,
        category: community.category,
        type: community.type || "ACADEMIC",
        tagsText: community.tags.join(", "),
        visibility: community.visibility,
        joinPolicy: community.joinPolicy || "OPEN",
        icon: community.icon || ""
      });
      navigate(`/communities/${community._id}`);
    }
  });

  useEffect(() => {
    if (existing.data?.bannerImage || existing.data?.banner) {
      setPreviewImage(existing.data.bannerImage || existing.data.banner || null);
    }
  }, [existing.data]);

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setPreviewImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  if (isEdit && existing.isLoading) {
    return (
      <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-50 font-sans antialiased transition-colors duration-300">
        <DashboardSidebar currentNav="/communities" />
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto items-center justify-center">
          <div className="py-16 text-sm text-slate-500">Loading community...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-50 font-sans antialiased transition-colors duration-300">
      <DashboardSidebar currentNav="/communities" />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <main className="p-4 sm:p-8 space-y-6 max-w-4xl w-full mx-auto">
          {/* Breadcrumb / Back Link */}
          <div>
            <Link
              to="/communities"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              <ChevronLeft size={14} />
              <span>Back to Communities</span>
            </Link>
          </div>

          <div className="animate-fade-up">
            <header className="border-b border-slate-200 pb-7 dark:border-white/10">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1E90FF]">
                {isEdit ? "Community management" : "New community"}
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
                {isEdit ? "Edit community" : "Create a community"}
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Set the academic domain, community type, visibility, tags, and banner for collaborative study.
              </p>
            </header>

            <form className="space-y-7 py-8" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
        <FormField label="Name" error={errors.name?.message} {...register("name")} />
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Description
          </span>
          <textarea
            rows={5}
            className="field resize-none"
            placeholder="What should students use this community for?"
            {...register("description")}
          />
          <span className="mt-1.5 block text-xs text-slate-500">Maximum 1000 characters</span>
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Community Type
            </span>
            <select className="field" {...register("type")}>
              {COMMUNITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Category
            </span>
            <select className="field" {...register("category")}>
              {COMMUNITY_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Visibility
            </span>
            <select className="field" {...register("visibility")}>
              {VISIBILITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Join Policy
            </span>
            <select className="field" {...register("joinPolicy")}>
              {JOIN_POLICY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <FormField
          label="Tags"
          hint="Separate up to 10 tags with commas"
          error={errors.tagsText?.message}
          placeholder="algorithms, dsa, java, interview"
          {...register("tagsText")}
        />

        <FormField
          label="Icon Identifier or URL (Optional)"
          hint="e.g. code, book, or an image link"
          error={errors.icon?.message}
          placeholder="book-open"
          {...register("icon")}
        />

        <div>
          <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Community Banner / Custom Photo
          </span>

          {previewImage ? (
            <div className="relative h-44 w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 group mb-2 shadow-sm">
              <img
                src={previewImage}
                alt="Community banner preview"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <label className="px-4 py-2 rounded-xl bg-[#1E90FF] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#187BCD] cursor-pointer shadow-md">
                  <Camera size={14} />
                  <span>Change Photo</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    {...register("bannerImage", { onChange: handleBannerChange })}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-rose-500 cursor-pointer shadow-md"
                >
                  <Trash2 size={14} />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/10 hover:border-[#1E90FF] dark:hover:border-[#1E90FF] bg-slate-50/60 dark:bg-white/[0.02] cursor-pointer transition-colors text-center">
              <div className="p-2.5 rounded-xl bg-[#1E90FF]/10 text-[#1E90FF] mb-2">
                <Camera size={22} />
              </div>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Upload Custom Community Photo / Banner
              </span>
              <span className="text-xs text-slate-400 mt-1">
                JPEG, PNG, or WebP (max 5MB)
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                {...register("bannerImage", { onChange: handleBannerChange })}
              />
            </label>
          )}
        </div>

        {mutation.isError && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-300">
            {getErrorMessage(mutation.error)}
          </p>
        )}

        <div className="flex justify-end border-t border-slate-200 pt-6 dark:border-white/10">
          <button className="primary-button" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />}
            {mutation.isPending ? "Saving..." : isEdit ? "Save community" : "Create community"}
          </button>
        </div>
      </form>
    </div>
        </main>
      </div>
    </div>
  );
}
