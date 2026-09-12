import React, { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  CheckCheck,
  FileText,
  FileCode,
  Download,
  CornerDownRight,
  Reply,
  Copy,
  Pin,
  Trash2,
  Play,
  Pause,
  Mic,
  Plus,
  Clock,
  AlertCircle,
  RotateCw,
  Star,
  CornerUpRight,
  Edit2,
  Forward
} from "lucide-react";
import type { User } from "../../types/auth";
import { EmojiPickerPopover, CAMPUS_STICKERS } from "../chat/EmojiPickerPopover";
import { DeleteMessageModal } from "../chat/modals/DeleteMessageModal";
import { MessageContextMenu } from "../chat/MessageContextMenu";
import { ImageGallery } from "../chat/media/ImageGallery";
import { VoiceMessagePlayer } from "../chat/media/VoiceMessagePlayer";
import { FileDocumentCard } from "../chat/media/FileDocumentCard";

export interface DMStreamItemData {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  attachments?: Array<{
    name: string;
    size: string;
    sizeBytes?: number;
    type: string;
    mimeType?: string;
    url: string;
    thumbnailUrl?: string;
    width?: number;
    height?: number;
    duration?: number;
    waveform?: number[];
  }>;
  replyTo?: {
    _id?: string;
    id?: string;
    senderName: string;
    content: string;
  };
  codeSnippet?: {
    language: string;
    code: string;
  };
  voiceNote?: {
    duration: string;
    durationSec?: number;
    url?: string;
    waveform?: number[];
  };
  reactions?: any; // Record<string, string[]> or Array<{ emoji, count, users, category }>
  deletedFor?: string[];
  isDeletedForEveryone?: boolean;
  deletedBy?: string;
  deletedAt?: string;
  isRead: boolean;
  isDelivered?: boolean;
  status?: "SENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";
  clientMessageId?: string;
  time: string;
  createdAt: string;
  isStarred?: boolean;
  starredBy?: string[];
  isPinned?: boolean;
  pinnedAt?: string;
  pinnedBy?: any;
  isForwarded?: boolean;
  forwardedFrom?: any;
  edited?: boolean;
  editedAt?: string;
}

interface DirectMessageItemProps {
  msg: DMStreamItemData;
  currentUser?: User | null;
  isMe: boolean;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  isHighlight?: boolean;
  onSelect?: () => void;
  onReply?: (msg: DMStreamItemData) => void;
  onPin?: (msg: DMStreamItemData) => void;
  onReact?: (messageId: string, emoji: string, category?: "STANDARD" | "CAMPUS_CUSTOM") => void;
  onDeleteForMe?: (messageId: string) => void;
  onDeleteForEveryone?: (messageId: string) => void;
  onRetry?: (msg: DMStreamItemData) => void;
  onJumpToMessage?: (messageId: string) => void;
  onEdit?: (msg: DMStreamItemData) => void;
  onForward?: (msg: DMStreamItemData) => void;
  onToggleStar?: (messageId: string, isStarred: boolean) => void;
  onStartSelectionMode?: (initialId?: string) => void;
  onOpenLightbox?: (images: Array<{ url: string; originalName: string; caption?: string }>, initialIndex?: number) => void;
}

const QUICK_EMOJIS = ["❤️", "👍", "💡", "🔥", "🚀", "👀"];

