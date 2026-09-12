import React, { useState, useRef, useEffect } from "react";
import {
  ShieldCheck,
  Shield,
  ArrowLeft,
  MoreVertical,
  Phone,
  Video,
  Search,
  Info,
  CheckSquare,
  BellOff,
  Bell,
  Timer,
  Lock,
  Unlock,
  Heart,
  ListPlus,
  Download,
  XCircle,
  Link as LinkIcon,
  Calendar,
  Users,
  ThumbsDown,
  Ban,
  MinusCircle,
  Trash2,
  ChevronRight,
  X,
  Clock,
  AlertTriangle,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToastStore } from "../../store/toast.store";

export interface ActivePeer {
  id: string;
  name: string;
  roll: string;
  dept: string;
  isOnline: boolean;
  lastSeen?: string;
  avatar?: string;
}

export interface ConversationHeaderProps {
  peer: ActivePeer;
  onBack?: () => void;
  onOpenContactInfo?: () => void;
  onStartCall?: (type: "audio" | "video") => void;
  onSearchInChat?: () => void;
  isPeerTyping?: boolean;
  isEnlarged?: boolean;
  onToggleEnlarge?: () => void;

  // 17-item menu actions
  onSelectMessagesMode?: () => void;
  onExportChat?: () => void;
  onCloseChat?: () => void;
  onClearChat?: () => void;
  onDeleteChat?: () => void;
  onBlockPeer?: () => void;
  onReportPeer?: (reason: string, details?: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  isLocked?: boolean;
  onToggleLock?: () => void;
  isMuted?: boolean;
  onMute?: (duration: string) => void;
  onDisappearingMessages?: (timer: string) => void;
  onScheduleCall?: (details: { title: string; date: string; time: string; type: "audio" | "video" }) => void;
}

export function ConversationHeader({
  peer,
  onBack,
  onOpenContactInfo,
  onStartCall,
  onSearchInChat,
  isPeerTyping = false,
  isEnlarged = false,
  onToggleEnlarge,
  onSelectMessagesMode,
  onExportChat,
  onCloseChat,
  onClearChat,
  onDeleteChat,
  onBlockPeer,
  onReportPeer,
  isFavorite = false,
  onToggleFavorite,
  isLocked = false,
  onToggleLock,
  isMuted = false,
  onMute,
  onDisappearingMessages,
  onScheduleCall
}: ConversationHeaderProps) {
  const { addToast } = useToastStore();

  // Menu popover & submenus state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<"mute" | "list" | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Modals state
  const [isDisappearingModalOpen, setIsDisappearingModalOpen] = useState(false);
  const [selectedDisappearingTimer, setSelectedDisappearingTimer] = useState("Off");

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleTitle, setScheduleTitle] = useState("Study Session with " + peer.name);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("18:00");
  const [scheduleType, setScheduleType] = useState<"audio" | "video">("video");

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Spam");
  const [reportDetails, setReportDetails] = useState("");

  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
        setActiveSubmenu(null);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const closeAllMenus = () => {
    setIsMenuOpen(false);
    setActiveSubmenu(null);
  };

  // 1. Contact info
  const handleContactInfo = () => {
    closeAllMenus();
    onOpenContactInfo?.();
  };

  // 2. Search
  const handleSearch = () => {
    closeAllMenus();
    onSearchInChat?.();
  };

  // 3. Select messages
  const handleSelectMessages = () => {
    closeAllMenus();
    onSelectMessagesMode?.();
    addToast("Select messages mode enabled", "info");
  };

  // 4. Mute notifications
  const handleSelectMute = (duration: string) => {
    closeAllMenus();
    onMute?.(duration);
    addToast(
      duration === "unmute"
        ? `Unmuted notifications for ${peer.name}`
        : `Muted notifications for ${duration}`,
      "success"
    );
  };

  // 5. Disappearing messages
  const handleApplyDisappearing = () => {
    setIsDisappearingModalOpen(false);
    onDisappearingMessages?.(selectedDisappearingTimer);
    addToast(
      selectedDisappearingTimer === "Off"
        ? "Disappearing messages turned off"
        : `Disappearing messages set to ${selectedDisappearingTimer}`,
      "success"
    );
  };

  // 6. Lock chat
  const handleToggleLockChat = () => {
    closeAllMenus();
    onToggleLock?.();
    addToast(
      isLocked
        ? `Chat with ${peer.name} unlocked`
        : `Chat with ${peer.name} locked`,
      "success"
    );
  };

