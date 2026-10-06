import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckSquare, Copy, Trash2, X, Check, Share2 } from "lucide-react";


interface MultiSelectActionBarProps {
  selectedCount: number;
  canDeleteEveryone?: boolean;
  onCopySelected: () => Promise<void>;
  onDeleteForMeSelected: () => void;
  onDeleteForEveryoneSelected?: () => void;
  onForwardSelected?: () => void;
  onCancel: () => void;
}

export function MultiSelectActionBar({
  selectedCount,
  canDeleteEveryone = false,
  onCopySelected,
  onDeleteForMeSelected,
  onDeleteForEveryoneSelected,
  onForwardSelected,
  onCancel
}: MultiSelectActionBarProps) {

  const [copied, setCopied] = useState(false);

  if (selectedCount === 0) return null;

  const handleCopy = async () => {
    await onCopySelected();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -16, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="absolute top-2 left-4 right-4 z-30 flex items-center justify-between px-4 py-2.5 rounded-2xl bg-white/95 dark:bg-[#111A2E]/95 border border-[#005FFF]/30 dark:border-[#005FFF]/40 shadow-lg shadow-black/10 dark:shadow-black/30 backdrop-blur-md"
      >
        {/* Left: Count */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#005FFF]/10 text-[#005FFF] dark:text-sky-400">
            <CheckSquare size={16} />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100">
            {selectedCount} {selectedCount === 1 ? "message" : "messages"} selected
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Copy */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            title="Copy message text"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            <span className="hidden sm:inline">{copied ? "Copied!" : "Copy"}</span>
          </button>

          {/* Forward */}
          {onForwardSelected && (
            <button
              type="button"
              onClick={onForwardSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/40 text-xs font-medium text-[#1E90FF] dark:text-sky-400 transition-colors cursor-pointer"
              title="Forward selected messages"
            >
              <Share2 size={14} />
              <span className="hidden sm:inline">Forward</span>
            </button>
          )}

          {/* Delete for Me */}

          <button
            type="button"
            onClick={onDeleteForMeSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 text-xs font-medium text-red-600 dark:text-red-400 transition-colors cursor-pointer"
            title="Delete from my view"
          >
            <Trash2 size={14} />
            <span className="hidden sm:inline">Delete for Me</span>
          </button>

          {/* Delete for Everyone (if eligible) */}
          {canDeleteEveryone && onDeleteForEveryoneSelected && (
            <button
              type="button"
              onClick={onDeleteForEveryoneSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-medium text-white transition-colors cursor-pointer"
              title="Delete for everyone"
            >
              <Trash2 size={14} />
              <span className="hidden sm:inline">Delete for Everyone</span>
            </button>
          )}

          {/* Cancel */}
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Cancel selection"
            aria-label="Cancel selection"
          >
            <X size={16} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
