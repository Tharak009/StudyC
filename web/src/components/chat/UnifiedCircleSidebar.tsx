import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hash,
  Volume2,
  Plus,
  ChevronDown,
  ChevronRight,
  Megaphone,
  Radio,
  Search,
  Lock,
  Mic,
  MicOff,
  Headphones,
  Settings,
  X,
  Users,
  ArrowLeft,
  LayoutDashboard,
  MessageSquare,
  BookOpen,
  Mail,
  Compass,
  Sparkles,
  ShieldCheck
} from "lucide-react";
import { Link } from "react-router";
import type { User } from "../../types/auth";
import type { StudyCircle } from "./CircleSwitcher";
import type { Channel } from "./ChannelSidebar";

interface UnifiedCircleSidebarProps {
  circles: StudyCircle[];
  activeCircle?: StudyCircle | null;
  onSelectCircle: (circle: StudyCircle) => void;
  channels: Channel[];
  activeChannelId?: string | null;
  onSelectChannel: (channel: Channel) => void;
  activeVoiceId: string | null;
  onJoinVoice: (channel: Channel) => void;
  onCreateChannel?: (name: string, type: "text" | "voice" | "announcement") => void;
  onCreateCircle?: () => void;
  onExploreCircles?: () => void;
  onOpenGroupInfo?: () => void;
  currentUser?: User | null;
}

