import { FileUp, LoaderCircle, X } from "lucide-react";
import { useState, useRef } from "react";
import { RESOURCE_CATEGORIES, type ResourceCategory, type ResourceVisibility, type ResourceFormData } from "../types/resource";

interface UploadFormProps {
  initialData?: Partial<ResourceFormData>;
  onSubmit: (data: ResourceFormData, file: File) => void;
  onCancel: () => void;
  isPending: boolean;
  isEdit?: boolean;
}

export function UploadForm({ initialData, onSubmit, onCancel, isPending, isEdit }: UploadFormProps) {
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [category, setCategory] = useState<ResourceCategory>(initialData?.category ?? "NOTES");
  const [tagsInput, setTagsInput] = useState(initialData?.tags?.join(", ") ?? "");
  const [visibility, setVisibility] = useState<ResourceVisibility>(initialData?.visibility ?? "COMMUNITY");
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const tags = tagsInput
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    if (!isEdit && !file) return;
    onSubmit({ title: title.trim(), description: description.trim(), category, tags, visibility }, file!);
  };

  const isValid = title.trim().length > 0 && (isEdit || file !== null);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-1.5 block text-sm font-medium">File</label>
        {file ? (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/[0.04]">
            <FileUp size={16} className="text-slate-400" />
            <span className="flex-1 truncate">{file.name}</span>
            <button className="icon-button size-7" type="button" onClick={() => setFile(null)} aria-label="Remove file">
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500 transition-colors hover:border-signal-400 hover:text-signal-600 dark:border-white/15 dark:text-slate-400 dark:hover:border-signal-500 dark:hover:text-signal-300"
            type="button"
            onClick={() => fileInput.current?.click()}
          >
            <FileUp size={20} />
            {isEdit ? "Replace file (optional)" : "Click to select a file"}
          </button>
        )}
        <input
          ref={fileInput}
          className="sr-only"
          type="file"
          accept=".pdf,.ppt,.pptx,.doc,.docx,.zip,.jpg,.png"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <p className="mt-1.5 text-xs text-slate-400">PDF, PPT, PPTX, DOC, DOCX, ZIP, JPG, PNG &middot; Max 50 MB</p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="title">Title</label>
        <input id="title" className="field" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} required />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="description">Description</label>
        <textarea
          id="description"
          className="field min-h-24 resize-y"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={2000}
          rows={3}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="category">Category</label>
          <select
            id="category"
            className="field"
            value={category}
            onChange={(event) => setCategory(event.target.value as ResourceCategory)}
          >
            {RESOURCE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="visibility">Visibility</label>
          <select
            id="visibility"
            className="field"
            value={visibility}
            onChange={(event) => setVisibility(event.target.value as ResourceVisibility)}
          >
            <option value="COMMUNITY">Community Only</option>
            <option value="PUBLIC">Public</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="tags">
          Tags <span className="text-xs font-normal text-slate-400">(comma-separated)</span>
        </label>
        <input
          id="tags"
          className="field"
          value={tagsInput}
          onChange={(event) => setTagsInput(event.target.value)}
          placeholder="notes, exam, semester-1"
          maxLength={300}
        />
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium dark:bg-white/[0.06]">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button className="primary-button" type="submit" disabled={!isValid || isPending}>
          {isPending && <LoaderCircle className="animate-spin" size={16} />}
          {isEdit ? "Update resource" : "Upload resource"}
        </button>
        <button className="secondary-button" type="button" onClick={onCancel} disabled={isPending}>
          Cancel
        </button>
      </div>
    </form>
  );
}
