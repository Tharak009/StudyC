import React from "react";
import { Pin, FileText, X, ArrowUpRight, Check } from "lucide-react";

export interface PinnedMessageData {
  id: string;
  title: string;
  type?: "document" | "text" | "code";
  url?: string;
}

interface PinnedMessageBannerProps {
  pinnedMessage?: PinnedMessageData | null;
  onClick?: () => void;
  onUnpin?: () => void;
}

export function PinnedMessageBanner({
  pinnedMessage,
  onClick,
  onUnpin
}: PinnedMessageBannerProps) {
  if (!pinnedMessage) return null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className="group sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-2 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#111b21]/95 backdrop-blur-md text-slate-800 dark:text-slate-200 cursor-pointer shadow-xs hover:bg-slate-50 dark:hover:bg-[#15222b] transition-colors"
      title="Click to jump to pinned item"
    >
      <div className="flex items-center gap-3 overflow-hidden min-w-0">
        {/* Pushpin icon */}
        <div className="p-1 rounded-md text-slate-400 dark:text-slate-400 group-hover:text-[#1E90FF] transition-colors shrink-0">
          <Pin size={15} className="rotate-45" />
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700/80 shrink-0" />

        {/* Icon & Document Title */}
        <div className="flex items-center gap-2 overflow-hidden min-w-0">
          <FileText size={15} className="text-[#1E90FF] shrink-0" />
          <span className="text-xs sm:text-[13px] font-medium truncate text-slate-900 dark:text-slate-100">
            {pinnedMessage.title}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {pinnedMessage.url && (
          <span className="text-[11px] text-[#1E90FF] font-semibold flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <span>View</span>
            <ArrowUpRight size={12} />
          </span>
        )}

        {onUnpin && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUnpin();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Unpin message"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

export default PinnedMessageBanner;