export const DirectMessageItem: React.FC<DirectMessageItemProps> = ({
  msg,
  currentUser,
  isMe,
  isSelectionMode = false,
  isSelected = false,
  isHighlight = false,
  onSelect,
  onReply,
  onPin,
  onReact,
  onDeleteForMe,
  onDeleteForEveryone,
  onRetry,
  onJumpToMessage,
  onEdit,
  onForward,
  onToggleStar,
  onStartSelectionMode,
  onOpenLightbox
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    isMobileSheet: boolean;
  } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isSelectionMode) return;
    const touch = e.touches[0];
    longPressTimerRef.current = setTimeout(() => {
      setContextMenu({
        isOpen: true,
        x: touch.clientX,
        y: touch.clientY,
        isMobileSheet: true
      });
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isSelectionMode) return;
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      isMobileSheet: false
    });
  };

  const canEdit =
    isMe &&
    !msg.isDeletedForEveryone &&
    Date.now() - new Date(msg.createdAt).getTime() <= 24 * 60 * 60 * 1000;

  const canDeleteForEveryone =
    isMe &&
    !msg.isDeletedForEveryone &&
    Date.now() - new Date(msg.createdAt).getTime() <= 24 * 60 * 60 * 1000;

  const isStarred = Boolean(
    msg.isStarred || (currentUser?._id && msg.starredBy?.includes(currentUser._id))
  );
  const isPinned = Boolean(msg.isPinned);

  // Normalize reactions into an array of { emoji, count, users, isCampus }
  const normalizedReactions = useMemo(() => {
    if (!msg.reactions) return [];

    if (Array.isArray(msg.reactions)) {
      return msg.reactions.map((r: any) => ({
        emoji: r.emoji,
        count: r.count ?? r.users?.length ?? 1,
        users: r.users || [],
        isCampus: r.emoji?.startsWith(":") || r.category === "CAMPUS_CUSTOM"
      }));
    }

    // Old Record<string, string[]> format
    return Object.entries(msg.reactions).map(([emoji, users]) => ({
      emoji,
      count: (users as string[]).length,
      users: users as string[],
      isCampus: emoji.startsWith(":")
    }));
  }, [msg.reactions]);

  const imageAttachments = useMemo(() => {
    return (msg.attachments || []).filter(
      (a) =>
        a.mimeType?.startsWith("image/") ||
        a.type === "image" ||
        ["jpg", "jpeg", "png", "gif", "webp"].includes(
          a.name.split(".").pop()?.toLowerCase() || ""
        )
    );
  }, [msg.attachments]);

  const audioAttachments = useMemo(() => {
    return (msg.attachments || []).filter(
      (a) =>
        a.mimeType?.startsWith("audio/") ||
        a.type === "audio" ||
        ["mp3", "ogg", "wav", "webm", "m4a"].includes(
          a.name.split(".").pop()?.toLowerCase() || ""
        )
    );
  }, [msg.attachments]);

  const docAttachments = useMemo(() => {
    return (msg.attachments || []).filter(
      (a) => !imageAttachments.includes(a) && !audioAttachments.includes(a)
    );
  }, [msg.attachments, imageAttachments, audioAttachments]);

  // Tombstone Rendering when message was purged for everyone
  if (msg.isDeletedForEveryone) {
    return (
      <div className={`flex w-full ${isMe ? "justify-end" : "justify-start"} my-1`}>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-200/50 dark:bg-[#182229]/60 border border-dashed border-slate-300 dark:border-slate-700 text-xs italic text-slate-500 dark:text-slate-400 select-none">
          <Trash2 size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
          <span>This message was deleted</span>
          <span className="text-[10px] not-italic text-slate-400 font-mono ml-2">
            {msg.time}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative flex items-center gap-2 ${
        isSelectionMode ? "cursor-pointer" : ""
      }`}
      onClick={isSelectionMode ? onSelect : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
    >
      {/* Selection Checkbox */}
      {isSelectionMode && (
        <div className="shrink-0 pl-1">
          <div
            className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors ${
              isSelected
                ? "bg-[#1E90FF] border-[#1E90FF] text-white"
                : "border-slate-400 dark:border-slate-600 bg-white dark:bg-[#182229]"
            }`}
          >
            {isSelected && <Check size={13} strokeWidth={3} />}
          </div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 6, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.15 }}
        className={`relative flex-1 flex flex-col ${isMe ? "items-end" : "items-start"} ${
          isHighlight ? "ring-2 ring-amber-400/60 rounded-3xl p-1" : ""
        }`}
      >
        {/* ── Hover Action Bar ── */}
        <AnimatePresence>
          {!isSelectionMode && isHovered && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.12 }}
              className={`absolute -top-7 ${
                isMe ? "right-2" : "left-2"
              } z-20 flex items-center gap-1 p-1 rounded-full bg-white dark:bg-[#182229] border border-slate-200 dark:border-slate-700 shadow-lg backdrop-blur-md`}
            >
              {/* Quick Emojis */}
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onReact?.(msg.id, emoji, "STANDARD")}
                  className="h-6 w-6 rounded-full hover:scale-125 transition-transform flex items-center justify-center text-xs cursor-pointer"
                  title={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              ))}

              {/* '+' Trigger for Academic & Campus Stickers */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
                  className="h-6 w-6 rounded-full text-slate-400 hover:text-[#1E90FF] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
                  title="More Reactions & Campus Stickers"
                >
                  <Plus size={13} />
                </button>
                <EmojiPickerPopover
                  isOpen={isEmojiPickerOpen}
                  onClose={() => setIsEmojiPickerOpen(false)}
                  onSelectEmoji={(emoji, category) => onReact?.(msg.id, emoji, category)}
                  align={isMe ? "right" : "left"}
                />
              </div>

              <div className="h-3 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

              {/* Reply */}
              {onReply && (
                <button
                  type="button"
                  onClick={() => onReply(msg)}
                  className="p-1 rounded-full text-slate-400 hover:text-[#1E90FF] transition-colors cursor-pointer"
                  title="Reply"
                >
                  <Reply size={12} />
                </button>
              )}

              {/* Pin */}
              {onPin && (
                <button
                  type="button"
                  onClick={() => onPin(msg)}
                  className={`p-1 rounded-full transition-colors cursor-pointer ${
                    isPinned ? "text-amber-500" : "text-slate-400 hover:text-amber-500"
                  }`}
                  title={isPinned ? "Unpin message" : "Pin message"}
                >
                  <Pin size={12} />
                </button>
              )}

              {/* Star */}
              {onToggleStar && (
                <button
                  type="button"
                  onClick={() => onToggleStar(msg.id, !isStarred)}
                  className={`p-1 rounded-full transition-colors cursor-pointer ${
                    isStarred ? "text-amber-400" : "text-slate-400 hover:text-amber-400"
                  }`}
                  title={isStarred ? "Unstar message" : "Star message"}
                >
                  <Star size={12} className={isStarred ? "fill-amber-400" : ""} />
                </button>
              )}

              {/* Forward */}
              {onForward && (
                <button
                  type="button"
                  onClick={() => onForward(msg)}
                  className="p-1 rounded-full text-slate-400 hover:text-[#1E90FF] transition-colors cursor-pointer"
                  title="Forward message"
                >
                  <Forward size={12} />
                </button>
              )}

              {/* Delete Message Trigger */}
              {(onDeleteForMe || onDeleteForEveryone) && (
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="p-1 rounded-full text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                  title="Delete message"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Message Bubble ── */}
        <div
          className={`relative max-w-[85%] sm:max-w-md md:max-w-lg p-3 sm:px-4 sm:py-2.5 shadow-sm transition-all select-text ${
            isMe
              ? "bg-gradient-to-br from-[#1E90FF] to-[#187bcd] text-white rounded-2xl rounded-tr-xs shadow-[0_2px_12px_rgba(30,144,255,0.22)]"
              : "bg-white/95 dark:bg-[#202c33] border border-slate-200/80 dark:border-slate-700/60 text-slate-900 dark:text-slate-100 rounded-2xl rounded-tl-xs shadow-slate-200/40 dark:shadow-none"
          }`}
        >
          {/* Sender Name in Received Message Bubble */}
          {!isMe && (
            <div className="text-[11px] font-bold text-[#1E90FF] dark:text-[#60a5fa] mb-1 select-none flex items-center gap-1">
              <span>{msg.senderName || "Classmate"}</span>
            </div>
          )}

          {/* Quoted Reply Context */}
          {msg.replyTo && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                const targetId = msg.replyTo?._id || msg.replyTo?.id;
                if (targetId) onJumpToMessage?.(targetId);
              }}
              className={`mb-2 pl-2.5 py-1 text-[11px] rounded-r-lg border-l-3 cursor-pointer hover:opacity-90 transition-opacity ${
                isMe
                  ? "border-blue-200 bg-white/15 text-white"
                  : "border-[#1E90FF] bg-[#1E90FF]/10 text-slate-700 dark:text-slate-300"
              }`}
              title="Click to jump to message"
            >
              <div
                className={`font-bold text-[10px] flex items-center gap-1 ${
                  isMe ? "text-white" : "text-[#1E90FF]"
                }`}
              >
                <CornerDownRight size={10} />
                <span>{msg.replyTo.senderName}</span>
              </div>
              <p className="truncate italic text-[11px] opacity-90">
                {msg.replyTo.content}
              </p>
            </div>
          )}

          {/* Forwarded Indicator Badge */}
          {msg.isForwarded && (
            <div className="flex items-center gap-1 text-[10px] italic opacity-75 mb-1 select-none">
              <CornerUpRight size={10} className="shrink-0" />
              <span>Forwarded</span>
            </div>
          )}

          {/* Main Message Text */}
          {msg.content && (
            <p className="text-xs sm:text-[13px] leading-relaxed break-words whitespace-pre-wrap">
              {msg.content}
            </p>
          )}

          {/* Voice Note Player */}
          {(msg.voiceNote || audioAttachments.length > 0) && (
            <div className="mt-1">
              <VoiceMessagePlayer
                id={msg.id}
                url={msg.voiceNote?.url || audioAttachments[0]?.url || ""}
                duration={msg.voiceNote?.durationSec || audioAttachments[0]?.duration}
                waveform={msg.voiceNote?.waveform || audioAttachments[0]?.waveform}
                isMe={isMe}
              />
            </div>
          )}

          {/* Image Gallery (1, 2, 3, 4+ Grid Layout with Lightbox trigger) */}
          {imageAttachments.length > 0 && (
            <div className="mt-1.5">
              <ImageGallery
                images={imageAttachments.map((img) => ({
                  url: img.url,
                  originalName: img.name,
                  mimeType: img.mimeType
                }))}
                onImageClick={(idx) =>
                  onOpenLightbox?.(
                    imageAttachments.map((img) => ({
                      url: img.url,
                      originalName: img.name
                    })),
                    idx
                  )
                }
                isMe={isMe}
              />
            </div>
          )}

          {/* Code Snippet */}
          {msg.codeSnippet && (
            <div className="mt-2 rounded-xl bg-slate-950 text-slate-100 font-mono text-[11px] overflow-hidden border border-slate-800 shadow-inner">
              <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-900 border-b border-slate-800 text-[10px] text-[#1E90FF]">
                <div className="flex items-center gap-1.5">
                  <FileCode size={11} />
                  <span className="font-bold">{msg.codeSnippet.language}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyCode(msg.codeSnippet!.code)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Copy size={11} />
                  <span>{copiedSnippet ? "Copied!" : "Copy"}</span>
                </button>
              </div>
              <pre className="p-2.5 text-[#1E90FF]/90 overflow-x-auto max-h-48 scrollbar-none leading-relaxed">
                <code>{msg.codeSnippet.code}</code>
              </pre>
            </div>
          )}

          {/* Document File Cards */}
          {docAttachments.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {docAttachments.map((att, aIdx) => (
                <FileDocumentCard
                  key={aIdx}
                  originalName={att.name}
                  size={att.sizeBytes || 0}
                  url={att.url}
                  mimeType={att.mimeType}
                  isMe={isMe}
                />
              ))}
            </div>
          )}

          {/* Timestamp, Edited, Star, Pin & Delivery status */}
          <div
            className={`mt-1 flex items-center justify-end gap-1 text-[10px] tabular-nums leading-none ${
              isMe ? "text-white/80" : "text-slate-400"
            }`}
          >
            {msg.edited && (
              <span className="opacity-75 italic text-[9px] mr-0.5">(edited)</span>
            )}
            {isStarred && (
              <Star size={10} className="fill-amber-400 text-amber-400 shrink-0 inline mr-0.5" />
            )}
            {isPinned && (
              <Pin size={10} className="text-amber-400 shrink-0 inline mr-0.5" />
            )}
            <span>{msg.time}</span>
            {isMe && msg.status === "FAILED" ? (
              <div className="flex items-center gap-1 text-rose-300">
                <AlertCircle size={12} className="text-rose-400" />
                <span className="text-[10px] font-medium text-rose-200">Failed</span>
                {onRetry && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRetry(msg);
                    }}
                    className="ml-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-500/25 hover:bg-rose-500/40 text-[9px] font-semibold text-rose-100 transition-colors"
                    title="Retry sending message"
                  >
                    <RotateCw size={10} />
                    <span>Retry</span>
                  </button>
                )}
              </div>
            ) : isMe ? (
              <span
                className="ml-0.5 inline-flex items-center"
                title={
                  msg.status === "SENDING"
                    ? "Sending..."
                    : msg.status === "READ" || msg.isRead
                    ? "Read"
                    : msg.status === "DELIVERED" || msg.isDelivered
                    ? "Delivered"
                    : "Sent"
                }
              >
                {msg.status === "SENDING" ? (
                  <Clock size={12} className="animate-pulse text-white/60" />
                ) : msg.status === "READ" || msg.isRead ? (
                  <CheckCheck size={13} className="text-cyan-200" />
                ) : msg.status === "DELIVERED" || msg.isDelivered ? (
                  <CheckCheck size={13} className="text-white/70" />
                ) : (
                  <Check size={13} className="text-white/70" />
                )}
              </span>
            ) : null}
          </div>

          {/* ── Reaction Badges Pill ── */}
          {normalizedReactions.length > 0 && (
            <div
              className={`absolute -bottom-2.5 ${
                isMe ? "right-2" : "left-2"
              } flex items-center gap-1 bg-white dark:bg-[#182229] border border-slate-200 dark:border-slate-700 rounded-full px-2 py-0.5 shadow-sm text-xs select-none`}
            >
              {normalizedReactions.map((r, idx) => {
                const sticker = r.isCampus
                  ? CAMPUS_STICKERS.find((s) => s.shortcode === r.emoji)
                  : null;
                const hasReacted =
                  currentUser?._id && r.users.includes(currentUser._id);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      onReact?.(
                        msg.id,
                        r.emoji,
                        r.isCampus ? "CAMPUS_CUSTOM" : "STANDARD"
                      )
                    }
                    className={`inline-flex items-center gap-1 cursor-pointer transition-transform hover:scale-115 ${
                      hasReacted
                        ? "text-[#1E90FF] font-bold"
                        : "text-slate-600 dark:text-slate-300"
                    }`}
                    title={
                      sticker
                        ? `${sticker.name} (${r.users.join(", ") || "1 reaction"})`
                        : `${r.emoji} (${r.users.join(", ") || "1 reaction"})`
                    }
                  >
                    <span>{sticker ? sticker.emoji : r.emoji}</span>
                    {r.count > 1 && (
                      <span className="text-[9px] font-bold opacity-80">
                        {r.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Delete Message Modal ── */}
      <DeleteMessageModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDeleteForMe={() => onDeleteForMe?.(msg.id)}
        onDeleteForEveryone={() => onDeleteForEveryone?.(msg.id)}
        createdAt={msg.createdAt}
        isAuthor={Boolean(isMe)}
        isModeratorOrAdmin={false}
        messageSnippet={msg.content}
      />

      {/* ── Context Menu (Desktop Dropdown + Mobile Sheet) ── */}
      {contextMenu && (
        <MessageContextMenu
          isOpen={contextMenu.isOpen}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
          isSender={isMe}
          isDeleted={msg.isDeletedForEveryone}
          isPinned={isPinned}
          isStarred={isStarred}
          canEdit={canEdit}
          canDeleteForEveryone={canDeleteForEveryone}
          canPin={true}
          onReply={() => onReply?.(msg)}
          onReact={(emoji) => onReact?.(msg.id, emoji, "STANDARD")}
          onOpenEmojiPicker={() => setIsEmojiPickerOpen(true)}
          onCopyText={() => {
            if (msg.content) {
              navigator.clipboard.writeText(msg.content);
            }
          }}
          onEdit={() => onEdit?.(msg)}
          onForward={() => onForward?.(msg)}
          onToggleStar={() => onToggleStar?.(msg.id, !isStarred)}
          onTogglePin={() => onPin?.(msg)}
          onSelectMode={() => onStartSelectionMode?.(msg.id)}
          onDeleteForMe={() => onDeleteForMe?.(msg.id)}
          onDeleteForEveryone={() => onDeleteForEveryone?.(msg.id)}
          isMobileSheet={contextMenu.isMobileSheet}
        />
      )}
    </div>
  );
};
export default DirectMessageItem;
