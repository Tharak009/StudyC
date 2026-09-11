import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Trash2,
  X,
  AlertTriangle,
  ShieldAlert,
  Bell,
  Check
} from "lucide-react";
import type { VaultResourceItem } from "../tabs/ResourceModerationTab";
import { useToastStore } from "../../../store/toast.store";

interface PurgeResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: VaultResourceItem | null;
  onConfirmPurge: (resourceId: string, reason: string, issueWarning: boolean) => void;
}

export function PurgeResourceModal({
  isOpen,
  onClose,
  resource,
  onConfirmPurge
}: PurgeResourceModalProps) {
  const { addToast } = useToastStore();

  const [purgeReason, setPurgeReason] = useState("Copyright Infringement / Proprietary Material");
  const [issueWarning, setIssueWarning] = useState(true);
  const [customNotes, setCustomNotes] = useState("");

  if (!isOpen || !resource) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = `${purgeReason}${customNotes ? ` (${customNotes})` : ""}`;
    onConfirmPurge(resource.id, finalReason, issueWarning);
    addToast(`Purged "${resource.title}" and recorded in the 90-Day Audit Trail.`, "error");
    if (issueWarning) {
      addToast(`Formal warning dispatched to ${resource.uploaderName}'s dashboard.`, "warning");
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-lg rounded-3xl border border-rose-500/40 bg-white dark:bg-[#0F1A30] p-6 shadow-2xl space-y-4"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2.5 text-rose-500">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-500/15 border border-rose-500/30">
            <Trash2 size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
              Purge Document from Vault
            </h3>
            <p className="text-xs text-rose-500 font-medium line-clamp-1">
              {resource.title} ({resource.subjectCode})
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Policy Violation Reason *
            </label>
            <select
              value={purgeReason}
              onChange={(e) => setPurgeReason(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="Copyright Infringement / Proprietary Material">Copyright Infringement / Proprietary Commercial Textbook</option>
              <option value="Academic Dishonesty / Leaked Assessment">Academic Dishonesty / Leaked Unofficial Exam Solution</option>
              <option value="Malicious Archive / Suspicious Executable">Malicious Archive / Harmful Script Attachment</option>
              <option value="Incorrect / Low Quality Content">Incorrect / Unintelligible Content Dump</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Internal Audit Notes
            </label>
            <textarea
              rows={2}
              placeholder="Explain the deletion rationale for the audit record..."
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Issue Warning Toggle */}
          <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 cursor-pointer">
            <input
              type="checkbox"
              checked={issueWarning}
              onChange={(e) => setIssueWarning(e.target.checked)}
              className="mt-0.5"
            />
            <div>
              <h4 className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                <Bell size={13} />
                <span>Issue Formal Policy Warning to Uploader ({resource.uploaderName})</span>
              </h4>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5 leading-relaxed">
                Automatically increments the student's infraction count and notifies them that uploading copyrighted or leaked material is prohibited.
              </p>
            </div>
          </label>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/25 cursor-pointer"
            >
              <Trash2 size={14} />
              <span>Confirm Permanent Purge</span>
            </button>
          </div>

        </form>
      </motion.div>
    </div>
  );
}

export default PurgeResourceModal;
