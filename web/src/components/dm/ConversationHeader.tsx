import React from "react";
import {
  ShieldCheck,
  Shield,
  User,
  FolderOpen,
  ArrowLeft,
  MoreVertical,
  Phone,
  Video,
  Search,
  Info,
  Maximize2,
  Minimize2
} from "lucide-react";
import { Link } from "react-router";

export interface ActivePeer {
  id: string;
  name: string;
  roll: string;
  dept: string;
  isOnline: boolean;
  lastSeen?: string;
  avatar?: string;
}

interface ConversationHeaderProps {
  peer: ActivePeer;
  onBack?: () => void;
  onOpenContactInfo?: () => void;
  onStartCall?: (type: "audio" | "video") => void;
  onSearchInChat?: () => void;
  isPeerTyping?: boolean;
  isEnlarged?: boolean;
  onToggleEnlarge?: () => void;
}

export function ConversationHeader({
  peer,
  onBack,
  onOpenContactInfo,
  onStartCall,
  onSearchInChat,
  isPeerTyping = false,
  isEnlarged = false,
  onToggleEnlarge
}: ConversationHeaderProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <header className="h-16 shrink-0 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#0F1A30]/90 backdrop-blur-xl px-3 sm:px-5 flex items-center justify-between gap-2 z-20">
      
      {/* ── WhatsApp-Style Peer Identity & Click-To-Open Info ─────────── */}
      <div className="flex items-center gap-2.5 sm:gap-3 overflow-hidden min-w-0">
        {/* Mobile Back Button */}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="md:hidden p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Back to Chats"
          >
            <ArrowLeft size={18} />
          </button>
        )}

        {/* Clickable Identity Container (opens Contact Info Drawer) */}
        <div
          onClick={onOpenContactInfo}
          className="flex items-center gap-3 overflow-hidden cursor-pointer group py-1 px-1 -mx-1 rounded-2xl hover:bg-slate-100/70 dark:hover:bg-slate-800/40 transition-colors select-none"
          title="Click to view contact info"
        >
          {/* Avatar with Live Ring */}
          <div className="relative shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl overflow-hidden bg-[#1E90FF] text-white font-bold text-xs shadow-sm ring-1 ring-white/20">
              {peer.avatar ? (
                <img
                  src={peer.avatar}
                  alt={peer.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                getInitials(peer.name)
              )}
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-[#0F1A30] ${
                peer.isOnline ? "bg-emerald-500" : "bg-slate-400"
              }`}
            />
          </div>

          {/* Name & Live Status Subtitle */}
          <div className="flex flex-col overflow-hidden text-left min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-[#1E90FF] transition-colors">
                {peer.name}
              </h2>
              <ShieldCheck size={13} className="text-[#1E90FF] shrink-0" />
              <span className="text-[10px] tabular-nums text-slate-400 hidden sm:inline">
                ({peer.roll})
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] truncate">
              {isPeerTyping ? (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold animate-pulse">
                  typing...
                </span>
              ) : peer.isOnline ? (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  online
                </span>
              ) : (
                <span className="text-slate-400 truncate">
                  {peer.lastSeen ? `last seen ${peer.lastSeen}` : "offline"}
                </span>
              )}
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
              <span className="text-slate-500 dark:text-slate-400 text-[10px] hidden sm:inline">
                {peer.dept}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── WhatsApp Right Actions (Calls, Search, Resources, Info) ───── */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        
        {/* Video Call Simulation */}
        <button
          type="button"
          onClick={() => onStartCall?.("video")}
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Video Call"
        >
          <Video size={17} />
        </button>

        {/* Audio Call Simulation */}
        <button
          type="button"
          onClick={() => onStartCall?.("audio")}
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Voice Call"
        >
          <Phone size={16} />
        </button>

        {/* In-Chat Search Trigger */}
        <button
          type="button"
          onClick={onSearchInChat}
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Search in Conversation"
        >
          <Search size={16} />
        </button>

        {/* 256-bit Encrypted Session Tag */}
        <div className="hidden xl:flex items-center gap-1.5 rounded-full border border-[#1E90FF]/25 bg-[#1E90FF]/5 px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
          <Shield size={11} className="text-[#1E90FF]" />
          <span>256-bit Encrypted</span>
        </div>

        {/* Share Resource Shortcut */}
        <Link
          to="/resources"
          className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-[#1E90FF] transition-colors"
          title="Campus Vault Resources"
        >
          <FolderOpen size={13} />
          <span className="hidden lg:inline">Vault</span>
        </Link>

        {/* Enlarge / Full Screen Subpage Toggle */}
        {onToggleEnlarge && (
          <button
            type="button"
            onClick={onToggleEnlarge}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isEnlarged
                ? "bg-[#1E90FF]/15 text-[#1E90FF] ring-1 ring-[#1E90FF]/40 hover:bg-[#1E90FF]/25 shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
            title={isEnlarged ? "Restore View (Show Sidebars) [Esc]" : "Enlarge Subpage (Hide Sidebars)"}
          >
            {isEnlarged ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        )}

        {/* Info Drawer Toggle Button */}
        <button
          type="button"
          onClick={onOpenContactInfo}
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Contact Info"
        >
          <MoreVertical size={17} />
        </button>

      </div>
    </header>
  );
}

export default ConversationHeader;
