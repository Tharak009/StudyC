import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  Star,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertTriangle,
  Send
} from "lucide-react";
import type { VaultResource } from "./ResourceCard";
import { useToastStore } from "../../store/toast.store";

interface DocumentPreviewModalProps {
  resource: VaultResource | null;
  onClose: () => void;
  onDownload: (res: VaultResource) => void;
}

export function DocumentPreviewModal({
  resource,
  onClose,
  onDownload
}: DocumentPreviewModalProps) {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [userRating, setUserRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState("");
  const [submittedRating, setSubmittedRating] = useState(false);

  const { addToast } = useToastStore();

  if (!resource) return null;

  const totalPages = 14;

  const handleRatingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedRating(true);
    addToast(`Thank you for rating ${userRating} stars!`, "success");
    setReviewText("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25 }}
        className="relative w-full max-w-4xl h-[90vh] flex flex-col rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0F1A30] shadow-2xl overflow-hidden"
      >
        {/* ── Top Header Bar ──────────────────────────────────────────── */}
        <div className="h-16 shrink-0 px-6 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-[#080D1A]/50">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1E90FF]/15 text-[#1E90FF] shrink-0">
              <FileText size={18} />
            </div>
            <div className="flex flex-col overflow-hidden">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {resource.title}
              </h3>
              <span className="text-[10px] text-slate-400 tabular-nums">
                {resource.subjectCode} • Uploaded by {resource.uploader.name} ({resource.fileSize})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onDownload(resource)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Download size={13} />
              <span>Download</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Main Preview Canvas & Controls ───────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-100 dark:bg-[#080D1A]/95 overflow-hidden">
          
          {/* Zoom & Page Controls Floating Bar */}
          <div className="h-11 shrink-0 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-[#0F1A30]/70 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="tabular-nums text-[11px]">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30"
              >
                <ChevronRight size={15} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoomLevel((z) => Math.max(60, z - 10))}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                title="Zoom Out"
              >
                <ZoomOut size={15} />
              </button>
              <span className="tabular-nums text-[11px] w-12 text-center">
                {zoomLevel}%
              </span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                title="Zoom In"
              >
                <ZoomIn size={15} />
              </button>
            </div>
          </div>

          {/* Interactive Document Renderer Area */}
          <div className="flex-1 overflow-auto p-6 flex items-center justify-center">
            <div
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
              className="w-full max-w-2xl bg-white dark:bg-[#0F1A30] rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-2xl text-slate-800 dark:text-slate-200 space-y-4 font-sans text-xs transition-transform"
            >
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-50">
                    {resource.title}
                  </h2>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Course: {resource.subjectCode} • Module 3: Distributed State Consistency
                  </p>
                </div>
                <span className="text-[10px] font-bold text-[#1E90FF] bg-[#1E90FF]/10 px-2 py-0.5 rounded-full">
                  VERIFIED .EDU
                </span>
              </div>

              <p className="leading-relaxed text-slate-600 dark:text-slate-300">
                1. Overview of Consensus Protocols: In distributed systems, achieving state machine replication requires that all non-faulty nodes agree on identical sequences of state transitions even under arbitrary network partitions and message delays.
              </p>

              <div className="rounded-xl bg-slate-100 dark:bg-[#080D1A] p-4 font-mono text-[11px] text-[#1E90FF] border border-slate-200 dark:border-slate-800">
                <code>
                  // State Machine Replication Invariant:<br />
                  Forall nodes (i, j), state[i].commitIndex == state[j].commitIndex =&gt; log[i][0..k] == log[j][0..k]
                </code>
              </div>

              <p className="leading-relaxed text-slate-600 dark:text-slate-300">
                2. Raft Leader Election State Transitions: A node begins as a Follower. If election timeout triggers without receiving heartbeats, it increments currentTerm and transitions to Candidate.
              </p>
            </div>
          </div>

        </div>

        {/* ── Bottom Rating & Feedback Dock ───────────────────────────── */}
        <div className="shrink-0 p-4 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#0F1A30]/90 backdrop-blur-xl">
          <form onSubmit={handleRatingSubmit} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Rate this study resource:
              </span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    onClick={() => setUserRating(star)}
                    className="text-amber-400 p-0.5 cursor-pointer"
                  >
                    <Star
                      size={16}
                      className={
                        (hoverRating !== null ? star <= hoverRating : star <= userRating)
                          ? "fill-current"
                          : "text-slate-300 dark:text-slate-600"
                      }
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-1 max-w-md">
              <input
                type="text"
                placeholder="Optional review note (e.g. Cleared my midsem doubts)..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#1E90FF]"
              />
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
              >
                Submit
              </button>
            </div>
          </form>
        </div>

      </motion.div>
    </div>
  );
}

export default DocumentPreviewModal;
