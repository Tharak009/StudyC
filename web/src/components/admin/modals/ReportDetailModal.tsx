import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  ShieldCheck,
  AlertTriangle,
  MessageSquare,
  Clock,
  Check,
  Trash2,
  Ban,
  Send,
  User,
  History,
  FileText,
  FileWarning
} from "lucide-react";
import type { ReportItem } from "../tabs/ReportsTriageTab";
import { useToastStore } from "../../../store/toast.store";

interface ReportDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ReportItem | null;
  onResolve: (reportId: string, actionTaken: string, notes: string) => void;
}

interface ContextMessage {
  id: string;
  senderName: string;
  senderRoll: string;
  timestamp: string;
  content: string;
  isFlagged?: boolean;
}

export function ReportDetailModal({
  isOpen,
  onClose,
  report,
  onResolve
}: ReportDetailModalProps) {
  const { addToast } = useToastStore();

  const [moderatorNotes, setModeratorNotes] = useState("");
  const [resolutionAction, setResolutionAction] = useState<"PURGE_AND_WARN" | "INSTANT_BAN" | "DISMISS">(
    "PURGE_AND_WARN"
  );
  const [notesHistory, setNotesHistory] = useState<string[]>([]);

  if (!isOpen || !report) return null;

  const surroundingChat: ContextMessage[] = [
    {
      id: "msg-ctx-loc",
      senderName: "Channel Activity",
      senderRoll: report.channelOrResource,
      timestamp: report.createdAt,
      content: `Active session recording in ${report.channelOrResource}`
    },
    {
      id: "msg-ctx-target",
      senderName: report.reportedName,
      senderRoll: report.reportedRoll,
      timestamp: report.createdAt,
      content: report.contextSnippet,
      isFlagged: true
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onResolve(report.id, resolutionAction, moderatorNotes);
    addToast(`Report #${report.id} resolved with ${resolutionAction}.`, "success");
    onClose();
  };

  const handleAddNote = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && moderatorNotes.trim()) {
      e.preventDefault();
      setNotesHistory([...notesHistory, `[Admin Note]: ${moderatorNotes.trim()}`]);
      setModeratorNotes("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-2xl rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0F1A30] p-6 shadow-2xl space-y-5"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-200/70 dark:border-slate-800/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="tabular-nums text-xs font-bold text-[#1E90FF] bg-[#1E90FF]/10 px-2 py-0.5 rounded-lg border border-[#1E90FF]/20">
                #{report.id}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-500 border border-rose-500/30">
                {report.severity} PRIORITY
              </span>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {report.category}
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              Channel: <strong className="text-slate-700 dark:text-slate-200">{report.channelOrResource}</strong> • Timestamp: {report.createdAt}
            </p>
          </div>
        </div>

        {/* ── Surrounding Context Stream (Fair Moderation Feed) ─────────── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <History size={14} className="text-[#1E90FF]" />
              <span>Surrounding Chat Context (±3 Messages for Fairness)</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              Audit Scoped Event
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#080D1A] border border-slate-200 dark:border-slate-800 max-h-60 overflow-y-auto space-y-2.5 scrollbar-none text-xs">
            {surroundingChat.map((msg) => (
              <div
                key={msg.id}
                className={`p-2.5 rounded-xl transition-all ${
                  msg.isFlagged
                    ? "border-2 border-rose-500/60 bg-rose-500/10 text-rose-300 shadow-md shadow-rose-500/10"
                    : "bg-white/40 dark:bg-[#0F1A30]/40 border border-slate-200/50 dark:border-slate-800/50 text-slate-700 dark:text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] opacity-75 mb-1">
                  <span className="font-bold">{msg.senderName} ({msg.senderRoll})</span>
                  <span className="tabular-nums">{msg.timestamp}</span>
                </div>
                <p className="text-xs leading-relaxed">{msg.content}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Student Privacy Guard Box ────────────────────────────────── */}
        <div className="p-3 rounded-2xl bg-[#1E90FF]/10 border border-[#1E90FF]/30 flex items-start gap-2.5 text-[11px] text-[#1E90FF] leading-relaxed">
          <ShieldCheck size={16} className="shrink-0 mt-0.5 text-[#1E90FF]" />
          <span>
            <strong>Student Privacy Guard Active:</strong> Surrounding context is strictly restricted to this public study room interaction. Non-flagged personal direct messages remain protected.
          </span>
        </div>

        {/* ── Resolution Form ─────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Triage Action Decision *
              </label>
              <select
                value={resolutionAction}
                onChange={(e) => setResolutionAction(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="PURGE_AND_WARN">Purge Flagged Content & Issue Formal Warning</option>
                <option value="INSTANT_BAN">Enforce 7-Day Suspension & Revoke Token</option>
                <option value="DISMISS">Dismiss Report (No Violation Found)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Internal Moderator Conclusion
              </label>
              <input
                type="text"
                placeholder="e.g. Unprovoked verbal harassment violation"
                value={moderatorNotes}
                onChange={(e) => setModeratorNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
              />
            </div>
          </div>

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
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-md shadow-[#1E90FF]/25 transition-all cursor-pointer"
            >
              <Check size={14} />
              <span>Submit Final Resolution</span>
            </button>
          </div>
        </form>

      </motion.div>
    </div>
  );
}

export default ReportDetailModal;
