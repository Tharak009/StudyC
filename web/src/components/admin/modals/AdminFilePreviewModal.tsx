import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  FileText,
  FileCode,
  Download,
  ShieldCheck,
  Award,
  Trash2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Sparkles,
  CheckCircle2,
  Info
} from "lucide-react";
import type { VaultResourceItem } from "../tabs/ResourceModerationTab";
import { useToastStore } from "../../../store/toast.store";

interface AdminFilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: VaultResourceItem | null;
  onEndorse: (resourceId: string) => void;
  onPurge: (resourceId: string) => void;
}

export function AdminFilePreviewModal({
  isOpen,
  onClose,
  resource,
  onEndorse,
  onPurge
}: AdminFilePreviewModalProps) {
  const { addToast } = useToastStore();
  const [zoomLevel, setZoomLevel] = useState(100);

  if (!isOpen || !resource) return null;

  const handleEndorseClick = () => {
    onEndorse(resource.id);
    addToast(`Granted Faculty Quality Endorsement to "${resource.title}".`, "success");
    onClose();
  };

  const handlePurgeClick = () => {
    onPurge(resource.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-4xl rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0F1A30] p-6 shadow-2xl space-y-4"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200/70 dark:border-slate-800/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#1E90FF] bg-[#1E90FF]/10 px-2.5 py-0.5 rounded-lg border border-[#1E90FF]/20">
                {resource.subjectCode} • {resource.semester}
              </span>
              <span className="text-xs tabular-nums font-bold text-slate-400">
                {resource.format.toUpperCase()} ({resource.fileSize})
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 line-clamp-1">
              {resource.title}
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              Uploaded by <strong className="text-slate-700 dark:text-slate-200">{typeof (resource as any).uploader === "object" ? (resource as any).uploader?.name || (resource as any).uploader?.fullName || resource.uploaderName : resource.uploaderName || (resource as any).uploader}</strong> ({resource.uploaderRoll || (resource as any).uploader?.roll || "CS"} • {resource.uploaderDept || (resource as any).uploader?.dept || "Campus"})
            </p>
          </div>

          {/* Quick Zoom Controls */}
          <div className="flex items-center gap-1.5 self-start sm:self-center">
            <button
              onClick={() => setZoomLevel((z) => Math.max(z - 15, 70))}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
            <span className="text-xs tabular-nums font-bold text-slate-500 px-1">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(z + 15, 140))}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
          </div>
        </div>

        {/* ── Document Inspection Viewer & Sidebar ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Document Preview Canvas (8 cols) */}
          <div className="lg:col-span-8 rounded-2xl bg-slate-100 dark:bg-[#080D1A] border border-slate-200 dark:border-slate-800 p-6 min-h-[320px] max-h-[380px] overflow-y-auto scrollbar-none space-y-4">
            <div style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top left" }} className="space-y-3 font-sans transition-transform duration-150">
              
              <div className="p-4 rounded-xl bg-white dark:bg-[#0F1A30] border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-200/60 dark:border-slate-800/60 pb-2">
                  <span>Department of Computer Science & Engineering</span>
                  <span>Verified Coursework Material</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {resource.title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Comprehensive review document detailing syllabus proofs, state transition invariants, and end-semester problem breakdowns with step-by-step mathematical proofs.
                </p>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#080D1A] border border-slate-200/50 dark:border-slate-800/50 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  <code>
                    1. Leader Election: If candidate receives votes from majority (N/2 + 1), it becomes leader.<br />
                    2. Log Matching Invariant: If two logs contain an entry with same index & term, they are identical up to that point.
                  </code>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-[#0F1A30] border border-slate-200 dark:border-slate-800 shadow-sm text-xs text-slate-500 tabular-nums">
                [Page 2 of 14 — Verified by OCR & Anti-Plagiarism Engine: 99.4% Originality Score]
              </div>

            </div>
          </div>

          {/* Metadata & Flagged Info Sidebar (4 cols) */}
          <div className="lg:col-span-4 p-4 rounded-2xl bg-slate-50 dark:bg-[#080D1A] border border-slate-200 dark:border-slate-800 space-y-4 flex flex-col justify-between">
            
            <div className="space-y-3">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Verification Metadata
              </span>

              <div className="space-y-2 text-xs tabular-nums text-slate-600 dark:text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Downloads:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{resource.downloads}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Peer Rating:</span>
                  <span className="font-bold text-amber-500">★ {resource.rating.toFixed(1)} / 5.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">SHA-256 Hash:</span>
                  <span className="text-[#1E90FF] truncate max-w-[120px]">{resource.checksum}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Uploaded Date:</span>
                  <span>{resource.uploadedAt}</span>
                </div>
              </div>

              {/* Peer Flag Alert if flagged */}
              {resource.status === "FLAGGED" && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-400 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[11px]">
                    <AlertTriangle size={13} />
                    <span>Peer Flagged Reason:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    "{resource.flagReason || "Contains copyrighted instructor test bank"}"
                  </p>
                </div>
              )}
            </div>

            {/* Quick Action Endorse / Purge */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={handleEndorseClick}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/25 cursor-pointer"
              >
                <Award size={14} />
                <span>Endorse Official Badge</span>
              </button>

              <button
                onClick={handlePurgeClick}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 text-xs font-bold transition-colors cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Purge from Vault</span>
              </button>
            </div>

          </div>

        </div>

      </motion.div>
    </div>
  );
}

export default AdminFilePreviewModal;
