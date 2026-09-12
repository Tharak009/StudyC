import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  MessageSquare,
  Trash2,
  X,
  Star,
  Forward
} from "lucide-react";
import type { User } from "../../types/auth";
import { ChatDoodleWallpaper } from "./ChatDoodleWallpaper";
import { PinnedMessageBanner, type PinnedMessageData } from "./PinnedMessageBanner";
import { DirectMessageItem as DMItemComponent, type DMStreamItemData } from "./DirectMessageItem";
import { useToastStore } from "../../store/toast.store";

export type DirectMessageItem = DMStreamItemData;

interface DirectMessageStreamProps {
  messages: DirectMessageItem[];
  currentUser?: User | null;
  onReply?: (msg: DirectMessageItem) => void;
  onReact?: (messageId: string, emoji: string, category?: "STANDARD" | "CAMPUS_CUSTOM") => void;
  onDeleteForMe?: (messageId: string) => void;
  onDeleteForEveryone?: (messageId: string) => void;
  onRetry?: (msg: DirectMessageItem) => void;
  searchQuery?: string;
  onJumpToMessage?: (messageId: string) => void;
  onEdit?: (msg: DirectMessageItem) => void;
  onForward?: (msg: DirectMessageItem) => void;
  onToggleStar?: (messageId: string, isStarred: boolean) => void;
  onStartSelectionMode?: (initialId?: string) => void;

  // Pinned message banner props
  pinnedMessage?: PinnedMessageData | null;
  onPinMessage?: (msg: DirectMessageItem) => void;
  onUnpinMessage?: () => void;

  // Selection mode props
  isSelectionMode?: boolean;
  selectedMessageIds?: string[];
  onToggleSelectMessage?: (messageId: string) => void;
  onDeleteSelected?: () => void;
  onForwardSelected?: () => void;
  onStarSelected?: () => void;
  onCancelSelection?: () => void;
  onOpenLightbox?: (images: Array<{ url: string; originalName: string; caption?: string }>, initialIndex?: number) => void;
}

const QUICK_EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🙏"];

