import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  FileCode,
  Download,
  Star,
  Trash2,
  ExternalLink,
  Pencil,
  Plus
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useToastStore } from "../../store/toast.store";

export interface StudentContribution {
  id: string;
  title: string;
  subjectCode: string;
  category: string;
  format: string;
  fileSize: string;
  downloads: number;
  rating: number;
  uploadedAt: string;
}

function loadSavedContributions(): StudentContribution[] {
  try {
    const raw = localStorage.getItem("studyconnect_vault_resources");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.map((item: any) => ({
      id: item.id,
      title: item.title,
      subjectCode: item.subjectCode || "GEN101",
      category: item.category || "Lecture Notes",
      format: item.format || "pdf",
      fileSize: item.fileSize || "2.5 MB",
      downloads: item.downloadCount || 0,
      rating: item.rating || 5.0,
      uploadedAt: item.uploadedAt || "Recently"
    }));
  } catch {
    return [];
  }
}

export function ContributionsTab() {
  const navigate = useNavigate();
  const { addToast } = useToastStore();
  const [contributions, setContributions] = useState<StudentContribution[]>(loadSavedContributions);

  const handleDelete = (id: string, title: string) => {
    setContributions((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      try {
        const raw = localStorage.getItem("studyconnect_vault_resources");
        if (raw) {
          const parsed = JSON.parse(raw).filter((item: any) => item.id !== id);
          localStorage.setItem("studyconnect_vault_resources", JSON.stringify(parsed));
        }
      } catch {}
      return updated;
    });
    addToast(`Deleted "${title}" from the Vault.`, "info");
  };

  return (
    <div className="space-y-6">
      
      {/* ── Header Row ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
            My Published Vault Materials
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            You have contributed {contributions.length} academic resources to the campus repository.
          </p>
        </div>

        <Link
          to="/resources"
          className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-md shadow-[#1E90FF]/25 transition-all"
        >
          <Plus size={14} />
          <span>Upload Note</span>
        </Link>
      </div>

      {/* ── Contributions Grid ──────────────────────────────────────── */}
      {contributions.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 backdrop-blur-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#1E90FF]/10 text-[#1E90FF] border border-[#1E90FF]/20 mb-3">
            <FileText size={26} />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
            No Published Materials Yet
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4 leading-relaxed">
            Share your lecture notes, assignments, or cheat sheets to the Academic Vault to build your campus contribution history.
          </p>
          <Link
            to="/resources"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-xs font-bold text-white shadow-md shadow-[#1E90FF]/25 cursor-pointer"
          >
            <Plus size={14} />
            <span>Upload First Note</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {contributions.map((item) => (
            <motion.div
              key={item.id}
              whileHover={{ y: -3 }}
              className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 backdrop-blur-xl shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#1E90FF]/10 text-[#1E90FF] border border-[#1E90FF]/20">
                    {item.subjectCode}
                  </span>
                  <span className="text-[10px] text-slate-400 tabular-nums font-medium">
                    {item.fileSize}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2 mb-3">
                  {item.title}
                </h4>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-[#080D1A] mb-3">
                  <div className="flex items-center gap-1 text-[11px] tabular-nums text-slate-600 dark:text-slate-300 font-medium">
                    <Download size={12} className="text-[#1E90FF]" />
                    <span>{item.downloads} downloads</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] tabular-nums text-amber-500 justify-end font-semibold">
                    <Star size={12} className="fill-current" />
                    <span>{item.rating.toFixed(1)} / 5.0</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800/60 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 tabular-nums">
                  {item.uploadedAt}
                </span>

                <div className="flex items-center gap-1">
                  <Link
                    to="/resources"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#1E90FF] transition-colors"
                    title="View in Vault"
                  >
                    <ExternalLink size={13} />
                  </Link>
                  <button
                    onClick={() => handleDelete(item.id, item.title)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    title="Delete Upload"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

    </div>
  );
}

export default ContributionsTab;
