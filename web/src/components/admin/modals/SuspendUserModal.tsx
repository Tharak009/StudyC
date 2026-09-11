import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  PauseCircle,
  X,
  AlertTriangle,
  Clock,
  Check
} from "lucide-react";
import type { ManagedUser } from "../tabs/UserManagementTab";
import { useToastStore } from "../../../store/toast.store";

interface SuspendUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: ManagedUser | null;
  onConfirmSuspend: (userId: string, duration: string, reason: string) => void;
}

export function SuspendUserModal({
  isOpen,
  onClose,
  user,
  onConfirmSuspend
}: SuspendUserModalProps) {
  const { addToast } = useToastStore();

  const [duration, setDuration] = useState("7 Days");
  const [reasonCategory, setReasonCategory] = useState("Harassment / Uncivil Chat");
  const [customNotes, setCustomNotes] = useState("");

  if (!isOpen || !user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = `${reasonCategory}${customNotes ? ` - ${customNotes}` : ""}`;
    onConfirmSuspend(user.id, duration, finalReason);
    addToast(`Suspended ${user.fullName} for ${duration}.`, "warning");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-lg rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0F1A30] p-6 shadow-2xl space-y-4"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500 border border-amber-500/30">
            <PauseCircle size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
              Temporary Student Account Suspension
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              Target: {user.fullName} ({user.rollNumber})
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Violation Reason Category *
            </label>
            <select
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="Harassment / Uncivil Chat">Harassment / Abusive Chat in Study Rooms</option>
              <option value="Academic Dishonesty">Academic Dishonesty / Leaked Assessment Dumps</option>
              <option value="Spam / Phishing Link">Spamming / Phishing URLs</option>
              <option value="Voice Stage Disruption">Trolling or Disrupting Voice Study Stages</option>
              <option value="Custom Violation">Other Campus Policy Violation</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Suspension Duration *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {["24 Hours", "7 Days", "30 Days", "Semester End"].map((dur) => (
                <button
                  key={dur}
                  type="button"
                  onClick={() => setDuration(dur)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                    duration === dur
                      ? "border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-sm"
                      : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#162544]"
                  }`}
                >
                  {dur}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Administrative Notes & Explanation
            </label>
            <textarea
              rows={2}
              placeholder="Provide context for why this suspension was enacted..."
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 leading-relaxed"
            />
          </div>

          {/* Warning Impact Callout */}
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>
              During this timeout, the student’s active WebSocket connection will disconnect immediately. They will be unable to send chat messages, join voice stages, or upload notes.
            </span>
          </div>

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
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/25 cursor-pointer"
            >
              <Check size={14} />
              <span>Enforce Suspension</span>
            </button>
          </div>

        </form>
      </motion.div>
    </div>
  );
}

export default SuspendUserModal;