export function UnifiedCircleSidebar({
  circles,
  activeCircle,
  onSelectCircle,
  channels,
  activeChannelId,
  onSelectChannel,
  activeVoiceId,
  onJoinVoice,
  onCreateChannel,
  onCreateCircle,
  onExploreCircles,
  onOpenGroupInfo,
  currentUser
}: UnifiedCircleSidebarProps) {
  const [circleDropdownOpen, setCircleDropdownOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newChanName, setNewChanName] = useState("");
  const [newChanType, setNewChanType] = useState<"text" | "voice" | "announcement">("text");
  const [channelSearch, setChannelSearch] = useState("");

  // Category collapsed states
  const [collapsedCategories, setCollapsedCategories] = useState<{ [key: string]: boolean }>({});

  // Mic & Audio controls
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close circle switcher dropdown on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCircleDropdownOpen(false);
      }
    };
    if (circleDropdownOpen) {
      document.addEventListener("mousedown", handleOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutside);
    };
  }, [circleDropdownOpen]);

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const filteredChannels = channels.filter((c) =>
    c.name.toLowerCase().includes(channelSearch.toLowerCase().trim())
  );

  const announcements = filteredChannels.filter(
    (c) => c.type === "announcement" || c.category === "announcements"
  );
  const textChannels = filteredChannels.filter(
    (c) => c.type === "text" && c.category !== "announcements"
  );
  const voiceChannels = filteredChannels.filter((c) => c.type === "voice");

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChanName.trim()) return;
    onCreateChannel?.(
      newChanName.trim().toLowerCase().replace(/\s+/g, "-"),
      newChanType
    );
    setNewChanName("");
    setCreateOpen(false);
  };

  return (
    <aside className="w-72 sm:w-80 h-full flex flex-col justify-between border-r border-slate-200/80 dark:border-white/[0.08] bg-white/95 dark:bg-[#0A1120]/95 backdrop-blur-xl shrink-0 select-none z-20">
      {/* ── 1. Top Section: Global Back & Circle Switcher Dropdown ────── */}
      <div className="shrink-0">
        {/* App Breadcrumb Bar */}
        <div className="h-12 px-3 border-b border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between bg-slate-50/70 dark:bg-black/20 text-xs">
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 font-bold text-slate-500 dark:text-slate-400 hover:text-[#1E90FF] transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Dashboard</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              to="/direct-messages"
              title="Direct Messages"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <Mail size={14} />
            </Link>
            <Link
              to="/resources"
              title="Resource Vault"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <BookOpen size={14} />
            </Link>
          </div>
        </div>

        {/* ── Official Study Circles Active Space Tag ─────────────────── */}
        <div className="px-3 py-2 bg-[#1E90FF]/10 border-b border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-[#1E90FF] text-white flex items-center justify-center shadow-xs">
              <Sparkles size={13} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#1E90FF]">
                  Study Circles
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[9px] text-slate-400 font-medium">
                Active Collaborative Hub
              </p>
            </div>
          </div>
          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 uppercase tracking-wide">
            Active
          </span>
        </div>

        {/* ── Active Circle Header with Integrated Dropdown Switcher ── */}
        <div ref={dropdownRef} className="relative p-2.5 border-b border-slate-200/80 dark:border-white/[0.06]">
          {activeCircle ? (
            <button
              type="button"
              onClick={() => setCircleDropdownOpen(!circleDropdownOpen)}
              className="w-full flex items-center justify-between p-2 rounded-2xl hover:bg-slate-100/90 dark:hover:bg-white/[0.04] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                <div
                  className={`h-10 w-10 rounded-2xl bg-gradient-to-tr ${activeCircle.gradient} text-white flex items-center justify-center text-lg shrink-0 shadow-md shadow-[#1E90FF]/20 overflow-hidden`}
                >
                  {activeCircle.avatarUrl ? (
                    <img
                      src={activeCircle.avatarUrl}
                      alt={activeCircle.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    activeCircle.emoji
                  )}
                </div>

                <div className="flex flex-col text-left overflow-hidden min-w-0">
                  <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate group-hover:text-[#1E90FF] transition-colors">
                    {activeCircle.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium truncate tabular-nums">
                    {activeCircle.dept} • {activeCircle.memberCount} Students
                  </span>
                </div>
              </div>

              <ChevronDown
                size={15}
                className={`text-slate-400 transition-transform duration-200 shrink-0 ${
                  circleDropdownOpen ? "rotate-180 text-[#1E90FF]" : ""
                }`}
              />
            </button>
          ) : (
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => onCreateCircle?.()}
                className="flex-1 flex items-center justify-center gap-1.5 p-2 rounded-2xl bg-[#1E90FF]/10 border border-[#1E90FF]/25 text-[#1E90FF] hover:bg-[#1E90FF]/20 text-xs font-bold transition-all cursor-pointer"
              >
                <Plus size={13} />
                <span>Create</span>
              </button>
              <button
                type="button"
                onClick={() => onExploreCircles?.()}
                className="flex-1 flex items-center justify-center gap-1.5 p-2 rounded-2xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/[0.1] text-xs font-bold transition-all cursor-pointer"
              >
                <Compass size={13} className="text-[#1E90FF]" />
                <span>Explore</span>
              </button>
            </div>
          )}

          {/* ── Integrated Circle Switcher Dropdown (No 2nd sidebar!) ──── */}
          <AnimatePresence>
            {circleDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-2 right-2 mt-1 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0c1424]/95 backdrop-blur-2xl shadow-2xl p-2 z-50 space-y-1"
              >
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Switch Study Circle
                </div>

                <div className="max-h-56 overflow-y-auto no-scrollbar space-y-0.5">
                  {circles.map((circle) => {
                    const isSelected = activeCircle && circle.id === activeCircle.id;
                    return (
                      <button
                        key={circle.id}
                        type="button"
                        onClick={() => {
                          onSelectCircle(circle);
                          setCircleDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#1E90FF]/15 text-[#1E90FF]"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="h-7 w-7 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-[#1E90FF]/15 shadow-xs">
                            {circle.avatarUrl ? (
                              <img
                                src={circle.avatarUrl}
                                alt={circle.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-sm">{circle.emoji}</span>
                            )}
                          </div>
                          <span className="truncate">{circle.name}</span>
                        </div>

                        {circle.hasLiveVoice && (
                          <span className="h-4 px-1.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-black flex items-center gap-0.5">
                            🎙️ {circle.voiceCount}
                          </span>
                        )}
                        {Boolean(circle.unreadCount) && !circle.hasLiveVoice && (
                          <span className="h-4 min-w-[16px] px-1 rounded-full bg-[#1E90FF] text-white text-[9px] font-black flex items-center justify-center">
                            {circle.unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-1.5 border-t border-slate-200 dark:border-white/[0.06] space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      onExploreCircles?.();
                      setCircleDropdownOpen(false);
                    }}
                    className="w-full py-1.5 px-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Compass size={13} className="text-[#1E90FF]" />
                    <span>Explore Campus Circles</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onCreateCircle?.();
                      setCircleDropdownOpen(false);
                    }}
                    className="w-full py-1.5 px-2 rounded-xl text-xs font-bold text-[#1E90FF] hover:bg-[#1E90FF]/10 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Create New Circle</span>
                  </button>

                  {activeCircle && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenGroupInfo?.();
                        setCircleDropdownOpen(false);
                      }}
                      className="w-full py-1.5 px-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Users size={13} />
                      <span>View Circle Details</span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Quick In-Channel Filter Search ──────────────────────────── */}
        <div className="p-3 pb-1">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search channels..."
              value={channelSearch}
              onChange={(e) => setChannelSearch(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-[#080D1A]/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#1E90FF] transition-colors"
            />
          </div>
        </div>
      </div>

      {/* ── 2. Center: Categorized Channels Feed ──────────────────────── */}
      <div className="flex-1 p-3 space-y-4 overflow-y-auto no-scrollbar">
        {/* 1. BROADCAST NOTICES (WhatsApp Style) */}
        {announcements.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-2 mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <div
                onClick={() => toggleCategory("announcements")}
                className="flex items-center gap-1.5 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200"
              >
                {collapsedCategories["announcements"] ? (
                  <ChevronRight size={11} />
                ) : (
                  <ChevronDown size={11} />
                )}
                <span>Notice Board</span>
              </div>
              <span className="text-[9px] font-semibold text-slate-400">
                Official
              </span>
            </div>

            {!collapsedCategories["announcements"] && (
              <div className="space-y-0.5">
                {announcements.map((c) => {
                  const isActive = activeChannelId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onSelectChannel(c)}
                      className={`w-full group flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? "bg-[#1E90FF]/15 text-[#1E90FF] shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Megaphone size={13} className="text-amber-500 shrink-0" />
                        <span className="truncate">{c.name}</span>
                      </div>
                      {Boolean(c.unread) && (
                        <span className="h-4 min-w-[16px] px-1 rounded-full bg-[#1E90FF] text-white text-[9px] font-black flex items-center justify-center">
                          {c.unread}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 2. TEXT CHANNELS */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <div
              onClick={() => toggleCategory("text")}
              className="flex items-center gap-1.5 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200"
            >
              {collapsedCategories["text"] ? (
                <ChevronRight size={11} />
              ) : (
                <ChevronDown size={11} />
              )}
              <span>Text Channels</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setNewChanType("text");
                setCreateOpen(true);
              }}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Create Text Channel"
            >
              <Plus size={12} />
            </button>
          </div>

          {!collapsedCategories["text"] && (
            <div className="space-y-0.5">
              {textChannels.length === 0 ? (
                <div className="px-2 py-2 text-center text-[11px] text-slate-400">
                  No text channels yet. Click '+' above to create one.
                </div>
              ) : (
                textChannels.map((c) => {
                const isActive = activeChannelId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onSelectChannel(c)}
                    className={`w-full group flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#1E90FF]/15 text-[#1E90FF] shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {c.isPrivate ? (
                        <Lock size={13} className="text-slate-400 shrink-0" />
                      ) : (
                        <Hash
                          size={13}
                          className="text-slate-400 group-hover:text-[#1E90FF] transition-colors shrink-0"
                        />
                      )}
                      <span className="truncate">{c.name}</span>
                    </div>

                    {Boolean(c.unread) && (
                      <span className="h-4 min-w-[16px] px-1 rounded-full bg-[#1E90FF] text-white text-[9px] font-black flex items-center justify-center shadow-sm">
                        {c.unread}
                      </span>
                    )}
                  </button>
                );
              })
              )}
            </div>
          )}
        </div>

        {/* 3. VOICE STAGES & STUDY ROOMS */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <div
              onClick={() => toggleCategory("voice")}
              className="flex items-center gap-1.5 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200"
            >
              {collapsedCategories["voice"] ? (
                <ChevronRight size={11} />
              ) : (
                <ChevronDown size={11} />
              )}
              <span>Voice Stages ({voiceChannels.length})</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setNewChanType("voice");
                setCreateOpen(true);
              }}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Create Voice Stage"
            >
              <Plus size={12} />
            </button>
          </div>

          {!collapsedCategories["voice"] && (
            <div className="space-y-1">
              {voiceChannels.length === 0 ? (
                <div className="px-2 py-2 text-center text-[11px] text-slate-400">
                  No live voice stages. Click '+' to start one.
                </div>
              ) : (
                voiceChannels.map((c) => {
                const isVoiceActive = activeVoiceId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onJoinVoice(c)}
                    className={`w-full group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isVoiceActive
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Radio
                        size={13}
                        className={`${
                          isVoiceActive
                            ? "text-emerald-500 animate-pulse"
                            : "text-slate-400 group-hover:text-emerald-500 transition-colors"
                        } shrink-0`}
                      />
                      <span className="truncate">{c.name}</span>
                    </div>

                    {Boolean(c.activeUsers) && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full tabular-nums">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                        {c.activeUsers} in call
                      </span>
                    )}
                  </button>
                );
              })
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 3. Bottom User Control Deck ──────────────────────────────── */}
      <div className="p-2.5 bg-slate-100/80 dark:bg-black/40 border-t border-slate-200/80 dark:border-white/[0.06] shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden min-w-0 pr-1">
            <div className="relative shrink-0">
              <div className="h-8 w-8 rounded-xl bg-[#1E90FF] text-white flex items-center justify-center font-bold text-xs shadow-sm overflow-hidden">
                {currentUser?.profilePicture ? (
                  <img
                    src={currentUser.profilePicture}
                    alt={currentUser.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  currentUser?.fullName?.charAt(0) || "A"
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0A1120]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {currentUser?.fullName || "Aarav Sharma"}
              </span>
              <span className="text-[10px] text-slate-400 font-medium truncate">
                {currentUser?.rollNumber || "CS24-104"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? "Unmute Mic" : "Mute Mic"}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isMuted
                  ? "text-rose-500 bg-rose-500/10"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.06]"
              }`}
            >
              {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
            </button>

            <button
              type="button"
              onClick={() => setIsDeafened(!isDeafened)}
              title={isDeafened ? "Undeafen Audio" : "Deafen Audio"}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDeafened
                  ? "text-rose-500 bg-rose-500/10"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.06]"
              }`}
            >
              <Headphones size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Create Channel Modal Dialog ───────────────────────────────── */}
      <AnimatePresence>
        {createOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c1322] p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Create New Channel
                </h3>
                <button
                  onClick={() => setCreateOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                    Channel Type
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setNewChanType("text")}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                        newChanType === "text"
                          ? "border-[#1E90FF] bg-[#1E90FF]/10 text-[#1E90FF]"
                          : "border-slate-200 dark:border-white/10 text-slate-400"
                      }`}
                    >
                      <Hash size={16} />
                      <span>Text</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewChanType("voice")}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                        newChanType === "voice"
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                          : "border-slate-200 dark:border-white/10 text-slate-400"
                      }`}
                    >
                      <Volume2 size={16} />
                      <span>Voice</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewChanType("announcement")}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                        newChanType === "announcement"
                          ? "border-amber-500 bg-amber-500/10 text-amber-500"
                          : "border-slate-200 dark:border-white/10 text-slate-400"
                      }`}
                    >
                      <Megaphone size={16} />
                      <span>Notice</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                    Channel Name
                  </label>
                  <div className="relative">
                    <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. lab-prep-batch-b"
                      value={newChanName}
                      onChange={(e) => setNewChanName(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1E90FF]"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCreateOpen(false)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-md shadow-[#1E90FF]/30 cursor-pointer"
                  >
                    Create Channel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </aside>
  );
}

export default UnifiedCircleSidebar;
