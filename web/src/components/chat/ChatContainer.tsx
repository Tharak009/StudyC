import React, { useRef, useEffect, useState, useMemo } from "react";
import {
  Hash,
  Bell,
  Coffee,
  Radio,
  Shield,
  ShieldCheck,
  MessageSquare,
  Bookmark,
  Users,
  Sparkles,
  ArrowDown,
  Lock,
  Unlock
} from "lucide-react";
import type { Channel, ChatMessage } from "../../types/chat";
import { useChatStore } from "../../store/chat.store";
import { MessageItem } from "./MessageItem";
import { ChatInput } from "./ChatInput";
import { SprintWidget } from "../study-circles/SprintWidget";
import { socketService } from "../../services/socket.service";

interface ChatContainerProps {
  community: {
    _id: string;
    name: string;
  };
  channel: Channel;
  currentUserId?: string;
  currentUserName?: string;
  isModeratorOrAdmin?: boolean;
  onSendMessage: (
    content: string,
    codeSnippet?: { language: string; code: string; title?: string },
    files?: File[],
    poll?: any,
    voiceNote?: any,
    intent?: "chat" | "question" | "solution" | "code"
  ) => void;
  onReact?: (messageId: string, emoji: string, category?: "STANDARD" | "CAMPUS_CUSTOM") => void;
  onDeleteForMe?: (messageId: string) => void;
  onDeleteForEveryone?: (messageId: string) => void;
  onOpenLockModal?: () => void;
  className?: string;
}

// ── Helper: Date Separator Formatter ─────────────────────────────────────────
const formatDateSeparator = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return "Today";
    }
    if (d.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric"
    });
  } catch {
    return "Recent";
  }
};

