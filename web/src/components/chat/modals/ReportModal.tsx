import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flag, X, AlertTriangle, ShieldCheck, Check, Loader2 } from "lucide-react";
import { reportsApi } from "../../../api/reports.api";
import { usersApi } from "../../../api/users.api";
import { fromStreamUserId } from "../../../utils/stream-id";
import { useToastStore } from "../../../store/toast.store";

export interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: "MESSAGE" | "USER" | "COMMUNITY";
  targetId: string;
  targetTitle?: string;
  snippet?: string;
}

const REPORT_REASONS = [
  "Spam or unsolicited advertising",
  "Harassment, threats, or abusive language",
  "Academic dishonesty or examination cheating",
  "Inappropriate or sexually explicit material",
  "Off-topic disruption in strict study space",
  "Impersonation or misinformation",
  "Other violation of Community Guidelines"
];

export function ReportModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetTitle,
  snippet
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>(REPORT_REASONS[0]);
  const [description, setDescription] = useState("");
  const [alsoBlockUser, setAlsoBlockUser] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToastStore();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId) {
      addToast("Invalid target to report", "error");
      return;
    }

    const cleanedTargetId =
      targetType === "USER"
        ? fromStreamUserId(targetId)
        : targetType === "COMMUNITY" && targetId.startsWith("comm_")
        ? targetId.slice("comm_".length).split("_")[0]
        : targetId;

    if (!cleanedTargetId) {
      addToast("Could not determine valid target ID to report", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await reportsApi.createReport({
        targetType,
        targetId: cleanedTargetId,
        reason: selectedReason,
        description: description.trim() || undefined
      });

      if (targetType === "USER" && alsoBlockUser) {
        try {
          await usersApi.blockUser(cleanedTargetId);
          addToast("Report submitted and user blocked.", "success");
        } catch {
          addToast("Report submitted to moderation queue.", "success");
        }
      } else {
        addToast("Report submitted to moderation queue. Thank you for keeping StudyConnect safe.", "success");
      }

      setDescription("");
      setAlsoBlockUser(false);
      onClose();
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message || err?.message || "Failed to submit report. Please try again.";
      addToast(errorMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const readableTarget =
    targetType === "MESSAGE"
      ? "Message"
      : targetType === "USER"
      ? "User"
      : "Community";

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 select-none animate-in fade-in duration-150"
        onClick={onClose}
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18 }}
          className="relative w-full max-w-md rounded-3xl bg-white dark:bg-[#0F1A30] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100"
        >

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0A1120]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-500">
                <Flag size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Report {readableTarget}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {targetTitle ? `Target: ${targetTitle}` : "Flag content for moderation review"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {snippet && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 italic line-clamp-3">
                "{snippet}"
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                Why are you reporting this {readableTarget.toLowerCase()}?
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                {REPORT_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setSelectedReason(reason)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs text-left transition-all cursor-pointer ${
                      selectedReason === reason
                        ? "bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-semibold"
                        : "bg-slate-50 dark:bg-[#152238] border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span>{reason}</span>
                    {selectedReason === reason && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Additional Details (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide any relevant context for the moderation team..."
                rows={3}
                maxLength={1000}
                className="w-full text-xs py-2 px-3 rounded-xl bg-slate-50 dark:bg-[#152238] border border-slate-300 dark:border-slate-700 focus:border-rose-500 focus:outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>

            {targetType === "USER" && (
              <label className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-[#121B2D] border border-slate-200/80 dark:border-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors">
                <input
                  type="checkbox"
                  checked={alsoBlockUser}
                  onChange={(e) => setAlsoBlockUser(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-[#1E90FF] focus:ring-sky-500 cursor-pointer"
                />
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">
                    Also block this user
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Prevent this user from sending you direct messages or seeing your active presence.
                  </p>
                </div>
              </label>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white text-xs font-bold shadow-md shadow-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Flag size={14} />
                    <span>Submit Report</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
