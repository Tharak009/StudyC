import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
  X,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Tag
} from "lucide-react";
import { departments, semesters, categories } from "./ResourceFilterBar";
import { useToastStore } from "../../store/toast.store";
import { useAuthStore } from "../../store/auth.store";
import { dispatchCampusNotification } from "../../utils/notifications";
import { recordStudyActivity } from "../../utils/streak";

interface UploadResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (newResource: any) => void;
}

export function UploadResourceModal({
  isOpen,
  onClose,
  onUploadSuccess
}: UploadResourceModalProps) {
  const user = useAuthStore((state) => state.user);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [dept, setDept] = useState(departments[1]);
  const [semester, setSemester] = useState(semesters[6]); // Sem 6 default
  const [category, setCategory] = useState(categories[1].id);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { addToast } = useToastStore();

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > 50 * 1024 * 1024) {
        addToast("File exceeds 50MB maximum size limit.", "warning");
        return;
      }
      setFile(selected);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = tagInput.trim().replace(/^#/, "");
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
        setTagInput("");
      }
    }
  };

  const removeTag = (t: string) => {
    setTags(tags.filter((item) => item !== t));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      addToast("Please select a file to upload.", "warning");
      return;
    }
    if (!title.trim() || !subjectCode.trim()) {
      addToast("Please complete the required title and subject code.", "warning");
      return;
    }

    setIsUploading(true);
    let progress = 10;
    const interval = setInterval(() => {
      progress += 25;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);

          const newRes = {
            id: `res-${Date.now()}`,
            title,
            description: `${subjectName || subjectCode} course material and solutions shared for ${dept}.`,
            subjectCode: subjectCode.toUpperCase(),
            subjectName: subjectName || "Core Discipline Course",
            dept,
            semester,
            category,
            format: file.name.endsWith(".ipynb")
              ? "ipynb"
              : file.name.endsWith(".zip")
              ? "zip"
              : file.name.endsWith(".pptx")
              ? "pptx"
              : "pdf",
            fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
            fileUrl: "#",
            downloadCount: 1,
            rating: 5.0,
            reviewCount: 1,
            tags,
            uploader: {
              name: user?.fullName || "Aarav Sharma",
              roll: user?.rollNumber || "CS24-104",
              dept: user?.department || dept,
              isVerified: true
            },
            createdAt: "Just now"
          };

          onUploadSuccess(newRes);
          recordStudyActivity();
          dispatchCampusNotification({
            type: "RESOURCE_UPLOAD",
            title: `New Material in ${newRes.subjectCode}`,
            message: `"${newRes.title}" was published to the ${newRes.dept} Resource Vault.`,
            categoryTag: `${newRes.subjectCode} Vault`,
            href: "/resources",
            senderName: user?.fullName || "Student"
          });
          addToast("Material successfully published to the Academic Vault!", "success");
          onClose();
        }, 500);
      }
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-xl rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0F1A30] p-6 shadow-2xl"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X size={18} />
        </button>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 mb-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1E90FF] text-white">
            <UploadCloud size={16} />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
            Contribute to Campus Vault
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
          Share peer-reviewed study notes, previous year question papers, and code repositories with verified students.
        </p>

        {/* ── Form ────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Drag and Drop Zone */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf,.doc,.docx,.pptx,.zip,.tar,.gz,.ipynb,.cpp,.java,.py"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#1E90FF]/40 dark:border-[#1E90FF]/30 hover:border-[#1E90FF] rounded-2xl p-5 text-center bg-[#1E90FF]/5 dark:bg-[#080D1A]/50 hover:bg-[#1E90FF]/10 dark:hover:bg-[#162544]/60 transition-all cursor-pointer"
          >
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1E90FF]/15 text-[#1E90FF] mb-2">
              <UploadCloud size={20} />
            </div>
            {file ? (
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-center gap-2">
                <FileText size={14} className="text-[#1E90FF]" />
                <span>{file.name}</span>
                <span className="text-slate-400 tabular-nums">
                  ({(file.size / (1024 * 1024)).toFixed(1)} MB)
                </span>
              </div>
            ) : (
              <>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Click to browse or drag and drop note file
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Supports PDF, PPTX, Jupyter (.ipynb), ZIP up to 50MB
                </p>
              </>
            )}
          </div>

          {/* Document Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Document Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Raft Consensus Algorithm & State Machine Proofs"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#1E90FF]"
            />
          </div>

          {/* Subject Code & Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Subject Code *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. CS602"
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 font-semibold uppercase focus:outline-none focus:border-[#1E90FF]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Subject Name
              </label>
              <input
                type="text"
                placeholder="e.g. Distributed Computing"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#1E90FF]"
              />
            </div>
          </div>

          {/* Department, Semester & Category */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Department
              </label>
              <select
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-2.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                {departments.filter((d) => d !== "All Departments").map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-2.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                {semesters.filter((s) => s !== "All Semesters").map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-2.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                {categories.filter((c) => c.id !== "all").map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Topic Tags (Press Enter to add)
            </label>
            <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A]">
              {tags.map((t) => (
                <span
                  key={t}
                  className="flex items-center gap-1 text-[11px] font-medium text-[#1E90FF] bg-[#1E90FF]/10 px-2 py-0.5 rounded-md"
                >
                  #{t}
                  <button type="button" onClick={() => removeTag(t)} className="text-slate-400 hover:text-rose-500">
                    <X size={10} />
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder="Add tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                className="bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none flex-1 min-w-[80px]"
              />
            </div>
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400 tabular-nums">
                <span>Uploading encrypted chunk...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  style={{ width: `${uploadProgress}%` }}
                  className="h-full bg-[#1E90FF] transition-all duration-200"
                />
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-sm shadow-[#1E90FF]/25 hover:brightness-105 transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles size={14} />
              <span>{isUploading ? "Publishing..." : "Publish to Vault"}</span>
            </button>
          </div>

        </form>
      </motion.div>
    </div>
  );
}

export default UploadResourceModal;
