import React from "react";
import { motion } from "framer-motion";
import { Plus, Compass, Sparkles, MessageSquare, Flame } from "lucide-react";

export interface StudyCircle {
  id: string;
  name: string;
  shortName: string;
  emoji: string;
  dept: string;
  memberCount: number;
  unreadCount?: number;
  hasLiveVoice?: boolean;
  voiceCount?: number;
  gradient: string;
  avatarUrl?: string;
}

interface CircleSwitcherProps {
  circles: StudyCircle[];
  activeCircleId: string;
  onSelectCircle: (circle: StudyCircle) => void;
  onExploreCircles?: () => void;
  onCreateCircle?: () => void;
  activeMode?: "circle" | "dms";
  onSelectDMs?: () => void;
  unreadDMsCount?: number;
}

export function CircleSwitcher({
  circles,
  activeCircleId,
  onSelectCircle,
  onExploreCircles,
  onCreateCircle,
  activeMode = "circle",
  onSelectDMs,
  unreadDMsCount = 0
}: CircleSwitcherProps) {
  const isDMsActive = activeMode === "dms";

  return (
    <nav
      aria-label="Study Circles navigation"
      className="w-18 h-full shrink-0 flex flex-col items-center py-3 bg-slate-100/90 dark:bg-[#080D1A] border-r border-slate-200/80 dark:border-slate-800/80 select-none justify-between z-10"
    >
      {/* ── Top: Discord Direct Messages (DMs) Hub ───────────────────── */}
      <div className="flex flex-col items-center gap-2 w-full">
        <div className="relative group flex items-center justify-center w-full">
          {/* Active Left Indicator Bar (Discord Style) */}
          <span
            className={`absolute left-0 w-1 rounded-r-full bg-[#1E90FF] transition-all duration-200 ${
              isDMsActive
                ? "h-9"
                : "h-2 group-hover:h-5 opacity-0 group-hover:opacity-100"
            }`}
          />

          {/* DMs Button */}
          <button
            type="button"
            onClick={onSelectDMs}
            title="Direct Messages"
            className={`relative flex h-11 w-11 items-center justify-center transition-all cursor-pointer ${
              isDMsActive
                ? "rounded-xl bg-[#1E90FF] text-white shadow-md shadow-[#1E90FF]/30 ring-2 ring-[#1E90FF]/40"
                : "rounded-2xl bg-white dark:bg-[#0F1A30] text-slate-700 dark:text-slate-300 hover:rounded-xl hover:bg-slate-200 dark:hover:bg-[#162544] border border-slate-200/80 dark:border-slate-800/80"
            }`}
          >
            <MessageSquare
              size={20}
              className={`transition-transform duration-200 ${
                isDMsActive ? "scale-105" : "group-hover:scale-110"
              }`}
            />

            {/* Unread DMs Counter Badge */}
            {unreadDMsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold tabular-nums text-white shadow-sm ring-2 ring-white dark:ring-[#080D1A]">
                {unreadDMsCount > 99 ? "99+" : unreadDMsCount}
              </span>
            )}
          </button>

          {/* Tooltip */}
          <div className="absolute left-16 z-50 whitespace-nowrap rounded-xl bg-slate-900/95 dark:bg-[#0F1A30]/95 backdrop-blur-xl border border-slate-700/80 dark:border-slate-700/80 px-3 py-1.5 text-xs font-bold text-white shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
            <span>Direct Messages</span>
            {unreadDMsCount > 0 && (
              <span className="ml-1.5 text-[10px] text-rose-400 font-semibold">
                ({unreadDMsCount} unread)
              </span>
            )}
          </div>
        </div>

        {/* Subtle Divider between DMs and Study Circles */}
        <div className="w-8 h-0.5 rounded-full bg-slate-200 dark:bg-slate-800 my-1" />

        {/* ── Circle Avatars List (Discord Server Rail Style) ─────────── */}
        <div className="flex flex-col items-center gap-2.5 w-full overflow-y-auto no-scrollbar max-h-[calc(100vh-220px)] px-1 py-1">
          {circles.map((circle) => {
            const isActive = activeCircleId === circle.id;
            return (
              <div key={circle.id} className="relative group flex items-center justify-center w-full">
                {/* Active Left Indicator Bar (Discord Style) */}
                <span
                  className={`absolute left-0 w-1 rounded-r-full bg-[#1E90FF] transition-all duration-200 ${
                    isActive
                      ? "h-9"
                      : "h-2 group-hover:h-5 opacity-0 group-hover:opacity-100"
                  }`}
                />

                {/* Circle Icon Button */}
                <button
                  type="button"
                  onClick={() => onSelectCircle(circle)}
                  title={circle.name}
                  className={`relative flex h-11 w-11 items-center justify-center text-sm font-black transition-all cursor-pointer ${
                    isActive
                      ? `rounded-xl bg-gradient-to-tr ${circle.gradient} text-white shadow-md shadow-[#1E90FF]/25 ring-2 ring-[#1E90FF]/40`
                      : "rounded-2xl bg-white dark:bg-[#0F1A30] text-slate-700 dark:text-slate-300 hover:rounded-xl hover:bg-gradient-to-tr hover:from-slate-200 hover:to-slate-100 dark:hover:from-[#162544] dark:hover:to-[#1a2d52] border border-slate-200/80 dark:border-slate-800/80"
                  }`}
                >
                  <span className="text-base">{circle.emoji}</span>

                  {/* Live Voice Stage Indicator */}
                  {circle.hasLiveVoice && (
                    <span
                      title="Live Voice Stage Active"
                      className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] text-white shadow-sm ring-2 ring-white dark:ring-[#080D1A]"
                    >
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      🎙️
                    </span>
                  )}

                  {/* Unread Counter Badge */}
                  {Boolean(circle.unreadCount) && !circle.hasLiveVoice && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#1E90FF] text-[9px] font-bold tabular-nums text-white shadow-sm ring-2 ring-white dark:ring-[#080D1A]">
                      {circle.unreadCount}
                    </span>
                  )}
                </button>

                {/* Hover Tooltip Card */}
                <div className="absolute left-16 z-50 min-w-max hidden group-hover:flex flex-col rounded-xl bg-slate-900/95 dark:bg-[#0F1A30]/95 backdrop-blur-xl border border-slate-700/80 dark:border-slate-700/80 px-3 py-1.5 text-xs text-white shadow-2xl pointer-events-none">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold">{circle.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 tabular-nums">
                    {circle.dept} • {circle.memberCount} members
                  </span>
                  {circle.hasLiveVoice && (
                    <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live Stage: {circle.voiceCount} active
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bottom: Add & Explore Circle Actions ─────────────────────── */}
      <div className="flex flex-col items-center gap-2.5 w-full pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
        {/* Create Circle Button */}
        <button
          type="button"
          onClick={onCreateCircle}
          title="Create New Study Circle"
          className="group relative flex h-10 w-10 items-center justify-center rounded-2xl bg-white dark:bg-[#0F1A30] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-500 dark:hover:text-white border border-dashed border-emerald-500/40 hover:rounded-xl transition-all cursor-pointer shadow-sm"
        >
          <Plus size={18} />
          
          <span className="absolute left-16 z-50 whitespace-nowrap rounded-xl bg-slate-900 dark:bg-white px-2.5 py-1 text-xs font-bold text-white dark:text-slate-950 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg">
            Create Study Circle
          </span>
        </button>

        {/* Explore Circles Button */}
        <button
          type="button"
          onClick={onExploreCircles}
          title="Explore Public Circles"
          className="group relative flex h-10 w-10 items-center justify-center rounded-2xl bg-white dark:bg-[#0F1A30] text-slate-500 dark:text-slate-400 hover:bg-slate-200/80 dark:hover:bg-[#162544] hover:text-slate-900 dark:hover:text-white hover:rounded-xl transition-all cursor-pointer border border-slate-200/80 dark:border-slate-800/80"
        >
          <Compass size={18} />
          
          <span className="absolute left-16 z-50 whitespace-nowrap rounded-xl bg-slate-900 dark:bg-white px-2.5 py-1 text-xs font-bold text-white dark:text-slate-950 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg">
            Explore All Circles
          </span>
        </button>
      </div>
    </nav>
  );
}

export default CircleSwitcher;