export function DirectMessageStream({
  messages,
  currentUser,
  onReply,
  onReact,
  onDeleteForMe,
  onDeleteForEveryone,
  onRetry,
  searchQuery = "",
  onJumpToMessage,
  onEdit,
  onForward,
  onToggleStar,
  onStartSelectionMode,
  pinnedMessage,
  onPinMessage,
  onUnpinMessage,
  isSelectionMode = false,
  selectedMessageIds = [],
  onToggleSelectMessage,
  onDeleteSelected,
  onForwardSelected,
  onStarSelected,
  onCancelSelection,
  onOpenLightbox
}: DirectMessageStreamProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);
  const [glowingMessageId, setGlowingMessageId] = useState<string | null>(null);
  const { addToast } = useToastStore();

  useEffect(() => {
    if (!isSelectionMode) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, isSelectionMode]);

  const toggleVoicePlay = (msgId: string) => {
    setPlayingVoiceId((prev) => (prev === msgId ? null : msgId));
  };

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippetId(id);
    setTimeout(() => setCopiedSnippetId(null), 2000);
  };

  const handleJumpToPinned = () => {
    if (pinnedMessage?.id && messageRefs.current[pinnedMessage.id]) {
      messageRefs.current[pinnedMessage.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else if (pinnedMessage?.url && pinnedMessage.url !== "#") {
      window.open(pinnedMessage.url, "_blank");
    } else {
      addToast(`Showing pinned item: ${pinnedMessage?.title}`, "info");
    }
  };

  const handleCopySelectedText = () => {
    const selectedMsgs = messages.filter((m) => selectedMessageIds.includes(m.id));
    const formatted = selectedMsgs
      .map((m) => `[${m.time}] ${m.senderName}: ${m.content || "[Attachment]"}`)
      .join("\n");
    navigator.clipboard.writeText(formatted);
    addToast(`${selectedMsgs.length} messages copied to clipboard`, "success");
  };

  const handleJumpToMessage = (messageId: string) => {
    if (onJumpToMessage) {
      onJumpToMessage(messageId);
    }
    const el = messageRefs.current[messageId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setGlowingMessageId(messageId);
      setTimeout(() => setGlowingMessageId(null), 2500);
    } else {
      addToast("Original message is further up in conversation", "info");
    }
  };

  // Group messages by date
  const formatDateLabel = (isoDate: string) => {
    const d = new Date(isoDate);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative bg-[#efeae2] dark:bg-[#0b141a] transition-colors duration-200">
      
      {/* ── WhatsApp Doodle Wallpaper Overlay ───────────────────────── */}
      <ChatDoodleWallpaper />

      {/* ── Pinned Message Banner (matching reference image) ────────── */}
      {pinnedMessage && (
        <PinnedMessageBanner
          pinnedMessage={pinnedMessage}
          onClick={handleJumpToPinned}
          onUnpin={onUnpinMessage}
        />
      )}

      {/* ── Floating Message Selection Action Bar ───────────────────── */}
      <AnimatePresence>
        {isSelectionMode && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-2.5 bg-white/95 dark:bg-[#182229]/95 border-b border-slate-200 dark:border-slate-800 shadow-md backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onCancelSelection}
                className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Cancel selection"
              >
                <X size={18} />
              </button>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {selectedMessageIds.length} selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopySelectedText}
                disabled={selectedMessageIds.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#111b21] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                title="Copy text of selected messages"
              >
                <Copy size={13} />
                <span className="hidden sm:inline">Copy</span>
              </button>

              {onForwardSelected && (
                <button
                  type="button"
                  onClick={onForwardSelected}
                  disabled={selectedMessageIds.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#111b21] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                  title="Forward selected messages"
                >
                  <Forward size={13} />
                  <span className="hidden sm:inline">Forward</span>
                </button>
              )}

              {onStarSelected && (
                <button
                  type="button"
                  onClick={onStarSelected}
                  disabled={selectedMessageIds.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#111b21] text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                  title="Star selected messages"
                >
                  <Star size={13} />
                  <span className="hidden sm:inline">Star</span>
                </button>
              )}

              <button
                type="button"
                onClick={onDeleteSelected}
                disabled={selectedMessageIds.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-xs font-bold disabled:opacity-50 transition-colors"
                title="Delete selected messages"
              >
                <Trash2 size={13} />
                <span className="hidden sm:inline">Delete</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Scrollable Message Stream ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 relative select-text scrollbar-none z-10">
        
        {/* Empty State when no messages in conversation */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[320px] text-center p-8 select-none">
            <div className="h-16 w-16 rounded-3xl bg-[#1E90FF]/10 text-[#1E90FF] border border-[#1E90FF]/20 flex items-center justify-center mb-4 shadow-sm">
              <MessageSquare size={28} className="text-[#1E90FF]" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
              Start of this conversation
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
              Send a message, share lecture notes, or ask questions to collaborate with your classmate.
            </p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isMe =
            msg.senderId === currentUser?._id ||
            msg.senderName === currentUser?.fullName ||
            msg.senderId === "u-me";

          // Show date header if first message or different date from previous
          const prevMsg = messages[idx - 1];
          const showDateSeparator =
            !prevMsg ||
            new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString();

          const isHighlight =
            (searchQuery.trim().length > 1 &&
              msg.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
            glowingMessageId === msg.id;

          const isSelected = selectedMessageIds.includes(msg.id);

          return (
            <React.Fragment key={msg.id}>
              
              {/* ── WhatsApp Date Pill Separator ─────────────────────────── */}
              {showDateSeparator && (
                <div className="flex justify-center my-3 sticky top-2 z-10">
                  <span className="px-3.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-white/90 dark:bg-[#182229]/95 text-slate-600 dark:text-slate-300 shadow-sm border border-slate-200/60 dark:border-slate-800/60 backdrop-blur-md">
                    {formatDateLabel(msg.createdAt)}
                  </span>
                </div>
              )}

              {/* ── Message Row ── */}
              <div
                ref={(el) => {
                  messageRefs.current[msg.id] = el;
                }}
              >
                <DMItemComponent
                  msg={msg}
                  currentUser={currentUser}
                  isMe={isMe}
                  isSelectionMode={isSelectionMode}
                  isSelected={isSelected}
                  isHighlight={isHighlight}
                  onSelect={() => onToggleSelectMessage?.(msg.id)}
                  onReply={onReply}
                  onPin={onPinMessage}
                  onReact={onReact}
                  onDeleteForMe={onDeleteForMe}
                  onDeleteForEveryone={onDeleteForEveryone}
                  onRetry={onRetry}
                  onJumpToMessage={handleJumpToMessage}
                  onEdit={onEdit}
                  onForward={onForward}
                  onToggleStar={onToggleStar}
                  onStartSelectionMode={onStartSelectionMode}
                  onOpenLightbox={onOpenLightbox}
                />
              </div>
            </React.Fragment>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

export default DirectMessageStream;
