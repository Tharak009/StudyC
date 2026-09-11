import { useState, useEffect, useRef } from "react";
import { X, Camera, Upload, Trash2 } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { COMMUNITY_CATEGORIES, type Community, type CommunityVisibility, type CommunityCategory } from "../types/community";

interface CommunityFormModalProps {
  community: Community | null; // null for Create mode, object for Edit mode
  onClose: () => void;
  onSave: (values: any) => void;
}

const DEPARTMENTS = [
  "Computer Science",
  "Information Technology",
  "Electrical Engineering",
  "Electronics Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Multidisciplinary",
];

export function CommunityFormModal({ community, onClose, onSave }: CommunityFormModalProps) {
  const isEdit = Boolean(community);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<CommunityCategory>("Other");
  const [department, setDepartment] = useState("");
  const [visibility, setVisibility] = useState<CommunityVisibility>("public");
  const [bannerImage, setBannerImage] = useState("");
  const [rules, setRules] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setBannerImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (community) {
      setName(community.name || "");
      setDescription(community.description || "");
      setCategory(community.category || "Other");
      setDepartment(community.tags?.[0] || "Computer Science");
      setVisibility(community.visibility || "public");
      setBannerImage(community.bannerImage || "");
      setRules("");
      setErrors({});
    } else {
      setName("");
      setDescription("");
      setCategory("Other");
      setDepartment("Computer Science");
      setVisibility("public");
      setBannerImage("");
      setRules("");
      setErrors({});
    }
  }, [community]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = "Community name is required";
    }
    if (!description.trim()) {
      newErrors.description = "Description is required";
    }
    if (!department) {
      newErrors.department = "Department is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim(),
      category,
      tags: [department],
      visibility,
      bannerImage,
      rules,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-start overflow-y-auto p-4 animate-fade-in">
      <div
        className="fixed inset-0 bg-slate-950/20 backdrop-blur-[2px] transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="relative my-8 w-full max-w-md transform rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/5 dark:bg-ink-900 transition-all duration-300 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-150 pb-3 dark:border-white/5">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {isEdit ? "Edit Community Details" : "Create New Community"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-950 dark:hover:bg-white/[0.04] dark:hover:text-white transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <Input
            label="Community Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            placeholder="e.g. Java Coding Club"
          />

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-550 dark:text-slate-400">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CommunityCategory)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition dark:border-white/5 dark:bg-white/[0.02] dark:text-white focus:border-indigo-500 focus:bg-white"
            >
              {COMMUNITY_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-550 dark:text-slate-400">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition dark:border-white/5 dark:bg-white/[0.02] dark:text-white focus:border-indigo-500 focus:bg-white"
              >
                <option value="">Select Dept</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              {errors.department && (
                <span className="mt-1 block text-[10px] text-rose-500">{errors.department}</span>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-550 dark:text-slate-400">
                Visibility
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as CommunityVisibility)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition dark:border-white/5 dark:bg-white/[0.02] dark:text-white focus:border-indigo-500 focus:bg-white"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>

          {/* Custom Community Image / Banner Uploader */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-550 dark:text-slate-400">
              Community Photo / Banner
            </label>

            {bannerImage ? (
              <div className="relative h-28 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 group">
                <img
                  src={bannerImage}
                  alt="Community Banner Preview"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold flex items-center gap-1 hover:bg-sky-500 cursor-pointer"
                  >
                    <Camera size={13} />
                    <span>Change</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBannerImage("")}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold flex items-center gap-1 hover:bg-rose-500 cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-white/10 hover:border-sky-500/50 dark:hover:border-sky-500/50 bg-slate-50/50 dark:bg-white/[0.02] cursor-pointer transition-colors"
              >
                <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500 mb-1.5">
                  <Upload size={18} />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Upload Custom Community Photo
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  PNG, JPG, or WebP up to 5MB
                </span>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />

            <Input
              label="Or paste an image URL"
              value={bannerImage.startsWith("data:") ? "" : bannerImage}
              onChange={(e) => setBannerImage(e.target.value)}
              placeholder="https://images.unsplash.com/photo-..."
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-550 dark:text-slate-400">
              Community Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a detailed description of the community's study topics..."
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-850 outline-none transition dark:border-white/5 dark:bg-white/[0.02] dark:text-white focus:border-indigo-500 focus:bg-white"
            />
            {errors.description && (
              <span className="mt-1 block text-[10px] text-rose-500">{errors.description}</span>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-550 dark:text-slate-400">
              Community Rules (Optional)
            </label>
            <textarea
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              placeholder="e.g. 1. Respect other members..."
              rows={2}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-850 outline-none transition dark:border-white/5 dark:bg-white/[0.02] dark:text-white focus:border-indigo-500 focus:bg-white"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/5 dark:text-slate-400 dark:hover:bg-white/[0.03] transition-all"
            >
              Cancel
            </button>
            <Button type="submit">
              {isEdit ? "Save Changes" : "Create Community"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