export const ChatContainer: React.FC<ChatContainerProps> = ({
  community,
  channel,
  currentUserId,
  currentUserName = "Student",
  isModeratorOrAdmin = false,
  onSendMessage,
  onReact,
  onDeleteForMe,
  onDeleteForEveryone,
  onOpenLockModal,
  className = ""
}) => {
  const {
    messages,
    inspectorMode,
    setInspectorMode,
    typingUsers,
    updateMessagePin,
    markMessageAccepted,
    openThread
  } = useChatStore();

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [replyTarget, setReplyTarget] = useState<{ senderName: string; content: string } | null>(
    null
  );

  // Group messages by date for sticky frosted date separators
  const groupedMessages = useMemo(() => {
    const groups: Array<{ dateLabel: string; items: ChatMessage[] }> = [];
    let currentDateLabel = "";
    let currentGroup: ChatMessage[] = [];

    messages
      .filter((msg) => !currentUserId || !msg.deletedFor?.includes(currentUserId))
      .forEach((msg) => {
        const label = formatDateSeparator(msg.createdAt);
        if (label !== currentDateLabel) {
          if (currentGroup.length > 0) {
            groups.push({ dateLabel: currentDateLabel, items: currentGroup });
          }
          currentDateLabel = label;
          currentGroup = [msg];
        } else {
          currentGroup.push(msg);
        }
      });

    if (currentGroup.length > 0) {
      groups.push({ dateLabel: currentDateLabel, items: currentGroup });
    }

    return groups;
  }, [messages, currentUserId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (!showScrollBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, showScrollBottom]);

  // Detect scroll position to show jump-to-bottom button
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const isFarFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight > 200;
    setShowScrollBottom(isFarFromBottom);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Socket reaction handler
  const handleReact = (messageId: string, emoji: string) => {
    const socket = socketService.get();
    if (socket) {
      socket.emit("chat:reaction", {
        messageId,
        communityId: community._id,
        channelId: channel._id || channel.name,
        emoji
      });
    }
  };

  // Socket pin handler
  const handlePin = (messageId: string, isPinned: boolean) => {
    updateMessagePin(messageId, isPinned);
    const socket = socketService.get();
    if (socket) {
      socket.emit("chat:pinMessage", {
        messageId,
        communityId: community._id,
        isPinned
      });
    }
  };

  // Socket accepted solution handler (+25 Karma)
  const handleMarkSolution = (messageId: string) => {
    markMessageAccepted(messageId);
    const socket = socketService.get();
    if (socket) {
      socket.emit("chat:markSolution", {
        messageId,
        communityId: community._id
      });
    }
  };

  const channelIcon = useMemo(() => {
    if (channel.type === "voice" || channel.category === "stages") {
      return <Radio className="w-4 h-4 text-cyan-500" />;
    }
    if (channel.type === "announcement" || channel.category === "announcements") {
      return <Bell className="w-4 h-4 text-amber-500" />;
    }
    if (channel.category === "watercooler") {
      return <Coffee className="w-4 h-4 text-amber-500" />;
    }
    return <Hash className="w-4 h-4 text-[#1E90FF]" />;
  }, [channel]);

  return (
    <div className={`flex-1 flex flex-col bg-slate-50/50 dark:bg-[#080D1A] h-full overflow-hidden text-slate-900 dark:text-slate-100 transition-colors duration-200 ${className}`}>
      {/* ── Frosted Channel Lock Banner (if channel is locked) ── */}
      {channel.isLocked && (
        <div className="w-full bg-gradient-to-r from-amber-500/15 via-amber-500/20 to-orange-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between gap-3 text-xs text-amber-300 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2 truncate">
            <Lock size={14} className="text-amber-400 shrink-0 animate-pulse" />
            <span className="font-bold text-amber-200">Channel Locked:</span>
            <span className="truncate text-amber-100">
              {channel.lockedReason || "Read-only mode activated by moderator"}
            </span>
          </div>
          {isModeratorOrAdmin && onOpenLockModal && (
            <button
              onClick={onOpenLockModal}
              className="text-[11px] font-bold text-amber-300 hover:text-white underline shrink-0 cursor-pointer"
            >
              Unlock Channel
            </button>
          )}
        </div>
      )}

      {/* ── Frosted Ambient Header ── */}
      <div className="h-14 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0B1324]/80 backdrop-blur-xl px-4 flex items-center justify-between z-10 select-none">
        {/* Channel Details */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white text-sm tracking-wide">
            {channelIcon}
            <span className="truncate max-w-[180px]">{channel.name}</span>
          </div>

          {/* Strict Study Mode Shield */}
          {channel.isStrictStudyMode !== false && (
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold"
              title="Strict Study Mode Active: Messages must be relevant to academic topics."
            >
              <ShieldCheck className="w-3 h-3" />
              <span>Strict Focus</span>
            </div>
          )}

          {channel.topic && (
            <>
              <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-800 hidden md:block" />
              <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[280px] hidden md:block">
                {channel.topic}
              </span>
            </>
          )}
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2">
          {/* Study Sprint Pomodoro Launcher */}
          <SprintWidget
            communityId={community._id}
            channelId={channel._id || channel.name}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
          />

          {/* Moderator Channel Lock / Unlock Trigger */}
          {isModeratorOrAdmin && onOpenLockModal && (
            <button
              onClick={onOpenLockModal}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                channel.isLocked
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold"
                  : "text-slate-500 dark:text-slate-400 hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-[#162544]"
              }`}
              title={channel.isLocked ? "Unlock Channel" : "Lock Channel (Read-Only Mode)"}
            >
              {channel.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </button>
          )}

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

          {/* Inspector Mode Toggles */}
          <button
            onClick={() => setInspectorMode(inspectorMode === "thread" ? "closed" : "thread")}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              inspectorMode === "thread"
                ? "bg-[#1E90FF]/15 dark:bg-[#1E90FF]/25 text-[#1E90FF] border border-[#1E90FF]/30 font-semibold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#162544]"
            }`}
            title="Threads & Discussions"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          <button
            onClick={() => setInspectorMode(inspectorMode === "vault" ? "closed" : "vault")}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              inspectorMode === "vault"
                ? "bg-[#1E90FF]/15 dark:bg-[#1E90FF]/25 text-[#1E90FF] border border-[#1E90FF]/30 font-semibold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#162544]"
            }`}
            title="Shared Vault (Pinned & Code)"
          >
            <Bookmark className="w-4 h-4" />
          </button>

          <button
            onClick={() => setInspectorMode(inspectorMode === "roster" ? "closed" : "roster")}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              inspectorMode === "roster"
                ? "bg-[#1E90FF]/15 dark:bg-[#1E90FF]/25 text-[#1E90FF] border border-[#1E90FF]/30 font-semibold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#162544]"
            }`}
            title="Roster & Online Scholars"
          >
            <Users className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Virtualized / Smooth Scroll Message Feed ── */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-2 py-4 space-y-4 no-scrollbar relative"
      >
        {/* Welcome Channel Banner */}
        <div className="px-4 py-6 border-b border-slate-200/80 dark:border-slate-800/80 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-xl shadow-lg shadow-blue-500/20 mb-3">
            {channelIcon}
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-wide">
            Welcome to #{channel.name}!
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-lg leading-relaxed">
            {channel.topic ||
              "This is the start of the study channel. Collaborate on problem sets, ask questions with math formulas ($...$), and share code snippets."}
          </p>
          {channel.isStrictStudyMode !== false && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>
                Strict Study Mode is active. Keep discussions focused on academic coursework and problem solving.
              </span>
            </div>
          )}
        </div>

        {/* Message Stream with Sticky Frosted Date Separators */}
        {groupedMessages.map((group) => (
          <div key={group.dateLabel} className="space-y-1">
            {/* Sticky Frosted Date Separator */}
            <div className="sticky top-2 z-10 flex items-center justify-center my-3 select-none">
              <div className="px-3 py-1 rounded-full bg-white/90 dark:bg-[#0B1324]/90 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md shadow-xs text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                {group.dateLabel}
              </div>
            </div>

            {/* Messages in Group */}
            {group.items.map((msg) => (
              <MessageItem
                key={msg._id}
                message={msg}
                currentUserId={currentUserId}
                onReact={onReact || handleReact}
                onPin={handlePin}
                onMarkSolution={handleMarkSolution}
                onDeleteForMe={onDeleteForMe}
                onDeleteForEveryone={onDeleteForEveryone}
                isModeratorOrAdmin={isModeratorOrAdmin}
                onReplyInThread={(m) => {
                  openThread(m);
                  setInspectorMode("thread");
                }}
              />
            ))}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Scroll to Bottom Floating Pill ── */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-24 right-8 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-xl shadow-[#1E90FF]/30 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          <span>Latest Messages</span>
        </button>
      )}

      {/* ── Chat Input Suite (Slack / Discord Grade) ── */}
      <div className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0B1324]/80 backdrop-blur-md">
        <ChatInput
          channelName={channel.name}
          onSendMessage={onSendMessage}
          replyTarget={replyTarget}
          onCancelReply={() => setReplyTarget(null)}
          typingUsers={typingUsers.map((u) => u.name)}
          isLocked={channel.isLocked}
          lockedReason={channel.lockedReason}
          isModeratorOrAdmin={isModeratorOrAdmin}
        />
      </div>
    </div>
  );
};
