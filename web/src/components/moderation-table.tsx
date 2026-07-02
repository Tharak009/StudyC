import { useState, useRef, useEffect } from "react";
import {
  MoreVertical,
  Eye,
  Trash2,
  EyeOff,
  CornerDownRight,
  Pin,
  Lock,
  Unlock,
  AlertTriangle,
  Ban,
  User,
  Image as ImageIcon,
  FileText,
  MessageSquare,
  FileCode,
  ShieldAlert
} from "lucide-react";
import type { ModeratedContent } from "../types/moderation";

interface ModerationTableProps {
  items: ModeratedContent[];
  onView: (item: ModeratedContent) => void;
  onHide: (id: string) => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onToggleLock: (id: string) => void;
  onWarnUser: (userId: string, userName: string) => void;
  onSuspendUser: (userId: string, userName: string) => void;
  onViewProfile: (userId: string) => void;
}

export function ModerationTable({
  items,
  onView,
  onHide,
  onRestore,
  onDelete,
  onTogglePin,
  onToggleLock,
  onWarnUser,
  onSuspendUser,
  onViewProfile
}: ModerationTableProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case "POST":
        return <FileText size={14} className="text-blue-500" />;
      case "COMMENT":
        return <MessageSquare size={14} className="text-violet-500" />;
      case "IMAGE":
        return <ImageIcon size={14} className="text-emerald-500" />;
      case "FILE":
        return <FileCode size={14} className="text-amber-500" />;
      default:
        return <FileText size={14} />;
    }
  };

  const getVisibilityBadgeStyles = (status: string) => {
    switch (status) {
      case "VISIBLE":
        return "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-450 dark:border-none";
      case "HIDDEN":
        return "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-450 dark:border-none";
      case "DELETED":
        return "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-450 dark:border-none";
      default:
        return "bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-500/10 dark:text-slate-400";
    }
  };

  const getModerationBadgeStyles = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-450 dark:border-none";
      case "PENDING":
        return "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-450 dark:border-none";
      case "REJECTED":
        return "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-450 dark:border-none";
      default:
        return "bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-500/10 dark:text-slate-400";
    }
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-white/5 dark:bg-ink-900 shadow-sm">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/70 font-semibold tracking-wider text-slate-400 dark:border-white/5 dark:bg-white/[0.01] dark:text-slate-500 uppercase">
            <th className="px-6 py-4">Content Preview</th>
            <th className="px-6 py-4">Type</th>
            <th className="px-6 py-4">Author</th>
            <th className="px-6 py-4">Community</th>
            <th className="px-6 py-4">Created Date</th>
            <th className="px-6 py-4">Reports</th>
            <th className="px-6 py-4">Visibility</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {items.map((item) => {
            return (
              <tr
                key={item._id}
                className="hover:bg-slate-50/30 dark:hover:bg-white/[0.01] transition-colors"
              >
                {/* Content Preview */}
                <td className="px-6 py-4 max-w-[280px]">
                  <div className="flex flex-col gap-1">
                    {item.title && (
                      <span className="font-semibold text-slate-900 dark:text-white truncate">
                        {item.title}
                        {item.pinned && (
                          <span className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-indigo-50 px-1 py-0.2 text-[8px] font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                            <Pin size={8} /> Pinned
                          </span>
                        )}
                        {item.commentsLocked && (
                          <span className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-amber-50 px-1 py-0.2 text-[8px] font-bold text-amber-600 dark:bg-amber-500/10 dark:text-amber-450">
                            <Lock size={8} /> Locked
                          </span>
                        )}
                      </span>
                    )}
                    <span className="text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {item.contentType === "COMMENT" && (
                        <CornerDownRight size={10} className="inline mr-1 text-slate-400 align-middle" />
                      )}
                      {item.content}
                    </span>
                    {item.attachments && item.attachments.length > 0 && (
                      <div className="mt-1 flex items-center gap-1.5 text-[9px] font-semibold text-indigo-650 dark:text-indigo-400">
                        {item.attachments[0].type === "image" ? <ImageIcon size={10} /> : <FileText size={10} />}
                        <span className="truncate max-w-[150px]">{item.attachments[0].name}</span>
                        {item.attachments.length > 1 && <span>+{item.attachments.length - 1} more</span>}
                      </div>
                    )}
                  </div>
                </td>

                {/* Type */}
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] px-2 py-0.5 font-semibold text-[9px] uppercase tracking-wider text-slate-650 dark:text-slate-350">
                    {getContentTypeIcon(item.contentType)}
                    {item.contentType}
                  </span>
                </td>

                {/* Author */}
                <td className="px-6 py-4">
                  <div className="min-w-0">
                    <span className="block font-semibold text-slate-750 dark:text-slate-300 truncate">
                      {item.author.fullName}
                    </span>
                    <span className="block text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      {item.author.department}
                    </span>
                    {item.author.status !== "ACTIVE" && (
                      <span className={`inline-block mt-1 text-[8px] font-bold uppercase px-1 rounded ${
                        item.author.status === "SUSPENDED" 
                          ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-450" 
                          : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-450"
                      }`}>
                        {item.author.status}
                      </span>
                    )}
                  </div>
                </td>

                {/* Community */}
                <td className="px-6 py-4 text-slate-600 dark:text-slate-350 font-medium">
                  {item.community.name}
                </td>

                {/* Created Date */}
                <td className="px-6 py-4 text-slate-500 dark:text-slate-450 font-medium">
                  {new Date(item.createdAt).toLocaleDateString()}
                </td>

                {/* Reports */}
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-[10px] font-bold ${
                    item.reportsCount >= 4
                      ? "bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-none"
                      : item.reportsCount >= 2
                      ? "bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-none"
                      : "bg-slate-50 text-slate-500 border border-slate-100 dark:bg-white/[0.02] dark:text-slate-400 dark:border-none"
                  }`}>
                    {item.reportsCount >= 2 && <ShieldAlert size={10} className="shrink-0 animate-pulse" />}
                    {item.reportsCount} {item.reportsCount === 1 ? "report" : "reports"}
                  </span>
                </td>

                {/* Visibility */}
                <td className="px-6 py-4">
                  <span className={`rounded-lg border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getVisibilityBadgeStyles(item.visibilityStatus)}`}>
                    {item.visibilityStatus}
                  </span>
                </td>

                {/* Moderation Status */}
                <td className="px-6 py-4">
                  <span className={`rounded-lg border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getModerationBadgeStyles(item.moderationStatus)}`}>
                    {item.moderationStatus}
                  </span>
                </td>

                {/* Actions Dropdown */}
                <td className="px-6 py-4 text-right relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdown(activeDropdown === item._id ? null : item._id);
                    }}
                    className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-150 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer hover:bg-slate-50 hover:shadow-sm"
                  >
                    <MoreVertical size={14} />
                  </button>

                  {activeDropdown === item._id && (
                    <div
                      ref={dropdownRef}
                      className="absolute right-6 mt-1.5 z-20 w-48 origin-top-right rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-lg dark:border-white/5 dark:bg-ink-950 text-left animate-fade-up"
                    >
                      <button
                        onClick={() => {
                          onView(item);
                          setActiveDropdown(null);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                      >
                        <Eye size={13} />
                        View content
                      </button>

                      {item.visibilityStatus === "VISIBLE" ? (
                        <button
                          onClick={() => {
                            onHide(item._id);
                            setActiveDropdown(null);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-amber-600 dark:text-amber-450 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors cursor-pointer font-medium"
                        >
                          <EyeOff size={13} />
                          Hide content
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            onRestore(item._id);
                            setActiveDropdown(null);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-emerald-600 dark:text-emerald-450 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors cursor-pointer font-medium"
                        >
                          <Eye size={13} />
                          Restore content
                        </button>
                      )}

                      <button
                        onClick={() => {
                          onDelete(item._id);
                          setActiveDropdown(null);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-rose-600 dark:text-rose-450 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer font-medium"
                      >
                        <Trash2 size={13} />
                        Delete content
                      </button>

                      {item.contentType === "POST" && (
                        <>
                          <div className="my-1 border-t border-slate-100 dark:border-white/5" />
                          <button
                            onClick={() => {
                              onTogglePin(item._id);
                              setActiveDropdown(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                          >
                            <Pin size={13} />
                            {item.pinned ? "Unpin post" : "Pin post"}
                          </button>
                          <button
                            onClick={() => {
                              onToggleLock(item._id);
                              setActiveDropdown(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                          >
                            {item.commentsLocked ? <Unlock size={13} /> : <Lock size={13} />}
                            {item.commentsLocked ? "Unlock comments" : "Lock comments"}
                          </button>
                        </>
                      )}

                      <div className="my-1 border-t border-slate-100 dark:border-white/5" />

                      <button
                        onClick={() => {
                          onWarnUser(item.author._id, item.author.fullName);
                          setActiveDropdown(null);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                      >
                        <AlertTriangle size={13} className="text-amber-500" />
                        Warn author
                      </button>

                      <button
                        onClick={() => {
                          onSuspendUser(item.author._id, item.author.fullName);
                          setActiveDropdown(null);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-rose-600 dark:text-rose-450 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                      >
                        <Ban size={13} />
                        Suspend author
                      </button>

                      <button
                        onClick={() => {
                          onViewProfile(item.author._id);
                          setActiveDropdown(null);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors cursor-pointer"
                      >
                        <User size={13} />
                        View author profile
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
