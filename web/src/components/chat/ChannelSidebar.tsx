import React, { useState } from "react";
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
  ShieldCheck
} from "lucide-react";
import type { User } from "../../types/auth";

export interface Channel {
  id: string;
  name: string;
  type: "text" | "voice" | "announcement";
  category?: "announcements" | "text" | "voice";
  unread?: number;
  activeUsers?: number;
  isPrivate?: boolean;
  topic?: string;
  isStrictStudyMode?: boolean;
  academicContextTags?: string[];
  strictnessThreshold?: number;
  allowCodeSnippetsOnly?: boolean;
  strikeLimitBeforeTimeout?: number;
  timeoutDurationMinutes?: number;
}

export interface CommunityInfo {
  id: string;
  name: string;
  dept: string;
  code: string;
  memberCount: number;
}

interface ChannelSidebarProps {
  communityName?: string;
  departmentTag?: string;
  channels: Channel[];
  activeChannelId: string;
  onSelectChannel: (channel: Channel) => void;
  activeVoiceId: string | null;
  onJoinVoice: (channel: Channel) => void;
  onCreateChannel?: (name: string, type: "text" | "voice" | "announcement") => void;
  currentUser?: User | null;
}

export function ChannelSidebar({
  communityName = "Computer Science 2026",
  departmentTag = "CSE • 342 Students",
  channels,
  activeChannelId,
  onSelectChannel,
  activeVoiceId,
  onJoinVoice,
  onCreateChannel,
  currentUser
}: ChannelSidebarProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [newChanName, setNewChanName] = useState("");
  const [newChanType, setNewChanType] = useState<"text" | "voice" | "announcement">("text");
  const [channelSearch, setChannelSearch] = useState("");

  // Category collapsed states
  const [collapsedCategories, setCollapsedCategories] = useState<{ [key: string]: boolean }>({});

  // Audio mute/deafen states (Discord-style user deck)
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);

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
    <aside className="w-64 h-full flex flex-col justify-between border-r border-slate-200/80 dark:border-white/[0.06] bg-white/90 dark:bg-[#0B1324]/90 backdrop-blur-xl shrink-0 select-none">
      {/* ── Top: Community Header & Search ────────────────────────────── */}
      <div className="shrink-0">
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200/80 dark:border-white/[0.06]">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1E90FF] text-white font-black text-xs shrink-0 shadow-sm shadow-[#1E90FF]/25">
              CS
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate">
                {communityName}
              </span>
              <span className="text-[10px] font-bold text-[#1E90FF] truncate">
                {departmentTag}
              </span>
            </div>
          </div>
          <ChevronDown size={14} className="text-slate-400 shrink-0 cursor-pointer hover:text-slate-600 dark:hover:text-slate-200" />
        </div>

        {/* Quick Filter Search inside Circle Channels */}
        <div className="p-3 pb-1">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Jump to channel..."
              value={channelSearch}
              onChange={(e) => setChannelSearch(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-[#080D1A]/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#1E90FF] transition-colors"
            />
          </div>
        </div>
      </div>

      {/* ── Center: Categorized Channels Feed ─────────────────────────── */}
      <div className="flex-1 p-3 space-y-4 overflow-y-auto no-scrollbar">
        {/* 1. ANNOUNCEMENTS CATEGORY (WhatsApp Community style) */}
        {announcements.length > 0 && (
          <div>
            <div
              onClick={() => toggleCategory("announcements")}
              className="flex items-center justify-between px-2 mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200"
            >
              <div className="flex items-center gap-1.5">
                {collapsedCategories["announcements"] ? (
                  <ChevronRight size={11} />
                ) : (
                  <ChevronDown size={11} />
                )}
                <span>Broadcast & Notices</span>
              </div>
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

        {/* 2. TEXT CHANNELS CATEGORY (Discord style) */}
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
              {textChannels.map((c) => {
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
              })}
            </div>
          )}
        </div>

        {/* 3. VOICE STAGES & STUDY ROOMS (Discord style) */}
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
              {voiceChannels.map((c) => {
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
                      <span className="flex items-center gap-1 text-[10px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                        {c.activeUsers} in call
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom: Discord-Style User Control Deck ───────────────────── */}
      <div className="p-2.5 bg-slate-100/70 dark:bg-black/30 border-t border-slate-200/80 dark:border-white/[0.06] shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden min-w-0 pr-1">
            <div className="relative shrink-0">
              <div className="h-8 w-8 rounded-xl bg-[#1E90FF] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {currentUser?.fullName?.charAt(0) || "A"}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0B1324]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {currentUser?.fullName || "Aarav Sharma"}
              </span>
              <span className="text-[10px] text-slate-400 tabular-nums truncate">
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
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
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
                    className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
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

export default ChannelSidebar;
