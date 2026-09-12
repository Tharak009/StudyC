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
  ChevronDown,
  Sparkles,
  ArrowDown
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
  onSendMessage: (
    content: string,
    codeSnippet?: { language: string; code: string; title?: string },
    files?: File[],
    poll?: any,
    voiceNote?: any,
    intent?: "chat" | "question" | "solution" | "code"
  ) => void;
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
  onSendMessage,
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

    messages.forEach((msg) => {
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
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!showScrollBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, showScrollBottom]);

  // Detect scroll position to show jump-to-bottom button
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isFarFromBottom = scrollHeight - scrollTop - clientHeight > 250;
    setShowScrollBottom(isFarFromBottom);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollBottom(false);
  };

  // Socket reaction handler
  const handleReact = (messageId: string, emoji: string) => {
    const socket = socketService.get();
    socket?.emit("chat:reaction", {
      messageId,
      communityId: community._id,
      emoji
    });
  };

  // Socket pin handler
  const handlePin = (messageId: string, isPinned: boolean) => {
    const socket = socketService.get();
    socket?.emit(
      "chat:pinMessage",
      {
        communityId: community._id,
        channelId: channel._id || channel.name,
        messageId,
        isPinned
      },
      (res: any) => {
        if (res?.success) {
          updateMessagePin(messageId, isPinned);
        }
      }
    );
  };

  // Socket accepted solution handler (+25 Karma)
  const handleMarkSolution = (messageId: string) => {
    const socket = socketService.get();
    socket?.emit(
      "chat:markAcceptedSolution",
      {
        communityId: community._id,
        channelId: channel._id || channel.name,
        messageId
      },
      (res: any) => {
        if (res?.success) {
          markMessageAccepted(messageId, 25);
        }
      }
    );
  };

  const channelIcon = useMemo(() => {
    if (channel.type === "voice" || channel.category === "stages") {
      return <Radio className="w-4 h-4 text-cyan-400" />;
    }
    if (channel.type === "announcement" || channel.category === "announcements") {
      return <Bell className="w-4 h-4 text-amber-400" />;
    }
    if (channel.category === "watercooler") {
      return <Coffee className="w-4 h-4 text-amber-400" />;
    }
    return <Hash className="w-4 h-4 text-blue-400" />;
  }, [channel]);

  return (
    <div className={`flex-1 flex flex-col bg-[#080D1A] h-full overflow-hidden ${className}`}>
      {/* ── Frosted Ambient Header (Discord / Slack Grade) ── */}
      <div className="h-14 border-b border-[#162544] bg-[#0B132B]/80 backdrop-blur-xl px-4 flex items-center justify-between z-10 select-none">
        {/* Channel Details */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 font-bold text-white text-sm tracking-wide">
            {channelIcon}
            <span className="truncate max-w-[180px]">{channel.name}</span>
          </div>

          {/* Strict Study Mode Shield */}
          {channel.isStrictStudyMode !== false && (
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold"
              title="Strict Study Mode Active: Messages must be relevant to academic topics."
            >
              <ShieldCheck className="w-3 h-3" />
              <span>Strict Focus</span>
            </div>
          )}

          {channel.topic && (
            <>
              <div className="h-3.5 w-px bg-[#162544] hidden md:block" />
              <span className="text-xs text-gray-400 truncate max-w-[280px] hidden md:block">
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

          <div className="h-4 w-px bg-[#162544] mx-1" />

          {/* Inspector Mode Toggles */}
          <button
            onClick={() => setInspectorMode(inspectorMode === "thread" ? "closed" : "thread")}
            className={`p-2 rounded-xl transition-all ${
              inspectorMode === "thread"
                ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                : "text-gray-400 hover:text-white hover:bg-[#162544]"
            }`}
            title="Threads & Discussions"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          <button
            onClick={() => setInspectorMode(inspectorMode === "vault" ? "closed" : "vault")}
            className={`p-2 rounded-xl transition-all ${
              inspectorMode === "vault"
                ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                : "text-gray-400 hover:text-white hover:bg-[#162544]"
            }`}
            title="Shared Vault (Pinned & Code)"
          >
            <Bookmark className="w-4 h-4" />
          </button>

          <button
            onClick={() => setInspectorMode(inspectorMode === "roster" ? "closed" : "roster")}
            className={`p-2 rounded-xl transition-all ${
              inspectorMode === "roster"
                ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                : "text-gray-400 hover:text-white hover:bg-[#162544]"
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
        <div className="px-4 py-6 border-b border-[#162544]/60 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-xl shadow-lg shadow-blue-500/20 mb-3">
            {channelIcon}
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">
            Welcome to #{channel.name}!
          </h1>
          <p className="text-xs text-gray-400 mt-1 max-w-lg leading-relaxed">
            {channel.topic ||
              "This is the start of the study channel. Collaborate on problem sets, ask questions with math formulas ($...$), and share code snippets."}
          </p>
          {channel.isStrictStudyMode !== false && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
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
              <div className="px-3 py-1 rounded-full bg-[#0B132B]/90 border border-[#162544] backdrop-blur-md shadow-md text-[11px] font-bold tracking-wider text-gray-400 uppercase">
                {group.dateLabel}
              </div>
            </div>

            {/* Messages in Group */}
            {group.items.map((msg) => (
              <MessageItem
                key={msg._id}
                message={msg}
                currentUserId={currentUserId}
                onReact={handleReact}
                onPin={handlePin}
                onMarkSolution={handleMarkSolution}
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
          className="absolute bottom-24 right-8 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xl shadow-blue-900/50 transition-transform hover:scale-105 active:scale-95"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          <span>Latest Messages</span>
        </button>
      )}

      {/* ── Chat Input Suite (Slack / Discord Grade) ── */}
      <div className="border-t border-[#162544] bg-[#0B132B]/60 backdrop-blur-md">
        <ChatInput
          channelName={channel.name}
          onSendMessage={onSendMessage}
          replyTarget={replyTarget}
          onCancelReply={() => setReplyTarget(null)}
          typingUsers={typingUsers.map((u) => u.name)}
        />
      </div>
    </div>
  );
};
