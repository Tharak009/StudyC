import { useState, useRef, useEffect } from "react";
import {
  X,
  Calendar,
  Eye,
  Tag,
  Users,
  AlertTriangle,
  Download,
  BookOpen,
  ArrowUpCircle,
  Clock,
  User
} from "lucide-react";
import type { Announcement } from "../types/announcement";

interface AnnouncementDetailsDrawerProps {
  announcement: Announcement | null;
  onClose: () => void;
  onPublishImmediately: (id: string) => void;
}

export function AnnouncementDetailsDrawer({
  announcement,
  onClose,
  onPublishImmediately
}: AnnouncementDetailsDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Click outside to close drawer
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node) && announcement) {
        const isClickOnPortalOrDropdown = (event.target as Element).closest(".origin-top-right") || (event.target as Element).closest(".Toastify");
        if (!isClickOnPortalOrDropdown) {
          onClose();
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [announcement, onClose]);

  if (!announcement) return null;

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "CRITICAL":
        return "text-rose-600 bg-rose-50 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400";
      case "HIGH":
        return "text-orange-600 bg-orange-50 border-orange-100 dark:bg-orange-500/10 dark:text-orange-400";
      case "NORMAL":
        return "text-indigo-600 bg-indigo-50 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400";
      case "LOW":
        return "text-slate-500 bg-slate-50 border-slate-100 dark:bg-white/5 dark:text-slate-400";
      default:
        return "text-slate-500 bg-slate-50";
    }
  };

  const getCategoryGradient = (cat: string) => {
    switch (cat) {
      case "EMERGENCY":
        return "from-rose-500 to-red-600";
      case "PLACEMENT":
        return "from-amber-500 to-orange-600";
      case "ACADEMIC":
        return "from-blue-500 to-indigo-600";
      case "EVENTS":
        return "from-emerald-500 to-teal-600";
      case "CLUBS":
        return "from-violet-500 to-purple-600";
      default:
        return "from-slate-500 to-slate-700";
    }
  };

  const getAudienceLabel = (ann: Announcement) => {
    switch (ann.targetAudience) {
      case "ENTIRE_COLLEGE":
        return "Entire College";
      case "DEPARTMENT":
        return `Department: ${ann.targetDepartment}`;
      case "ACADEMIC_YEAR":
        return `Academic Year: ${ann.targetAcademicYear}`;
      case "COMMUNITY":
        return `Community: ${ann.targetCommunityName}`;
      default:
        return "Unspecified";
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
        {/* Header banner */}
        <div className={`relative h-28 bg-gradient-to-tr ${getCategoryGradient(announcement.category)} flex items-end p-5 shrink-0`}>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-black/25 p-1.5 text-white hover:bg-black/45 transition cursor-pointer"
          >
            <X size={16} />
          </button>
          <span className="rounded bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white border border-white/10 backdrop-blur-sm">
            {announcement.category} Announcement
          </span>
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {/* Metadata Pills */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="rounded-xl border border-slate-150 p-2 dark:border-white/5 dark:bg-white/[0.01]">
              <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Status</span>
              <span className={`inline-block mt-1 rounded bg-slate-50 border px-1.5 py-0.2 text-[8px] font-bold uppercase ${
                announcement.status === "PUBLISHED"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-450 dark:border-none"
                  : announcement.status === "DRAFT"
                  ? "bg-slate-50 text-slate-650 border-slate-150 dark:bg-white/5 dark:text-slate-450"
                  : announcement.status === "SCHEDULED"
                  ? "bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-none"
                  : announcement.status === "ARCHIVED"
                  ? "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-450"
                  : "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-450"
              }`}>
                {announcement.status}
              </span>
            </div>
            <div className="rounded-xl border border-slate-150 p-2 dark:border-white/5 dark:bg-white/[0.01]">
              <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Priority</span>
              <span className={`inline-block mt-1 rounded border px-1.5 py-0.2 text-[8px] font-bold uppercase ${getPriorityColor(announcement.priority)}`}>
                {announcement.priority}
              </span>
            </div>
            <div className="rounded-xl border border-slate-150 p-2 dark:border-white/5 dark:bg-white/[0.01]">
              <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Views</span>
              <div className="mt-1 flex items-center justify-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                <Eye size={11} className="text-slate-400" />
                <span>{announcement.viewsCount}</span>
              </div>
            </div>
            <div className="rounded-xl border border-slate-150 p-2 dark:border-white/5 dark:bg-white/[0.01]">
              <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Created By</span>
              <span className="block mt-1 text-[10px] font-bold text-slate-700 dark:text-slate-350 truncate">
                {typeof announcement.createdBy === "string"
                  ? announcement.createdBy.split(" ").slice(-1)[0]
                  : (announcement.createdBy as any)?.fullName || (announcement.createdBy as any)?.name || "Admin"}
              </span>
            </div>
          </div>

          {/* Announcement content details */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              {announcement.title}
            </h2>

            <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-450 dark:text-slate-500 border-b border-slate-100 pb-3 dark:border-white/5">
              <div className="flex items-center gap-1">
                <Calendar size={12} />
                <span>Pub: {new Date(announcement.publishDate).toLocaleDateString()}</span>
              </div>
              {announcement.expiryDate && (
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  <span>Expires: {new Date(announcement.expiryDate).toLocaleDateString()}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Users size={12} />
                <span>{getAudienceLabel(announcement)}</span>
              </div>
            </div>

            {/* Rich text body preview */}
            <div
              className="prose prose-sm max-w-none text-slate-700 dark:text-slate-300 leading-relaxed space-y-3 dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: announcement.content }}
            />
          </div>

          {/* Attachments Section */}
          {announcement.attachments && announcement.attachments.length > 0 && (
            <div className="space-y-2 border-t border-slate-100 pt-5 dark:border-white/5">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Attachments ({announcement.attachments.length})
              </h4>
              <div className="space-y-2">
                {announcement.attachments.map((attach, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-150/55 p-3 dark:bg-black/15 dark:border-white/5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <BookOpen size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <div className="min-w-0">
                        <span className="block text-xs font-semibold text-slate-750 dark:text-slate-300 truncate">
                          {attach.name}
                        </span>
                        {attach.size && (
                          <span className="block text-[10px] text-slate-400">
                            {attach.size}
                          </span>
                        )}
                      </div>
                    </div>
                    <button className="flex size-8 items-center justify-center rounded-lg border border-slate-200 dark:border-white/5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer">
                      <Download size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions bar */}
        {(announcement.status === "DRAFT" || announcement.status === "SCHEDULED") && (
          <div className="border-t border-slate-200 bg-slate-50/50 p-4 dark:border-white/5 dark:bg-ink-950 flex justify-end shrink-0">
            <button
              onClick={() => {
                onPublishImmediately(announcement._id);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-650 hover:opacity-95 px-4 py-2.5 text-xs font-bold text-white shadow-sm cursor-pointer"
            >
              <ArrowUpCircle size={14} />
              Publish Announcement Now
            </button>
          </div>
        )}
      </div>
    </>
  );
}