  // 7. Add to favourites
  const handleToggleFav = () => {
    closeAllMenus();
    onToggleFavorite?.();
    addToast(
      isFavorite
        ? `Removed ${peer.name} from favourites`
        : `Added ${peer.name} to favourites`,
      "success"
    );
  };

  // 8. Add to list
  const handleAddToList = (listName: string) => {
    closeAllMenus();
    addToast(`Added ${peer.name} to "${listName}" list`, "success");
  };

  // 9. Export chat
  const handleExport = () => {
    closeAllMenus();
    onExportChat?.();
  };

  // 10. Close chat
  const handleClose = () => {
    closeAllMenus();
    onCloseChat?.();
  };

  // 11. Send call link
  const handleSendCallLink = () => {
    closeAllMenus();
    const callUrl = `${window.location.origin}/chat?call=room-${peer.id}`;
    navigator.clipboard.writeText(callUrl);
    addToast("Call link copied to clipboard! Share it with classmates to connect.", "success");
  };

  // 12. Schedule call
  const handleConfirmSchedule = () => {
    setIsScheduleModalOpen(false);
    onScheduleCall?.({
      title: scheduleTitle,
      date: scheduleDate || new Date().toISOString().split("T")[0],
      time: scheduleTime,
      type: scheduleType
    });
    addToast(`Call scheduled for ${scheduleDate || "today"} at ${scheduleTime}`, "success");
  };

  // 13. New group call
  const handleNewGroupCall = () => {
    closeAllMenus();
    onStartCall?.("video");
    addToast(`Starting group call with ${peer.name} and study circle peers...`, "info");
  };

  // 14. Report
  const handleSubmitReport = () => {
    setIsReportModalOpen(false);
    onReportPeer?.(reportReason, reportDetails);
    addToast("Thank you. Your report has been submitted to Campus Moderation.", "success");
  };

  // 15. Block
  const handleConfirmBlock = () => {
    setIsBlockModalOpen(false);
    onBlockPeer?.();
    addToast(`${peer.name} has been blocked`, "warning");
  };

  // 16. Clear chat
  const handleConfirmClear = () => {
    setIsClearModalOpen(false);
    onClearChat?.();
    addToast("Chat history cleared", "info");
  };

  // 17. Delete chat
  const handleConfirmDelete = () => {
    setIsDeleteModalOpen(false);
    onDeleteChat?.();
    addToast(`Chat with ${peer.name} deleted`, "warning");
  };

