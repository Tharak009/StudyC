import React from "react";
import {
  Hash,
  Volume2,
  Megaphone,
  Radio,
  Search,
  Sliders,
  ShieldCheck,
  ShieldAlert,
  Info,
  Tag,
  Code2,
  Maximize2,
  Minimize2
} from "lucide-react";
import type { Channel } from "./ChannelSidebar";
import type { StudyCircle } from "./CircleSwitcher";

interface ChannelHeaderProps {
  channel: Channel;
  circle: StudyCircle;
  memberCount: number;
  isSearchOpen: boolean;
  onToggleSearch: () => void;
  onJoinVoice: () => void;
  isGroupInfoOpen: boolean;
  onToggleGroupInfo: () => void;
  onOpenSettings?: () => void;
  isModeratorOrAdmin?: boolean;
  isEnlarged?: boolean;
  onToggleEnlarge?: () => void;
}

export function ChannelHeader({
  channel,
  circle,
  memberCount,
  isSearchOpen,
  onToggleSearch,
  onJoinVoice,
  isGroupInfoOpen,
  onToggleGroupInfo,
  onOpenSettings,
  isModeratorOrAdmin = true,
  isEnlarged = false,
  onToggleEnlarge
}: ChannelHeaderProps) {
  const isStrict = channel.isStrictStudyMode ?? true;
  const tags = channel.academicContextTags || [];

  return (
    <header className="h-16 shrink-0 border-b border-slate-200/80 dark:border-white/[0.06] bg-white/85 dark:bg-[#0c1424]/85 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between gap-3 select-none transition-colors">
      {/* ── Left: Group & Channel Identity ─────────────────────────────── */}
      <div className="flex items-center gap-3 overflow-hidden min-w-0">
        <div
          onClick={onToggleGroupInfo}
          title="Click for Faculty & Mentors details"
          className="flex items-center gap-3 overflow-hidden min-w-0 p-1.5 -ml-1.5 rounded-2xl hover:bg-slate-100/90 dark:hover:bg-white/[0.04] transition-all cursor-pointer group"
        >
          {/* Circle Avatar */}
          <div
            className={`h-10 w-10 rounded-2xl bg-gradient-to-tr ${
              circle.gradient || "from-[#1E90FF] to-[#187bcd]"
            } text-white flex items-center justify-center text-lg shrink-0 shadow-md shadow-[#1E90FF]/25 group-hover:scale-105 transition-transform overflow-hidden`}
          >
            {circle.avatarUrl ? (
              <img
                src={circle.avatarUrl}
                alt={circle.name}
                className="h-full w-full object-cover"
              />
            ) : (
              circle.emoji || "📚"
            )}
          </div>

          {/* Titles & Meta */}
          <div className="flex flex-col min-w-0 text-left">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white truncate group-hover:text-[#1E90FF] transition-colors">
                {circle.name}
              </h2>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400 truncate">
              <span className="text-[#1E90FF] font-bold flex items-center gap-1">
                {channel.type === "voice" ? (
                  <Volume2 size={12} />
                ) : channel.type === "announcement" ? (
                  <Megaphone size={12} />
                ) : (
                  <Hash size={12} />
                )}
                <span>{channel.name}</span>
              </span>

              <span>•</span>

              <span className="text-emerald-500 font-bold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {memberCount} {memberCount === 1 ? "member" : "members"}
              </span>
            </div>
          </div>
        </div>

        {/* ── Strict Study Mode Shield Pill ────────────────────────────── */}
        <div className="hidden md:flex items-center gap-1.5 ml-2">
          {isStrict ? (
            <div
              className="group/tag relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 text-xs font-extrabold shadow-sm"
              title={`Strict Study Mode Active. Tags: ${
                tags.length > 0 ? tags.join(", ") : "All Coursework"
              }`}
            >
              <ShieldCheck size={14} className="text-emerald-500 animate-pulse" />
              <span>Strict Study Mode</span>

              {/* Hover Tooltip with Syllabus Tags */}
              <div className="absolute left-0 top-full mt-2 hidden group-hover/tag:flex flex-col z-50 w-64 p-3 rounded-2xl bg-[#0F1A30]/95 backdrop-blur-xl border border-emerald-500/30 shadow-2xl text-slate-200 pointer-events-none">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 mb-1">
                  <ShieldCheck size={13} />
                  <span>Academic Focus Active</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  Off-topic banter is intercepted. Allowed topics for #{channel.name}:
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {tags.length > 0 ? (
                    tags.map((t: string) => (
                      <span
                        key={t}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-white/10 text-emerald-300"
                      >
                        #{t}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-400">
                      Standard syllabus, assignments & algorithms
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-semibold">
              <ShieldAlert size={12} />
              <span>Open Discussion</span>
            </span>
          )}

          {channel.allowCodeSnippetsOnly && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold">
              <Code2 size={11} />
              <span>Code Only</span>
            </span>
          )}
        </div>
      </div>

      {/* ── Right Header Actions ───────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Search messages in channel */}
        <button
          type="button"
          onClick={onToggleSearch}
          title="Search messages in channel"
          className={`p-2 rounded-xl transition-colors cursor-pointer ${
            isSearchOpen
              ? "bg-[#1E90FF]/15 text-[#1E90FF]"
              : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Search size={16} />
        </button>

        {/* Quick Live Voice Stage Action */}
        {channel.type !== "voice" && (
          <button
            type="button"
            onClick={onJoinVoice}
            title="Join Voice Study Stage"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold transition-colors cursor-pointer"
          >
            <Radio size={14} className="animate-pulse" />
            <span>Live Stage</span>
          </button>
        )}

        {/* Room Moderator / Faculty Channel Settings Toggle */}
        {isModeratorOrAdmin && onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            title="Configure Strict Study Mode & Topics"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-[#1E90FF] text-xs font-bold transition-colors cursor-pointer"
          >
            <Sliders size={15} />
            <span className="hidden lg:inline">Settings</span>
          </button>
        )}

        {/* Enlarge / Full Screen Subpage Toggle */}
        {onToggleEnlarge && (
          <button
            type="button"
            onClick={onToggleEnlarge}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isEnlarged
                ? "bg-[#1E90FF]/15 text-[#1E90FF] ring-1 ring-[#1E90FF]/40 hover:bg-[#1E90FF]/25 shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06]"
            }`}
            title={isEnlarged ? "Restore View (Show Sidebars) [Esc]" : "Enlarge Subpage (Hide Sidebars)"}
          >
            {isEnlarged ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        )}

        {/* WhatsApp-Style Group Info Trigger */}
        <button
          type="button"
          onClick={onToggleGroupInfo}
          title="View Group Info & Faculty Details"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            isGroupInfoOpen
              ? "bg-[#1E90FF]/15 text-[#1E90FF] border border-[#1E90FF]/30"
              : "bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/[0.1]"
          }`}
        >
          <Info size={14} />
          <span className="hidden sm:inline">Group Info</span>
        </button>
      </div>
    </header>
  );
}
export default ChannelHeader;
