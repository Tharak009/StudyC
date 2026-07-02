import { useState, useRef, useEffect } from "react";
import {
  MoreVertical,
  Eye,
  Edit3,
  Archive,
  ArrowUpCircle,
  Copy,
  Trash2,
  Lock,
  Unlock,
  Megaphone,
  Users,
  Calendar,
  Layers,
  Activity,
  AlertTriangle
} from "lucide-react";
import type { Announcement } from "../types/announcement";

interface AnnouncementsTableProps {
  announcements: Announcement[];
  onView: (ann: Announcement) => void;
  onEdit: (ann: Announcement) => void;
  onPublishImmediately: (id: string) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export function AnnouncementsTable({
  announcements,
  onView,
  onEdit,
  onPublishImmediately,
  onArchive,
  onUnarchive,
  onDuplicate,
  onDelete
}: AnnouncementsTableProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-450 dark:border-none";
      case "DRAFT":
        return "bg-slate-50 text-slate-600 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-none";
      case "SCHEDULED":
        return "bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-none";
      case "ARCHIVED":
        return "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-450 dark:border-none";
      case "EXPIRED":
        return "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-450 dark:border-none";
      default:
        return "bg-slate-50 text-slate-650 border-slate-150";
    }
  };

  const getPriorityBadgeStyles = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
        return "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-none";
      case "HIGH":
        return "bg-orange-100 text-orange-850 border-orange-200 dark:bg-orange-500/20 dark:text-orange-400 dark:border-none";
      case "NORMAL":
        return "bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-none";
      case "LOW":
        return "bg-slate-50 text-slate-600 border-slate-150 dark:bg-white/5 dark:text-slate-450 dark:border-none";
      default:
        return "bg-slate-50 text-slate-600 border-slate-150";
    }
  };

  const getCategoryBadgeStyles = (cat: string) => {
    switch (cat) {
      case "EMERGENCY":
        return "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400";
      case "PLACEMENT":
        return "bg-amber-50 text-amber-750 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400";
      case "ACADEMIC":
        return "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400";
      case "EVENTS":
        return "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400";
      case "CLUBS":
        return "bg-violet-50 text-violet-750 border-violet-100 dark:bg-violet-500/10 dark:text-violet-400";
      default:
        return "bg-slate-50 text-slate-650 border-slate-100 dark:bg-white/5 dark:text-slate-400";
    }
  };

  const getAudienceLabel = (ann: Announcement) => {
    switch (ann.targetAudience) {
      case "ENTIRE_COLLEGE":
        return "Entire College";
      case "DEPARTMENT":
        return `Dept: ${ann.targetDepartment}`;
      case "ACADEMIC_YEAR":
        return `Year ${ann.targetAcademicYear}`;
      case "COMMUNITY":
        return `Community: ${ann.targetCommunityName}`;
      default:
        return "Unspecified";
    }
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-white/5 dark:bg-ink-900 shadow-sm">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/70 font-semibold tracking-wider text-slate-400 dark:border-white/5 dark:bg-white/[0.01] dark:text-slate-500 uppercase">
            <th className="px-6 py-4">Title</th>
            <th className="px-6 py-4">Category</th>
            <th className="px-6 py-4">Target Audience</th>
            <th className="px-6 py-4">Created By</th>
            <th className="px-6 py-4">Publish Window</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Priority</th>
            <th className="px-6 py-4">Views</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {announcements.map((ann) => {
            return (
              <tr
                key={ann._id}
                className="hover:bg-slate-50/30 dark:hover:bg-white/[0.01] transition-colors"
              >
                {/* Title */}
                <td className="px-6 py-4 max-w-[220px]">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-slate-900 dark:text-white truncate" title={ann.title}>
                      {ann.title}
                    </span>
                    {ann.attachments && ann.attachments.length > 0 && (
                      <span className="text-[9px] font-bold text-indigo-650 dark:text-indigo-400">
                        📎 {ann.attachments.length} attachment{ann.attachments.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </td>

                {/* Category */}
                <td className="px-6 py-4">
                  <span className={`inline-block rounded px-2 py-0.5 text-[9px] font-bold border uppercase tracking-wider ${getCategoryBadgeStyles(ann.category)}`}>
                    {ann.category}
                  </span>
                </td>

                {/* Target Audience */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-750 dark:text-slate-350">
                    <Users size={12} className="text-slate-400 shrink-0" />
                    <span className="truncate max-w-[150px]" title={getAudienceLabel(ann)}>
                      {getAudienceLabel(ann)}
                    </span>
                  </div>
                </td>

                {/* Created By */}
                <td className="px-6 py-4 text-slate-550 dark:text-slate-400 font-semibold truncate max-w-[110px]">
                  {ann.createdBy}
                </td>

                {/* Publish Window */}
                <td className="px-6 py-4 text-slate-500 dark:text-slate-450 font-medium">
                  <div className="space-y-0.5">
                    <span>Pub: {new Date(ann.publishDate).toLocaleDateString()}</span>
                    {ann.expiryDate && (
                      <span className="block text-[10px] text-slate-400">
                        Exp: {new Date(ann.expiryDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </td>

                {/* Status */}
                <td className="px-6 py-4">
                  <span className={`rounded-lg border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getStatusBadgeStyles(ann.status)}`}>
                    {ann.status}
                  </span>
                </td>

                {/* Priority */}
                <td className="px-6 py-4">
                  <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getPriorityBadgeStyles(ann.priority)}`}>
                    {ann.priority}
                  </span>
                </td>

                {/* Views */}
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-bold">
                  {ann.viewsCount}
                </td>

                {/* Actions Dropdown */}
                <td className="px-6 py-4 text-right relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdown(activeDropdown === ann._id ? null : ann._id);
                    }}
                    className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-150 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer hover:bg-slate-50 hover:shadow-sm"
                  >
                    <MoreVertical size={14} />
                  </button>

                  {activeDropdown === ann._id && (
                    <div
                      ref={dropdownRef}
                      className="absolute right-6 mt-1.5 z-20 w-48 origin-top-right rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-lg dark:border-white/5 dark:bg-ink-950 text-left animate-fade-up animate-duration-200"
                    >
                      <button
                        onClick={() => {
                          onView(ann);
                          setActiveDropdown(null);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.03] cursor-pointer"
                      >
                        <Eye size={13} />
                        View announcement
                      </button>

                      <button
                        onClick={() => {
                          onEdit(ann);
                          setActiveDropdown(null);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.03] cursor-pointer"
                      >
                        <Edit3 size={13} />
                        Edit announcement
                      </button>

                      {(ann.status === "DRAFT" || ann.status === "SCHEDULED") && (
                        <button
                          onClick={() => {
                            onPublishImmediately(ann._id);
                            setActiveDropdown(null);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-emerald-600 dark:text-emerald-450 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 cursor-pointer font-medium"
                        >
                          <ArrowUpCircle size={13} />
                          Publish now
                        </button>
                      )}

                      {ann.status !== "ARCHIVED" ? (
                        <button
                          onClick={() => {
                            onArchive(ann._id);
                            setActiveDropdown(null);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-amber-600 dark:text-amber-450 hover:bg-amber-50 dark:hover:bg-amber-500/10 cursor-pointer"
                        >
                          <Archive size={13} />
                          Archive
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            onUnarchive(ann._id);
                            setActiveDropdown(null);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-emerald-600 dark:text-emerald-450 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 cursor-pointer"
                        >
                          <Megaphone size={13} />
                          Unarchive
                        </button>
                      )}

                      <button
                        onClick={() => {
                          onDuplicate(ann._id);
                          setActiveDropdown(null);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.03] cursor-pointer"
                      >
                        <Copy size={13} />
                        Duplicate
                      </button>

                      <div className="my-1 border-t border-slate-100 dark:border-white/5" />

                      <button
                        onClick={() => {
                          onDelete(ann._id);
                          setActiveDropdown(null);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-rose-600 dark:text-rose-455 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer font-medium"
                      >
                        <Trash2 size={13} />
                        Delete
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
