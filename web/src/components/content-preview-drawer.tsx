import { useState, useRef, useEffect } from "react";
import {
  X,
  User,
  Calendar,
  MessageSquare,
  ShieldAlert,
  History,
  FileText,
  Download,
  CheckCircle,
  EyeOff,
  Trash2,
  AlertTriangle,
  Ban,
  Tag,
  BookOpen,
  Image as ImageIcon
} from "lucide-react";
import type { ModeratedContent } from "../types/moderation";

interface ContentPreviewDrawerProps {
  item: ModeratedContent | null;
  onClose: () => void;
  onApprove: (id: string) => void;
  onHide: (id: string) => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
  onWarnUser: (userId: string, userName: string) => void;
  onSuspendUser: (userId: string, userName: string) => void;
}

export function ContentPreviewDrawer({
  item,
  onClose,
  onApprove,
  onHide,
  onRestore,
  onDelete,
  onWarnUser,
  onSuspendUser
}: ContentPreviewDrawerProps) {
  const [activeTab, setActiveTab] = useState<"content" | "reports" | "history">("content");
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close drawer on clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        drawerRef.current &&
        !drawerRef.current.contains(event.target as Node) &&
        item
      ) {
        // Prevent click events on action menus or dropdowns from closing the drawer
        const isClickOnPortalOrDropdown = (event.target as Element).closest(".origin-top-right") || (event.target as Element).closest(".Toastify");
        if (!isClickOnPortalOrDropdown) {
          onClose();
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [item, onClose]);

  if (!item) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[2px] transition-opacity duration-300" />

      {/* Drawer Container */}
      <div
        ref={drawerRef}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-white/5 dark:bg-ink-900 transition-all duration-300 animate-slide-in"
      >
        {/* Drawer Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6 dark:border-white/5">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider">
              Inspect Content
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg border border-slate-200 dark:border-white/5 text-slate-500 hover:text-slate-950 dark:hover:text-white cursor-pointer hover:bg-slate-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-slate-100 dark:border-white/5 px-6 bg-slate-50/50 dark:bg-white/[0.01]">
          <button
            onClick={() => setActiveTab("content")}
            className={`flex items-center gap-1.5 border-b-2 py-3 text-xs font-semibold px-2 cursor-pointer transition-all ${
              activeTab === "content"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-650"
            }`}
          >
            <FileText size={14} />
            Content Details
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`flex items-center gap-1.5 border-b-2 py-3 text-xs font-semibold px-2 cursor-pointer transition-all ${
              activeTab === "reports"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-650"
            }`}
          >
            <ShieldAlert size={14} />
            User Reports ({item.reportsCount})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-1.5 border-b-2 py-3 text-xs font-semibold px-2 cursor-pointer transition-all ${
              activeTab === "history"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-650"
            }`}
          >
            <History size={14} />
            Moderation History ({item.moderationHistory.length})
          </button>
        </div>

        {/* Scrollable Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {activeTab === "content" && (
            <>
              {/* Author Overview */}
              <div className="rounded-2xl border border-slate-150 p-4 dark:border-white/5 dark:bg-white/[0.01] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 text-sm font-bold text-white shadow">
                    {item.author.fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      {item.author.fullName}
                    </h4>
                    <span className="block text-[11px] text-slate-400 dark:text-slate-500">
                      {item.author.department} • {item.author.email}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Author Status
                  </span>
                  <span className={`inline-block mt-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded-lg border ${
                    item.author.status === "ACTIVE"
                      ? "bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-450 dark:border-none"
                      : item.author.status === "SUSPENDED"
                      ? "bg-rose-50 border-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-450 dark:border-none"
                      : "bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-450 dark:border-none"
                  }`}>
                    {item.author.status}
                  </span>
                </div>
              </div>

              {/* Metadata Details */}
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-650 dark:text-slate-350">
                <div className="flex items-center gap-2 rounded-xl bg-slate-50/70 p-3 border border-slate-100 dark:border-none dark:bg-white/[0.01]">
                  <Tag size={14} className="text-slate-400 shrink-0" />
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Community
                    </span>
                    <span className="text-slate-800 dark:text-white font-semibold mt-0.5 block">
                      {item.community.name}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-slate-50/70 p-3 border border-slate-100 dark:border-none dark:bg-white/[0.01]">
                  <Calendar size={14} className="text-slate-400 shrink-0" />
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Created On
                    </span>
                    <span className="text-slate-800 dark:text-white font-semibold mt-0.5 block">
                      {new Date(item.createdAt).toLocaleDateString()} at {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content Body Display */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Content Body
                </h4>
                <div className="rounded-2xl border border-slate-150 p-5 bg-slate-50/30 dark:border-white/5 dark:bg-white/[0.01] leading-relaxed text-sm text-slate-800 dark:text-slate-200">
                  {item.title && (
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3 tracking-tight">
                      {item.title}
                    </h3>
                  )}
                  <p className="whitespace-pre-line">{item.content}</p>

                  {/* Attachment Files */}
                  {item.attachments && item.attachments.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-150 dark:border-white/5 space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                        Attachments
                      </span>
                      {item.attachments.map((attach, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-xl bg-slate-100/50 border border-slate-200/40 p-3 dark:bg-black/20 dark:border-white/5"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {attach.type === "image" ? (
                              <ImageIcon size={16} className="text-indigo-600" />
                            ) : (
                              <BookOpen size={16} className="text-indigo-600" />
                            )}
                            <div className="min-w-0">
                              <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                                {attach.name}
                              </span>
                              {attach.size && (
                                <span className="block text-[10px] text-slate-400 dark:text-slate-500">
                                  {attach.size}
                                </span>
                              )}
                            </div>
                          </div>
                          <button className="flex size-7 items-center justify-center rounded-lg border border-slate-200 dark:border-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 cursor-pointer">
                            <Download size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === "reports" && (
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Active User Flags
              </h4>
              {item.reports.length === 0 ? (
                <div className="text-center py-6 text-slate-450 dark:text-slate-500 text-xs">
                  This item has not been flagged.
                </div>
              ) : (
                <div className="space-y-3">
                  {item.reports.map((report) => (
                    <div
                      key={report.id}
                      className="rounded-2xl border border-slate-150 p-4 dark:border-white/5 dark:bg-white/[0.01] bg-slate-50/20"
                    >
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-semibold text-indigo-650 dark:text-indigo-400">
                          {report.reporter}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {new Date(report.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span className="shrink-0 text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 h-fit">
                          {report.reason}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Moderation Action Logs
              </h4>
              {item.moderationHistory.length === 0 ? (
                <div className="text-center py-8 text-slate-450 dark:text-slate-500 text-xs">
                  No moderation actions have been logged for this item yet.
                </div>
              ) : (
                <div className="relative pl-4 border-l border-slate-200 dark:border-white/5 space-y-6">
                  {item.moderationHistory.map((log, idx) => (
                    <div key={idx} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full border-2 border-indigo-600 bg-white dark:bg-ink-950 shrink-0" />
                      <div className="text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white">
                            Action: {log.actionTaken}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          Moderator: {log.moderator}
                        </span>
                        <p className="mt-1.5 text-slate-600 dark:text-slate-400 leading-relaxed rounded-xl bg-slate-50 dark:bg-white/[0.01] p-3 border border-slate-100 dark:border-none">
                          <span className="font-semibold text-slate-500 dark:text-slate-450">Reason:</span> {log.reason}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Actions Bar Footer */}
        <div className="border-t border-slate-200 bg-slate-50/50 p-4 dark:border-white/5 dark:bg-ink-950 flex flex-wrap gap-2.5 items-center justify-between">
          <div className="flex gap-2">
            {item.moderationStatus !== "APPROVED" && (
              <button
                onClick={() => onApprove(item._id)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:opacity-95 px-3 py-2 text-xs font-bold text-white shadow-sm cursor-pointer"
              >
                <CheckCircle size={14} />
                Approve
              </button>
            )}

            {item.visibilityStatus === "VISIBLE" ? (
              <button
                onClick={() => onHide(item._id)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:opacity-95 px-3 py-2 text-xs font-bold text-white shadow-sm cursor-pointer"
              >
                <EyeOff size={14} />
                Hide Content
              </button>
            ) : (
              <button
                onClick={() => onRestore(item._id)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:opacity-95 px-3 py-2 text-xs font-bold text-white shadow-sm cursor-pointer"
              >
                <CheckCircle size={14} />
                Restore Content
              </button>
            )}

            <button
              onClick={() => onDelete(item._id)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:opacity-95 px-3 py-2 text-xs font-bold text-white shadow-sm cursor-pointer"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onWarnUser(item.author._id, item.author.fullName)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.02] text-slate-700 dark:text-slate-350 hover:bg-slate-50 px-3 py-2 text-xs font-bold shadow-sm cursor-pointer"
            >
              <AlertTriangle size={14} className="text-amber-500" />
              Warn Author
            </button>
            <button
              onClick={() => onSuspendUser(item.author._id, item.author.fullName)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.02] text-rose-600 dark:text-rose-450 hover:bg-rose-50 px-3 py-2 text-xs font-bold shadow-sm cursor-pointer"
            >
              <Ban size={14} />
              Suspend
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
