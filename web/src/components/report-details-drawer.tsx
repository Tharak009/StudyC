import { useState, useRef, useEffect } from "react";
import {
  X,
  User,
  Calendar,
  ShieldAlert,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  AlertTriangle,
  Ban,
  ArrowRight,
  Plus,
  Send,
  CornerDownRight,
  BookOpen,
  Image as ImageIcon
} from "lucide-react";
import type { ModeratedReport, ReportPriority, ReportStatus } from "../types/report";

interface ReportDetailsDrawerProps {
  report: ModeratedReport | null;
  onClose: () => void;
  onUpdatePriority: (id: string, priority: ReportPriority) => void;
  onStartInvestigation: (id: string) => void;
  onResolveReport: (id: string, notes: string, comments: string) => void;
  onRejectReport: (id: string) => void;
  onAddNote: (id: string, content: string) => void;
  onWarnUser: (userId: string, userName: string) => void;
  onSuspendUser: (userId: string, userName: string) => void;
}

export function ReportDetailsDrawer({
  report,
  onClose,
  onUpdatePriority,
  onStartInvestigation,
  onResolveReport,
  onRejectReport,
  onAddNote,
  onWarnUser,
  onSuspendUser
}: ReportDetailsDrawerProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "resolution">("overview");
  const [noteText, setNoteText] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [moderatorComments, setModeratorComments] = useState("");
  const drawerRef = useRef<HTMLDivElement>(null);

  // Sync resolution states when report changes
  useEffect(() => {
    if (report) {
      setResolutionNotes(report.resolutionNotes || "");
      setModeratorComments(report.moderatorComments || "");
    }
  }, [report]);

  // Click outside to close drawer
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node) && report) {
        const isClickOnPortalOrDropdown = (event.target as Element).closest(".origin-top-right") || (event.target as Element).closest(".Toastify");
        if (!isClickOnPortalOrDropdown) {
          onClose();
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [report, onClose]);

  if (!report) return null;

  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    onAddNote(report._id, noteText.trim());
    setNoteText("");
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "CRITICAL":
        return "text-rose-600 bg-rose-50 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400";
      case "HIGH":
        return "text-orange-600 bg-orange-50 border-orange-100 dark:bg-orange-500/10 dark:text-orange-400";
      case "MEDIUM":
        return "text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400";
      case "LOW":
        return "text-slate-500 bg-slate-50 border-slate-100 dark:bg-white/5 dark:text-slate-400";
      default:
        return "text-slate-500 bg-slate-50";
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[2px]" />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-white/5 dark:bg-ink-900 transition-all duration-300 animate-slide-in"
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6 dark:border-white/5">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider">
              Report Details #{report._id.slice(-6).toUpperCase()}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg border border-slate-200 dark:border-white/5 text-slate-500 hover:text-slate-950 dark:hover:text-white cursor-pointer hover:bg-slate-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-100 dark:border-white/5 px-6 bg-slate-50/50 dark:bg-white/[0.01]">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-1.5 border-b-2 py-3 text-xs font-semibold px-2 cursor-pointer transition-all ${
              activeTab === "overview"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-650"
            }`}
          >
            <FileText size={14} />
            Overview & Context
          </button>
          <button
            onClick={() => setActiveTab("timeline")}
            className={`flex items-center gap-1.5 border-b-2 py-3 text-xs font-semibold px-2 cursor-pointer transition-all ${
              activeTab === "timeline"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-650"
            }`}
          >
            <Clock size={14} />
            Timeline & Notes
          </button>
          <button
            onClick={() => setActiveTab("resolution")}
            className={`flex items-center gap-1.5 border-b-2 py-3 text-xs font-semibold px-2 cursor-pointer transition-all ${
              activeTab === "resolution"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-650"
            }`}
          >
            <CheckCircle size={14} />
            Resolution Panel
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {activeTab === "overview" && (
            <>
              {/* Type, Priority, Status */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl border border-slate-150 p-2.5 dark:border-white/5 dark:bg-white/[0.01]">
                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Report Type</span>
                  <span className="inline-block mt-1 rounded bg-indigo-50 px-2 py-0.5 text-[9px] font-bold uppercase text-indigo-650 dark:bg-indigo-500/10 dark:text-indigo-400">
                    {report.reportType}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-150 p-2.5 dark:border-white/5 dark:bg-white/[0.01]">
                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Priority</span>
                  <select
                    value={report.priority}
                    onChange={(e) => onUpdatePriority(report._id, e.target.value as ReportPriority)}
                    className="mt-1 block w-full rounded-md border-0 bg-transparent text-[10px] font-bold uppercase text-center focus:ring-0 cursor-pointer"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div className="rounded-xl border border-slate-150 p-2.5 dark:border-white/5 dark:bg-white/[0.01]">
                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Status</span>
                  <span className={`inline-block mt-1 rounded bg-slate-50 border px-2 py-0.5 text-[9px] font-bold uppercase ${
                    report.status === "PENDING"
                      ? "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-none"
                      : report.status === "UNDER_INVESTIGATION"
                      ? "bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-none"
                      : report.status === "RESOLVED"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-450 dark:border-none"
                      : "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-450 dark:border-none"
                  }`}>
                    {report.status.replace("_", " ")}
                  </span>
                </div>
              </div>

              {/* Profiles columns */}
              <div className="grid grid-cols-2 gap-4">
                {/* Reporter Profile */}
                <div className="rounded-2xl border border-slate-150 p-4 dark:border-white/5 dark:bg-white/[0.01]">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Reporter Details</h4>
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-650 dark:bg-indigo-500/10 dark:text-indigo-400">
                      {report.reporter.fullName[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <span className="block text-xs font-bold text-slate-800 dark:text-white truncate">
                        {report.reporter.fullName}
                      </span>
                      <span className="block text-[9px] text-slate-400 dark:text-slate-500 truncate">
                        {report.reporter.department}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reported User Profile */}
                <div className="rounded-2xl border border-slate-150 p-4 dark:border-white/5 dark:bg-white/[0.01]">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Reported User</h4>
                  {report.reportedUser ? (
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-rose-50 text-xs font-bold text-rose-650 dark:bg-rose-500/10 dark:text-rose-400">
                        {report.reportedUser.fullName[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-slate-800 dark:text-white truncate">
                          {report.reportedUser.fullName}
                        </span>
                        <span className="block text-[9px] text-slate-400 dark:text-slate-500 truncate">
                          Dept: {report.reportedUser.department}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic text-[11px] block mt-1">Non-User Report Target</span>
                  )}
                </div>
              </div>

              {/* Report Reason & Description */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Report Description</h4>
                <div className="rounded-2xl border border-slate-150 p-4 bg-slate-50/20 dark:border-white/5 dark:bg-white/[0.01] text-xs">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-slate-800 dark:text-white">Reason:</span>
                    <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                      {report.reason}
                    </span>
                  </div>
                  <p className="text-slate-650 dark:text-slate-350 leading-relaxed whitespace-pre-line mt-2">
                    {report.description || "No description provided."}
                  </p>
                </div>
              </div>

              {/* Linked Content Preview */}
              {report.linkedContent && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Linked Content</h4>
                  <div className="rounded-2xl border border-slate-150 p-4 bg-slate-50/40 dark:border-white/5 dark:bg-white/[0.01] text-xs space-y-2">
                    {report.linkedContent.title && (
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                        {report.linkedContent.title}
                      </h4>
                    )}
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line bg-white p-3 border border-slate-100 rounded-xl dark:bg-ink-950 dark:border-none">
                      {report.linkedContent.body}
                    </p>
                    {/* Attachments */}
                    {report.linkedContent.attachments && report.linkedContent.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <span className="text-[9px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block">Evidence Files</span>
                        {report.linkedContent.attachments.map((attach, idx) => (
                          <div key={idx} className="flex items-center gap-2 rounded-lg bg-slate-100/60 p-2 dark:bg-black/10 text-[11px] font-semibold text-indigo-650 dark:text-indigo-400 border border-slate-150/30 dark:border-none">
                            <BookOpen size={12} />
                            <span className="truncate flex-1">{attach.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "timeline" && (
            <div className="space-y-6">
              {/* Timeline list */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Report Timeline</h4>
                <div className="relative pl-4 border-l border-slate-200 dark:border-white/5 space-y-6 text-xs">
                  {report.timeline.map((event, idx) => (
                    <div key={idx} className="relative">
                      <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full border-2 border-indigo-600 bg-white dark:bg-ink-950 shrink-0" />
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {event.label}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            {new Date(event.date).toLocaleDateString()} at {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {event.moderator && (
                          <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                            Moderator:{" "}
                            {typeof event.moderator === "object" && event.moderator !== null
                              ? (event.moderator as any).fullName || (event.moderator as any).name || "Moderator"
                              : event.moderator}
                          </span>
                        )}
                        {event.details && (
                          <p className="mt-1 text-slate-500 dark:text-slate-400 leading-relaxed">
                            {event.details}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Internal Notes */}
              <div className="space-y-4 border-t border-slate-100 dark:border-white/5 pt-5">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Internal Admin Notes</h4>
                {report.internalNotes.length === 0 ? (
                  <p className="text-xs text-slate-450 dark:text-slate-500 italic py-2">
                    No notes have been logged yet.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {report.internalNotes.map((note) => (
                      <div key={note.id} className="rounded-xl border border-slate-150 p-3 bg-slate-50/30 dark:border-white/5 dark:bg-white/[0.01] text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-indigo-650 dark:text-indigo-400">
                            {typeof note.author === "object" && note.author !== null
                              ? (note.author as any).fullName || (note.author as any).name || "Admin"
                              : note.author}
                          </span>
                          <span className="text-[9px] text-slate-400">{new Date(note.date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-350 leading-relaxed">{note.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Note Form */}
                <form onSubmit={handleAddNoteSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Type internal note here..."
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={!noteText.trim()}
                    className="flex size-9 items-center justify-center rounded-xl bg-indigo-600 text-white hover:opacity-95 shadow cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === "resolution" && (
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resolution Outcome</h4>
              <div className="rounded-2xl border border-slate-150 p-5 dark:border-white/5 dark:bg-white/[0.01] space-y-4">
                {/* Status Selection Description */}
                <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">
                  Record resolution outcomes, details of actions taken (e.g. content hidden, warnings sent), and notes for audit logs.
                </p>

                {/* Resolution Notes Input */}
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Resolution Notes
                  </label>
                  <textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Describe what was investigated and the final outcome of the report..."
                    className="w-full h-24 rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 dark:border-white/5 dark:bg-white/[0.02] dark:text-white resize-none outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Moderator Comments */}
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Internal Moderator Comments
                  </label>
                  <input
                    type="text"
                    value={moderatorComments}
                    onChange={(e) => setModeratorComments(e.target.value)}
                    placeholder="e.g. Warned student via email, hidden post CSE study group."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-white"
                  />
                </div>

                {/* Resolve Action Buttons */}
                {report.status !== "RESOLVED" && (
                  <div className="pt-2 flex gap-2">
                    <button
                      onClick={() => onResolveReport(report._id, resolutionNotes, moderatorComments)}
                      disabled={!resolutionNotes.trim()}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:opacity-95 px-4 py-2.5 text-xs font-bold text-white shadow cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle size={14} />
                      Resolve Report
                    </button>
                    <button
                      onClick={() => onRejectReport(report._id)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.02] text-rose-600 dark:text-rose-450 hover:bg-rose-50 px-4 py-2.5 text-xs font-bold shadow cursor-pointer"
                    >
                      <XCircle size={14} />
                      Reject Report
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Panel Footer */}
        <div className="border-t border-slate-200 bg-slate-50/50 p-4 dark:border-white/5 dark:bg-ink-950 flex flex-wrap gap-2 items-center justify-between">
          <div className="flex gap-2">
            {report.status === "PENDING" && (
              <button
                onClick={() => onStartInvestigation(report._id)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-650 hover:opacity-95 px-3 py-2 text-xs font-bold text-white shadow-sm cursor-pointer"
              >
                <Clock size={13} />
                Investigate
              </button>
            )}
            {report.reportedUser && (
              <>
                <button
                  onClick={() => onWarnUser(report.reportedUser!._id, report.reportedUser!.fullName)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.02] text-slate-700 dark:text-slate-350 hover:bg-slate-50 px-3 py-2 text-xs font-bold shadow cursor-pointer"
                >
                  <AlertTriangle size={13} className="text-amber-500" />
                  Warn User
                </button>
                <button
                  onClick={() => onSuspendUser(report.reportedUser!._id, report.reportedUser!.fullName)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.02] text-rose-600 dark:text-rose-455 hover:bg-rose-50 px-3 py-2 text-xs font-bold shadow cursor-pointer"
                >
                  <Ban size={13} />
                  Suspend Target
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
