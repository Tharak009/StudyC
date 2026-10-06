import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Camera,
  Upload,
  Sparkles,
  Users,
  Shield,
  Lock,
  Globe,
  Layers,
  ArrowRight
} from "lucide-react";
import {
  COMMUNITY_CATEGORIES,
  type Community,
  type CommunityVisibility,
  type CommunityCategory,
  type CommunityType,
  type CommunityJoinPolicy
} from "../types/community";

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
  "Multidisciplinary"
];

const COMMUNITY_TYPES: { label: string; value: CommunityType }[] = [
  { label: "Academic", value: "ACADEMIC" },
  { label: "Study Group", value: "STUDY_GROUP" },
  { label: "College", value: "COLLEGE" },
  { label: "Club", value: "CLUB" },
  { label: "Interest", value: "INTEREST" },
  { label: "Project", value: "PROJECT" }
];

const VISIBILITY_OPTIONS: { label: string; value: CommunityVisibility }[] = [
  { label: "Public", value: "PUBLIC" },
  { label: "College Only", value: "COLLEGE_ONLY" },
  { label: "Private", value: "PRIVATE" },
  { label: "Invite Only", value: "INVITE_ONLY" }
];

export function CommunityFormModal({
  community,
  onClose,
  onSave
}: CommunityFormModalProps) {
  const isEdit = Boolean(community);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<CommunityCategory>("PROGRAMMING");
  const [type, setType] = useState<CommunityType>("ACADEMIC");
  const [department, setDepartment] = useState("Computer Science");
  const [visibility, setVisibility] = useState<CommunityVisibility>("PUBLIC");
  const [bannerPreview, setBannerPreview] = useState<string>("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [icon, setIcon] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (community) {
      setName(community.name || "");
      setDescription(community.description || "");
      setCategory(community.category || "PROGRAMMING");
      setType(community.type || "ACADEMIC");
      setDepartment(community.tags?.[0] || "Computer Science");
      setVisibility(community.visibility || "PUBLIC");
      setBannerPreview(community.bannerImage || community.banner || "");
      setIcon(community.icon || "");
      setErrors({});
    } else {
      setName("");
      setDescription("");
      setCategory("PROGRAMMING");
      setType("ACADEMIC");
      setDepartment("Computer Science");
      setVisibility("PUBLIC");
      setBannerPreview("");
      setIcon("");
      setErrors({});
    }
  }, [community]);

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit");
      return;
    }

    setBannerFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setBannerPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = "Community name is required";
    } else if (name.trim().length < 3) {
      newErrors.name = "Name must be at least 3 characters";
    }
    if (!description.trim()) {
      newErrors.description = "Description is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim(),
      category,
      type,
      tags: [department],
      visibility,
      icon: icon.trim() || undefined,
      bannerImage: bannerFile || undefined
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[min(90vh,820px)] overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0B132B] flex flex-col my-auto animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-150 p-5 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#1E90FF]/10 text-[#1E90FF]">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEdit ? "Edit Community Details" : "Create New Community"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Launch an academic hub for your classmates, department, or project team
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Two-Pane Body: Form & Live Preview */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Left Column: Form Controls (7 cols) */}
          <form onSubmit={handleSubmit} className="md:col-span-7 space-y-4">
            {/* Community Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Community Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Distributed Systems & Cloud 2026"
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1E90FF]"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500">{errors.name}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Description *
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this community for? Mention goals, topics, and collaboration expectations."
                className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1E90FF]"
              />
              {errors.description && (
                <p className="mt-1 text-xs text-red-500">{errors.description}</p>
              )}
            </div>

            {/* Category & Type Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Academic Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CommunityCategory)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#1E90FF]"
                >
                  {COMMUNITY_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Community Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as CommunityType)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#1E90FF]"
                >
                  {COMMUNITY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Visibility & Department Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Access Visibility
                </label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as CommunityVisibility)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#1E90FF]"
                >
                  {VISIBILITY_OPTIONS.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#1E90FF]"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom Icon URL & Banner File */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-white/5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Community Icon (Image URL)
                </label>
                <input
                  type="url"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="https://example.com/icon.png"
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1E90FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Cover Banner Image
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBannerChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-white/[0.02] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <Upload size={14} className="text-[#1E90FF]" />
                  <span>
                    {bannerFile ? bannerFile.name : "Upload Banner (Max 5MB)"}
                  </span>
                </button>
              </div>
            </div>
          </form>

          {/* Right Column: Interactive Live Preview Card (5 cols) */}
          <div className="md:col-span-5 flex flex-col justify-between p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#080D1A]/50">
            <div>
              <div className="flex items-center gap-2 mb-3 text-[10px] font-bold uppercase tracking-wider text-[#1E90FF]">
                <Sparkles size={13} />
                <span>Live Directory Preview</span>
              </div>

              {/* Mock Community Card */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0B132B] p-4 shadow-md">
                <div className="relative h-28 w-full overflow-hidden rounded-xl bg-gradient-to-br from-[#080D1A] via-[#0F1A30] to-[#162544]">
                  {bannerPreview ? (
                    <img
                      src={bannerPreview}
                      alt=""
                      className="size-full object-cover opacity-80"
                    />
                  ) : (
                    <div className="size-full opacity-25 bg-[radial-gradient(#1E90FF_1px,transparent_1px)] [background-size:12px_12px]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  <div className="absolute top-2 right-2">
                    <span className="rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-xs border border-white/10">
                      {type.replace("_", " ")}
                    </span>
                  </div>

                  <div className="absolute bottom-2 left-2">
                    {icon ? (
                      <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-white dark:border-[#0B132B] shadow-md bg-white">
                        <img src={icon} alt="" className="size-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl border-2 border-white dark:border-[#0B132B] bg-gradient-to-br from-[#1E90FF] to-indigo-600 flex items-center justify-center text-white text-base font-black shadow-md">
                        {name ? name.charAt(0).toUpperCase() : "S"}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {name || "Community Title Preview"}
                    </h4>
                    {visibility === "COLLEGE_ONLY" ? (
                      <Shield size={13} className="text-[#1E90FF] shrink-0" />
                    ) : visibility === "PRIVATE" ? (
                      <Lock size={13} className="text-slate-400 shrink-0" />
                    ) : null}
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#1E90FF]">
                    {category}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {description ||
                      "Your community description will appear here in the discovery directory."}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Users size={12} />
                    <span>1 member</span>
                  </span>
                  <span className="font-bold text-[#1E90FF]">
                    Discover →
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200/80 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400">
              <p>
                Once created, you will become the <strong>Community Owner</strong>. You can invite peers, create discussion and study groups, and post official broadcasts.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-150 p-4 px-6 dark:border-white/10 bg-slate-50/50 dark:bg-black/15 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#1E90FF] hover:bg-[#187bcd] shadow-md shadow-[#1E90FF]/25 transition-all cursor-pointer"
          >
            {isEdit ? "Save Changes" : "Create Community"}
          </button>
        </div>
      </div>
    </div>
  );
}
