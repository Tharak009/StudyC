import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  FileCode,
  FileArchive,
  Presentation,
  Bookmark,
  Download,
  Eye,
  Star,
  ShieldCheck,
  Tag
} from "lucide-react";

export interface VaultResource {
  id: string;
  title: string;
  description: string;
  subjectCode: string;
  subjectName: string;
  dept: string;
  semester: string;
  category: string;
  format: "pdf" | "ipynb" | "zip" | "pptx";
  fileSize: string;
  fileUrl: string;
  downloadCount: number;
  rating: number;
  reviewCount: number;
  tags: string[];
  uploader: {
    name: string;
    roll: string;
    dept: string;
    isVerified: boolean;
  };
  createdAt: string;
  isBookmarked?: boolean;
}

interface ResourceCardProps {
  resource: VaultResource;
  onPreview: (res: VaultResource) => void;
  onDownload: (res: VaultResource) => void;
  onToggleBookmark: (resId: string) => void;
}

export function ResourceCard({
  resource,
  onPreview,
  onDownload,
  onToggleBookmark
}: ResourceCardProps) {
  const [bookmarked, setBookmarked] = useState(resource.isBookmarked || false);

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarked(!bookmarked);
    onToggleBookmark(resource.id);
  };

  const getFormatBadge = (fmt: string) => {
    switch (fmt) {
      case "pdf":
        return {
          label: "PDF",
          color: "bg-rose-500/15 text-rose-500 dark:text-rose-400 border-rose-500/30",
          icon: FileText
        };
      case "ipynb":
        return {
          label: "IPYNB",
          color: "bg-[#1E90FF]/15 text-[#1E90FF] border-[#1E90FF]/30",
          icon: FileCode
        };
      case "zip":
        return {
          label: "ZIP",
          color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
          icon: FileArchive
        };
      case "pptx":
        return {
          label: "PPTX",
          color: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
          icon: Presentation
        };
      default:
        return {
          label: "DOC",
          color: "bg-[#1E90FF]/15 text-[#1E90FF] border-[#1E90FF]/30",
          icon: FileText
        };
    }
  };

  const badgeInfo = getFormatBadge(resource.format);
  const FormatIcon = badgeInfo.icon;

  const getUploaderName = (uploader: any): string => {
    if (!uploader) return "Scholar";
    if (typeof uploader === "string") return uploader;
    if (typeof uploader === "object" && uploader !== null) {
      return uploader.name || uploader.fullName || uploader.uploader || "Scholar";
    }
    return String(uploader);
  };

  const getInitials = (uploader: any) => {
    const name = getUploaderName(uploader);
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/85 p-5 backdrop-blur-xl shadow-md hover:border-[#1E90FF]/50 hover:shadow-xl dark:hover:shadow-[#1E90FF]/10 transition-all"
    >
      <div>
        {/* ── Top Header Row: Format Badge, Subject Code, Bookmark ──────── */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${badgeInfo.color}`}
            >
              <FormatIcon size={11} />
              {badgeInfo.label}
            </span>
            <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-[#162544] px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800">
              {resource.subjectCode}
            </span>
            <span className="text-[10px] text-slate-400 tabular-nums">
              {resource.semester}
            </span>
          </div>

          {/* Bookmark Toggle Button */}
          <button
            onClick={handleBookmarkClick}
            className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
              bookmarked
                ? "border-amber-400/40 bg-amber-500/10 text-amber-500"
                : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
            title={bookmarked ? "Remove Bookmark" : "Save to My Bookmarks"}
          >
            <Bookmark size={14} className={bookmarked ? "fill-current" : ""} />
          </button>
        </div>

        {/* ── Title & Description ──────────────────────────────────────── */}
        <h3
          onClick={() => onPreview(resource)}
          className="text-sm font-bold text-slate-900 dark:text-slate-50 line-clamp-1 hover:text-[#1E90FF] transition-colors cursor-pointer mb-1.5"
        >
          {resource.title}
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-3">
          {resource.description}
        </p>

        {/* ── Tag Chips ────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {resource.tags.slice(0, 3).map((tag, tIdx) => (
            <span
              key={tIdx}
              className="text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100/80 dark:bg-[#080D1A]/80 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-800/60"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* ── Bottom Section: Uploader & Action Buttons ──────────────────── */}
      <div>
        {/* Uploader & Rating Metrics */}
        <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800/60 flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#1E90FF] text-white font-bold text-[10px] shrink-0">
              {getInitials(resource.uploader)}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {getUploaderName(resource.uploader)}
              </span>
              <span className="text-[9px] text-slate-400">
                {resource.createdAt}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500 shrink-0">
            <Star size={12} className="fill-current" />
            <span>{resource.rating.toFixed(1)}</span>
            <span className="text-[9px] text-slate-400 font-normal">
              ({resource.reviewCount})
            </span>
          </div>
        </div>

        {/* Action Buttons: Preview & Download */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onPreview(resource)}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#1E90FF] hover:border-[#1E90FF]/40 transition-colors cursor-pointer"
          >
            <Eye size={13} />
            <span>Preview</span>
          </button>

          <button
            onClick={() => onDownload(resource)}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-sm shadow-[#1E90FF]/25 hover:brightness-105 transition-all cursor-pointer"
          >
            <Download size={13} />
            <span>{resource.downloadCount}</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default ResourceCard;
