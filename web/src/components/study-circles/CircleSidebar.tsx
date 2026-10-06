import React, { useState, useMemo } from "react";
import {
  Hash,
  Bell,
  Shield,
  Coffee,
  Plus,
  Search,
  Users,
  Sparkles,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import type { Channel } from "../../types/chat";

interface CircleSidebarProps {
  community: {
    _id: string;
    name: string;
    description?: string;
    bannerImage?: string;
    memberCount?: number;
    owner?: string | { _id: string };
  };
  channels: Channel[];
  activeChannelId: string | null;
  onSelectChannel: (channel: Channel) => void;
  onCreateChannel?: () => void;
  currentUserId?: string;
  className?: string;
}

export const CircleSidebar: React.FC<CircleSidebarProps> = ({
  community,
  channels,
  activeChannelId,
  onSelectChannel,
  onCreateChannel,
  currentUserId,
  className = ""
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({
    announcements: false,
    focus: false,
    watercooler: false
  });

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // 3-Tier Categorization
  const categorizedChannels = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const filtered = channels.filter((c) =>
      query ? c.name.toLowerCase().includes(query) || c.topic?.toLowerCase().includes(query) : true
    );

    const announcements: Channel[] = [];
    const focus: Channel[] = [];
    const watercooler: Channel[] = [];

    filtered.forEach((ch) => {
      if (ch.type === "announcement" || ch.category === "announcements") {
        announcements.push(ch);
      } else if (
        ch.category === "watercooler" ||
        ch.name.toLowerCase().includes("lounge") ||
        ch.name.toLowerCase().includes("watercooler") ||
        ch.name.toLowerCase().includes("random")
      ) {
        watercooler.push(ch);
      } else {
        focus.push(ch);
      }
    });

    return { announcements, focus, watercooler };
  }, [channels, searchQuery]);

  return (
    <div
      className={`w-72 flex-shrink-0 flex flex-col bg-white/95 dark:bg-[#0B1324]/95 border-r border-slate-200/80 dark:border-slate-800/80 h-full select-none text-slate-700 dark:text-slate-300 transition-colors duration-200 ${className}`}
    >
      {/* ── Circle Header & Banner ── */}
      <div className="p-3 border-b border-slate-200/80 dark:border-slate-800/80 relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center font-black text-white text-sm shadow-md shadow-blue-500/20">
              {community.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide truncate max-w-[140px]">
                {community.name}
              </h2>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                <span>{community.memberCount || 1} Scholars</span>
              </div>
            </div>
          </div>

          {onCreateChannel && (
            <button
              onClick={onCreateChannel}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#162544] transition-colors cursor-pointer"
              title="Create Study Channel"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick Search Jump Bar (Cmd+K) */}
        <div className="mt-3 relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Jump to channel (Cmd+K)..."
            className="w-full bg-slate-100 dark:bg-[#080D1A] border border-slate-200 dark:border-slate-700/80 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#1E90FF] transition-colors"
          />
        </div>
      </div>

      {/* ── 4-Tier Categorized Channel List ── */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 no-scrollbar">
        {/* Tier 1: Announcements & Syllabus */}
        {categorizedChannels.announcements.length > 0 && (
          <div>
            <button
              onClick={() => toggleCategory("announcements")}
              className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Bell className="w-3 h-3 text-amber-500" />
                Syllabus & Notices
              </span>
              {collapsedCategories.announcements ? (
                <ChevronRight className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>

            {!collapsedCategories.announcements && (
              <div className="mt-1 space-y-0.5">
                {categorizedChannels.announcements.map((ch) => {
                  const isSelected = activeChannelId === (ch._id || ch.name);
                  return (
                    <button
                      key={ch._id || ch.name}
                      onClick={() => onSelectChannel(ch)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#1E90FF] text-white font-semibold shadow-md shadow-[#1E90FF]/25"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-[#0F1A30]"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Bell className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <span className="truncate">{ch.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tier 2: Academic Focus Rooms (Strict Study Mode) */}
        <div>
          <button
            onClick={() => toggleCategory("focus")}
            className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-emerald-500" />
              Academic Focus Rooms
            </span>
            {collapsedCategories.focus ? (
              <ChevronRight className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>

          {!collapsedCategories.focus && (
            <div className="mt-1 space-y-0.5">
              {categorizedChannels.focus.length === 0 ? (
                <div className="px-2 py-2 text-[11px] text-slate-400 dark:text-slate-500 italic">
                  No focus channels found
                </div>
              ) : (
                categorizedChannels.focus.map((ch) => {
                  const isSelected = activeChannelId === (ch._id || ch.name);
                  return (
                    <button
                      key={ch._id || ch.name}
                      onClick={() => onSelectChannel(ch)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all group cursor-pointer ${
                        isSelected
                          ? "bg-[#1E90FF] text-white font-semibold shadow-md shadow-[#1E90FF]/25"
                          : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-[#0F1A30]"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Hash
                          className={`w-3.5 h-3.5 flex-shrink-0 ${
                            isSelected ? "text-white" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300"
                          }`}
                        />
                        <span className="truncate">{ch.name}</span>
                      </div>

                      {ch.isStrictStudyMode !== false && (
                        <div
                          title="Strict Study Mode: Off-topic messages are automatically filtered."
                          className={`p-0.5 rounded ${
                            isSelected ? "text-blue-100" : "text-emerald-500 dark:text-emerald-400"
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Tier 3: Campus Watercooler */}
        {categorizedChannels.watercooler.length > 0 && (
          <div>
            <button
              onClick={() => toggleCategory("watercooler")}
              className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Coffee className="w-3 h-3 text-amber-500" />
                Campus Watercooler
              </span>
              {collapsedCategories.watercooler ? (
                <ChevronRight className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>

            {!collapsedCategories.watercooler && (
              <div className="mt-1 space-y-0.5">
                {categorizedChannels.watercooler.map((ch) => {
                  const isSelected = activeChannelId === (ch._id || ch.name);
                  return (
                    <button
                      key={ch._id || ch.name}
                      onClick={() => onSelectChannel(ch)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all group cursor-pointer ${
                        isSelected
                          ? "bg-[#1E90FF] text-white font-semibold shadow-md shadow-[#1E90FF]/25"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-[#0F1A30]"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Coffee className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        <span className="truncate">{ch.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Circle Status Footer ── */}
      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50 dark:bg-[#080D1A] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Circle Active</span>
        </div>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Cobalt OS v2.0</span>
      </div>
    </div>
  );
};
