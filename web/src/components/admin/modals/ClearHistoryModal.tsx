import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Eraser,
  X,
  AlertTriangle,
  Trash2
} from "lucide-react";
import type { GovernanceCommunity } from "../tabs/CommunityGovernanceTab";
import { useToastStore } from "../../../store/toast.store";

interface ClearHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  community: GovernanceCommunity | null;
  onConfirmClear: (communityId: string, scope: string) => void;
}

export function ClearHistoryModal({
  isOpen,
  onClose,
  community,
  onConfirmClear
}: ClearHistoryModalProps) {
  const { addToast } = useToastStore();

  const [scope, setScope] = useState("Entire Community Circle (All Sub-Channels)");
  const [confirmPhrase, setConfirmPhrase] = useState("");

  if (!isOpen || !community) return null;

  const isConfirmed = confirmPhrase.trim().toUpperCase() === "CLEAR HISTORY";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) {
      addToast('Please type the exact confirmation phrase "CLEAR HISTORY".', "warning");
      return;
    }

    onConfirmClear(community.id, scope);
    addToast(`Cleared chat message cache for ${community.name}.`, "info");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-md rounded-3xl border border-amber-500/40 bg-white dark:bg-[#0F1A30] p-6 shadow-2xl space-y-4"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2.5 text-amber-500">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/30">
            <Eraser size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
              Clear Message History Cache
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {community.name}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Clear Scope
            </label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3.5 py-2 text-xs font-bold"
            >
              <option value="Entire Community Circle (All Sub-Channels)">Entire Circle (All Sub-Channels)</option>
              <option value="#general-discussion only">#general-discussion only</option>
              <option value="#lab-practicals only">#lab-practicals only</option>
            </select>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle size={14} />
              <span>Non-Destructive Cache Flush:</span>
            </div>
            <p className="text-[11px] leading-relaxed opacity-90">
              Flushes chat messages from the live Socket.IO buffer and marks messages as archived. Pinned syllabus links and vault files will not be deleted.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Type <span className="text-amber-500 font-bold tracking-wide">CLEAR HISTORY</span> to confirm:
            </label>
            <input
              type="text"
              value={confirmPhrase}
              onChange={(e) => setConfirmPhrase(e.target.value)}
              placeholder="CLEAR HISTORY"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 uppercase"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isConfirmed}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/25 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Flush Cache
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default ClearHistoryModal;