  return (
    <>
      <header className="h-16 shrink-0 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#111b21]/95 backdrop-blur-xl px-3 sm:px-5 flex items-center justify-between gap-2 z-30 transition-colors">
        
        {/* ── Left: Peer Identity ─────────────────────────────────────── */}
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

          {/* Clickable Identity Container (opens Contact Info) */}
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
                className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-[#111b21] ${
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
                {isFavorite && (
                  <Heart size={12} className="text-rose-500 fill-rose-500 shrink-0" />
                )}
                {isLocked && (
                  <Lock size={12} className="text-amber-500 shrink-0" />
                )}
                {isMuted && (
                  <BellOff size={12} className="text-slate-400 shrink-0" />
                )}
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

        {/* ── Right Actions (Calls, Search, Resources, Menu) ───────────── */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          
          {/* Video Call */}
          <button
            type="button"
            onClick={() => onStartCall?.("video")}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Video Call"
          >
            <Video size={18} />
          </button>

          {/* Audio Call */}
          <button
            type="button"
            onClick={() => onStartCall?.("audio")}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Voice Call"
          >
            <Phone size={17} />
          </button>

          {/* Search */}
          <button
            type="button"
            onClick={onSearchInChat}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Search in Conversation"
          >
            <Search size={18} />
          </button>

          {/* ── 17-Item Three-Dots Dropdown Trigger ───────────────────── */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen((prev) => !prev);
                setActiveSubmenu(null);
              }}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isMenuOpen
                  ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white"
                  : "text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              title="Menu"
            >
              <MoreVertical size={18} />
            </button>

            {/* Dropdown Menu Container */}
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-12 z-50 w-64 max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#182229] shadow-2xl py-1.5 text-xs text-slate-700 dark:text-slate-200 backdrop-blur-xl scrollbar-none"
                >
                  
                  {/* ── Group 1: General Actions ── */}
                  <div className="py-1">
                    {/* 1. Contact info */}
                    <button
                      type="button"
                      onClick={handleContactInfo}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-100 dark:hover:bg-[#111b21] transition-colors cursor-pointer text-left"
                    >
                      <Info size={16} className="text-slate-400 dark:text-slate-400 shrink-0" />
                      <span className="font-medium">Contact info</span>
                    </button>

                    {/* 2. Search */}
                    <button
                      type="button"
                      onClick={handleSearch}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-100 dark:hover:bg-[#111b21] transition-colors cursor-pointer text-left"
                    >
                      <Search size={16} className="text-slate-400 dark:text-slate-400 shrink-0" />
                      <span className="font-medium">Search</span>
                    </button>

                    {/* 3. Select messages */}
                    <button
                      type="button"
                      onClick={handleSelectMessages}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-100 dark:hover:bg-[#111b21] transition-colors cursor-pointer text-left"
                    >
                      <CheckSquare size={16} className="text-slate-400 dark:text-slate-400 shrink-0" />
                      <span className="font-medium">Select messages</span>
                    </button>

                    {/* 4. Mute notifications (with flyout submenu) */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setActiveSubmenu(activeSubmenu === "mute" ? null : "mute")}
                        onMouseEnter={() => setActiveSubmenu("mute")}
                        className="w-full flex items-center justify-between px-4 py-2 hover:bg-slate-100 dark:hover:bg-[#111b21] transition-colors cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-3">
                          <BellOff size={16} className="text-slate-400 dark:text-slate-400 shrink-0" />
                          <span className="font-medium">Mute notifications</span>
                        </div>
                        <ChevronRight size={14} className="text-slate-400" />
                      </button>

                      {/* Mute Flyout */}
                      {activeSubmenu === "mute" && (
                        <div className="sm:absolute sm:right-full sm:top-0 sm:mr-1 w-full sm:w-44 bg-slate-50 dark:bg-[#111b21] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1 z-60">
                          <button
                            type="button"
                            onClick={() => handleSelectMute("8 hours")}
                            className="w-full text-left px-3.5 py-1.5 hover:bg-slate-200/70 dark:hover:bg-[#182229] transition-colors"
                          >
                            8 hours
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectMute("1 week")}
                            className="w-full text-left px-3.5 py-1.5 hover:bg-slate-200/70 dark:hover:bg-[#182229] transition-colors"
                          >
                            1 week
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectMute("Always")}
                            className="w-full text-left px-3.5 py-1.5 hover:bg-slate-200/70 dark:hover:bg-[#182229] transition-colors"
                          >
                            Always
                          </button>
                          {isMuted && (
                            <button
                              type="button"
                              onClick={() => handleSelectMute("unmute")}
                              className="w-full text-left px-3.5 py-1.5 hover:bg-slate-200/70 dark:hover:bg-[#182229] text-[#1E90FF] font-semibold border-t border-slate-200 dark:border-slate-800 transition-colors"
                            >
                              Unmute
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 5. Disappearing messages */}
                    <button
                      type="button"
                      onClick={() => {
                        closeAllMenus();
                        setIsDisappearingModalOpen(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-100 dark:hover:bg-[#111b21] transition-colors cursor-pointer text-left"
                    >
                      <Timer size={16} className="text-slate-400 dark:text-slate-400 shrink-0" />
                      <span className="font-medium">Disappearing messages</span>
                    </button>

                    {/* 6. Lock chat */}
                    <button
                      type="button"
                      onClick={handleToggleLockChat}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-100 dark:hover:bg-[#111b21] transition-colors cursor-pointer text-left"
                    >
                      {isLocked ? (
                        <Unlock size={16} className="text-amber-500 shrink-0" />
                      ) : (
                        <Lock size={16} className="text-slate-400 dark:text-slate-400 shrink-0" />
                      )}
                      <span className="font-medium">{isLocked ? "Unlock chat" : "Lock chat"}</span>
                    </button>

                    {/* 7. Add to favourites */}
                    <button
                      type="button"
                      onClick={handleToggleFav}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-100 dark:hover:bg-[#111b21] transition-colors cursor-pointer text-left"
                    >
                      <Heart
                        size={16}
                        className={`shrink-0 ${
                          isFavorite ? "text-rose-500 fill-rose-500" : "text-slate-400 dark:text-slate-400"
                        }`}
                      />
                      <span className="font-medium">
                        {isFavorite ? "Remove from favourites" : "Add to favourites"}
                      </span>
                    </button>

                    {/* 8. Add to list (with flyout) */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setActiveSubmenu(activeSubmenu === "list" ? null : "list")}
                        onMouseEnter={() => setActiveSubmenu("list")}
                        className="w-full flex items-center justify-between px-4 py-2 hover:bg-slate-100 dark:hover:bg-[#111b21] transition-colors cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-3">
                          <ListPlus size={16} className="text-slate-400 dark:text-slate-400 shrink-0" />
                          <span className="font-medium">Add to list</span>
                        </div>
                        <ChevronRight size={14} className="text-slate-400" />
                      </button>

                      {/* List Flyout */}
                      {activeSubmenu === "list" && (
                        <div className="sm:absolute sm:right-full sm:top-0 sm:mr-1 w-full sm:w-44 bg-slate-50 dark:bg-[#111b21] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1 z-60">
                          {["Campus Friends", "Study Group", "Classmates", "Project Team"].map((lst) => (
                            <button
                              key={lst}
                              type="button"
                              onClick={() => handleAddToList(lst)}
                              className="w-full text-left px-3.5 py-1.5 hover:bg-slate-200/70 dark:hover:bg-[#182229] transition-colors"
                            >
                              {lst}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 9. Export chat */}
                    <button
                      type="button"
                      onClick={handleExport}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-100 dark:hover:bg-[#111b21] transition-colors cursor-pointer text-left"
                    >
                      <Download size={16} className="text-slate-400 dark:text-slate-400 shrink-0" />
                      <span className="font-medium">Export chat</span>
                    </button>

                    {/* 10. Close chat */}
                    <button
                      type="button"
                      onClick={handleClose}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-100 dark:hover:bg-[#111b21] transition-colors cursor-pointer text-left"
                    >
                      <XCircle size={16} className="text-slate-400 dark:text-slate-400 shrink-0" />
                      <span className="font-medium">Close chat</span>
                    </button>
                  </div>

                  {/* ── Divider ── */}
                  <div className="h-px bg-slate-200 dark:bg-slate-800/80 my-1" />

                  {/* ── Group 2: Call Actions ── */}
                  <div className="py-1">
                    {/* 11. Send call link */}
                    <button
                      type="button"
                      onClick={handleSendCallLink}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-100 dark:hover:bg-[#111b21] transition-colors cursor-pointer text-left"
                    >
                      <LinkIcon size={16} className="text-slate-400 dark:text-slate-400 shrink-0" />
                      <span className="font-medium">Send call link</span>
                    </button>

                    {/* 12. Schedule call */}
                    <button
                      type="button"
                      onClick={() => {
                        closeAllMenus();
                        setIsScheduleModalOpen(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-100 dark:hover:bg-[#111b21] transition-colors cursor-pointer text-left"
                    >
                      <Calendar size={16} className="text-slate-400 dark:text-slate-400 shrink-0" />
                      <span className="font-medium">Schedule call</span>
                    </button>

                    {/* 13. New group call */}
                    <button
                      type="button"
                      onClick={handleNewGroupCall}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-100 dark:hover:bg-[#111b21] transition-colors cursor-pointer text-left"
                    >
                      <Users size={16} className="text-slate-400 dark:text-slate-400 shrink-0" />
                      <span className="font-medium">New group call</span>
                    </button>
                  </div>

                  {/* ── Divider ── */}
                  <div className="h-px bg-slate-200 dark:bg-slate-800/80 my-1" />

                  {/* ── Group 3: Moderation & Destructive Actions ── */}
                  <div className="py-1">
                    {/* 14. Report */}
                    <button
                      type="button"
                      onClick={() => {
                        closeAllMenus();
                        setIsReportModalOpen(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-100 dark:hover:bg-[#111b21] transition-colors cursor-pointer text-left"
                    >
                      <ThumbsDown size={16} className="text-slate-400 dark:text-slate-400 shrink-0" />
                      <span className="font-medium">Report</span>
                    </button>

                    {/* 15. Block */}
                    <button
                      type="button"
                      onClick={() => {
                        closeAllMenus();
                        setIsBlockModalOpen(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-100 dark:hover:bg-[#111b21] transition-colors cursor-pointer text-left"
                    >
                      <Ban size={16} className="text-slate-400 dark:text-slate-400 shrink-0" />
                      <span className="font-medium">Block</span>
                    </button>

                    {/* 16. Clear chat */}
                    <button
                      type="button"
                      onClick={() => {
                        closeAllMenus();
                        setIsClearModalOpen(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-100 dark:hover:bg-[#111b21] transition-colors cursor-pointer text-left"
                    >
                      <MinusCircle size={16} className="text-slate-400 dark:text-slate-400 shrink-0" />
                      <span className="font-medium">Clear chat</span>
                    </button>

                    {/* 17. Delete chat */}
                    <button
                      type="button"
                      onClick={() => {
                        closeAllMenus();
                        setIsDeleteModalOpen(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-rose-500/10 text-rose-500 hover:text-rose-600 transition-colors cursor-pointer text-left"
                    >
                      <Trash2 size={16} className="shrink-0" />
                      <span className="font-medium">Delete chat</span>
                    </button>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </header>

      {/* ── MODALS FOR MENU ACTIONS ──────────────────────────────────── */}

      {/* 1. Disappearing Messages Modal */}
      <AnimatePresence>
        {isDisappearingModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#182229] p-6 shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#1E90FF]/10 text-[#1E90FF]">
                    <Timer size={20} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Disappearing Messages
                  </h3>
                </div>
                <button
                  onClick={() => setIsDisappearingModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                For more privacy and storage, new messages in this chat will disappear after the selected duration.
              </p>

              <div className="space-y-2 mb-6">
                {["24 hours", "7 days", "90 days", "Off"].map((t) => (
                  <label
                    key={t}
                    onClick={() => setSelectedDisappearingTimer(t)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedDisappearingTimer === t
                        ? "border-[#1E90FF] bg-[#1E90FF]/10 text-[#1E90FF] font-bold"
                        : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#111b21]"
                    }`}
                  >
                    <span className="text-xs">{t}</span>
                    {selectedDisappearingTimer === t && <Check size={16} />}
                  </label>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsDisappearingModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyDisappearing}
                  className="flex-1 py-2.5 rounded-xl bg-[#1E90FF] text-white text-xs font-bold hover:bg-[#187bcd]"
                >
                  Apply
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Schedule Call Modal */}
      <AnimatePresence>
        {isScheduleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#182229] p-6 shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#1E90FF]/10 text-[#1E90FF]">
                    <Calendar size={20} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Schedule Study Call
                  </h3>
                </div>
                <button
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 mb-6">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Call Topic
                  </label>
                  <input
                    type="text"
                    value={scheduleTitle}
                    onChange={(e) => setScheduleTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#111b21] px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#1E90FF]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#111b21] px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#1E90FF]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#111b21] px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#1E90FF]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Call Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setScheduleType("video")}
                      className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        scheduleType === "video"
                          ? "border-[#1E90FF] bg-[#1E90FF]/10 text-[#1E90FF]"
                          : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <Video size={14} />
                      <span>Video Call</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleType("audio")}
                      className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        scheduleType === "audio"
                          ? "border-[#1E90FF] bg-[#1E90FF]/10 text-[#1E90FF]"
                          : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <Phone size={14} />
                      <span>Voice Call</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSchedule}
                  className="flex-1 py-2.5 rounded-xl bg-[#1E90FF] text-white text-xs font-bold hover:bg-[#187bcd]"
                >
                  Schedule
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Report Contact Modal */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#182229] p-6 shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-rose-500">
                  <div className="p-2 rounded-xl bg-rose-500/10">
                    <ThumbsDown size={20} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Report {peer.name}
                  </h3>
                </div>
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                Reports are sent directly to campus moderators. The last 5 messages from this chat will be forwarded.
              </p>

              <div className="space-y-2 mb-4">
                {[
                  "Spam or unwanted advertising",
                  "Harassment or bullying",
                  "Academic dishonesty / exam leakage",
                  "Inappropriate content or media"
                ].map((reason) => (
                  <label
                    key={reason}
                    onClick={() => setReportReason(reason)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer text-xs ${
                      reportReason === reason
                        ? "border-rose-500 bg-rose-500/10 text-rose-500 font-bold"
                        : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <span>{reason}</span>
                    {reportReason === reason && <Check size={14} />}
                  </label>
                ))}
              </div>

              <textarea
                placeholder="Additional details (optional)..."
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#111b21] p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none mb-4"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitReport}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
                >
                  Submit Report
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Block Confirmation Modal */}
      <AnimatePresence>
        {isBlockModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#182229] p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center"
            >
              <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
                <Ban size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                Block {peer.name}?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                Blocked contacts will no longer be able to call you or send you messages. They won't know they've been blocked.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsBlockModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBlock}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
                >
                  Block
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Clear Chat Confirmation Modal */}
      <AnimatePresence>
        {isClearModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#182229] p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center"
            >
              <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
                <MinusCircle size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                Clear this chat?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                Are you sure you want to clear messages in this chat? All messages and attachments will be removed from your view.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsClearModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClear}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700"
                >
                  Clear Chat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. Delete Chat Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#182229] p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center"
            >
              <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                Delete chat with {peer.name}?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                This will delete the entire conversation, remove it from your chats list, and cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
                >
                  Delete Chat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default ConversationHeader;
