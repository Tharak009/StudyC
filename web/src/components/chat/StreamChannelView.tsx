import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
  useCallback
} from "react";
import type { Channel as StreamChannel, LocalMessage } from "stream-chat";
import {
  Channel,
  Window,
  MessageList,
  Thread,
  useChannelActionContext,
  useChatContext,
  useTypingContext,
  useMessageContext,
  useChannelStateContext,
  type MessageContextValue
} from "stream-chat-react";
import {
  Hash,
  ArrowLeft,
  Clock,
  Check,
  AlertCircle,
  RotateCcw,
  Trash2,
  Reply,
  MessageSquare,
  Square,
  CheckSquare,
  Bell,
  BellOff,
  Search,
  Star,
  Info,
  ShieldCheck,
  Flag,
  Ban,
  Phone,
  PhoneCall,
  Video,
  Radio,
  Mic,
  Pin,
  Share2,
  Lock
} from "lucide-react";
import { StreamMessageComposer } from "./StreamMessageComposer";
import { MessageActionMenu } from "./MessageActionMenu";
import { MultiSelectActionBar } from "./MultiSelectActionBar";
import { CallHistoryModal } from "./calls/CallHistoryModal";
import { ImageGallery } from "./media/ImageGallery";
import { FileAttachmentCard } from "./media/FileAttachmentCard";
import { VoiceMessagePlayer } from "./media/VoiceMessagePlayer";
import { MediaLightbox, type LightboxImage } from "./media/MediaLightbox";
import { DropZoneOverlay } from "./media/DropZoneOverlay";
import { ChatInfoPanel } from "./ChatInfoPanel";
import { GlobalMessageSearchModal } from "./modals/GlobalMessageSearchModal";
import { StarredMessagesDrawer } from "./modals/StarredMessagesDrawer";
import { ReportModal } from "./modals/ReportModal";
import { AcademicMessageRenderer } from "./AcademicMessageRenderer";
import { PollCard } from "./cards/PollCard";
import { StudySessionCard } from "./cards/StudySessionCard";
import { PinnedMessagesBanner } from "./PinnedMessagesBanner";
import { ForwardMessageModal } from "./modals/ForwardMessageModal";
import { CallEventCard, type CallEventData } from "./cards/CallEventCard";
import { callSignalingService } from "../../services/call-signaling.service";
import { socketService } from "../../services/socket.service";
import { useCallStore } from "../../store/call.store";
import { useChatOrganizationStore } from "../../store/chat-organization.store";
import { useChatPrivacyStore } from "../../store/chat-privacy.store";
import { usersApi } from "../../api/users.api";
import { fromStreamUserId, toStreamUserId } from "../../utils/stream-id";
import { useToastStore } from "../../store/toast.store";
import type { ActivePeer } from "../dm/ConversationHeader";

// Standard emoji mapping for reaction badges
const REACTION_EMOJIS: Record<string, string> = {
  thumbs_up: "👍",
  love: "❤️",
  haha: "😂",
  wow: "😮",
  sad: "😢",
  angry: "😡"
};

const HIDDEN_MESSAGES_PREFIX = "studyconnect_hidden_messages_";

interface StreamChannelViewProps {
  channel: StreamChannel;
  channelName: string;
  isDM?: boolean;
  peer?: ActivePeer | null;
  communityName?: string;
  targetMessageId?: string | null;
  onBack?: () => void;
  isReadOnly?: boolean;
  readOnlyNotice?: string;
}

interface MessageInteractionsContextValue {
  peer?: ActivePeer | null;
  replyingTo: LocalMessage | null;
  setReplyingTo: (msg: LocalMessage | null) => void;
  editingMessage: LocalMessage | null;
  setEditingMessage: (msg: LocalMessage | null) => void;
  selectedMessageIds: Set<string>;
  toggleSelectMessage: (id: string) => void;
  isSelectMode: boolean;
  setIsSelectMode: (val: boolean) => void;
  hiddenMessageIds: Set<string>;
  hideMessageLocally: (id: string) => void;
  openLightbox: (images: LightboxImage[], index?: number) => void;
  highlightedMessageId: string | null;
  setHighlightedMessageId: (id: string | null) => void;
  jumpToMessage: (id: string) => Promise<void>;
  openReportModal: (target: {
    targetType: "MESSAGE" | "USER" | "COMMUNITY";
    targetId: string;
    targetTitle?: string;
    snippet?: string;
  }) => void;
  openForwardModal: (messages: LocalMessage[]) => void;
}

const MessageInteractionsContext = createContext<MessageInteractionsContextValue | null>(
  null
);

function useMessageInteractions() {
  const ctx = useContext(MessageInteractionsContext);
  if (!ctx) {
    throw new Error(
      "useMessageInteractions must be used within MessageInteractionsContext.Provider"
    );
  }
  return ctx;
}

// StudyConnect Custom Message component rendered by Stream MessageList and Thread
function StudyConnectMessageItem(props: Partial<MessageContextValue>) {
  const context = useMessageContext();
  const message = (props.message || context?.message) as LocalMessage | undefined;
  if (!message) return null;

  const { client } = useChatContext();
  const { retrySendMessage, openThread, jumpToMessage } = useChannelActionContext();
  const { channel } = useChannelStateContext();
  const {
    peer,
    setReplyingTo,
    setEditingMessage,
    selectedMessageIds,
    toggleSelectMessage,
    isSelectMode,
    hiddenMessageIds,
    hideMessageLocally,
    openLightbox,
    highlightedMessageId,
    openReportModal,
    openForwardModal
  } = useMessageInteractions();

  // 1. Delete for Me Check (Local hide)
  if (hiddenMessageIds.has(message.id)) {
    return null;
  }

  // 1b. Disappearing Messages Expiration Check
  const disappearingDuration =
    useChatPrivacyStore((state) => state.getDisappearingDuration(channel.id)) ||
    ((channel.data as any)?.disappearing_duration as number) ||
    0;

  if (disappearingDuration > 0 && message.created_at) {
    const ageSeconds =
      (Date.now() - new Date(message.created_at).getTime()) / 1000;
    if (ageSeconds > disappearingDuration) {
      return null;
    }
  }

  const isForwarded = Boolean((message as any).forwarded);
  const forwardedFrom = (message as any).forwarded_from as string | undefined;
  const isPinned = Boolean(message.pinned);

  const isMine =
    (typeof context?.isMyMessage === "function" ? context.isMyMessage() : false) ||
    message.user?.id === client.userID ||
    message.user?.id === client.user?.id;

  const isDeleted = message.type === "deleted" || Boolean(message.deleted_at);
  const isEdited = Boolean(
    message.message_text_updated_at || (message as any).is_edited
  );

  const senderName = (message.user?.name as string) || "Classmate";
  const senderAvatar = (message.user?.image as string) || undefined;
  const senderRoll = ((message.user as any)?.rollNumber as string) || "";
  const senderDept = ((message.user as any)?.department as string) || "";

  const status = message.status;
  const isFailed = status === "failed";
  const isSending = status === "sending";

  const handleRetry = async () => {
    try {
      if (retrySendMessage) {
        await retrySendMessage(message);
      }
    } catch (err) {
      console.error("Failed to retry message:", err);
    }
  };

  const timeStr = message.created_at
    ? new Date(message.created_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      })
    : "";

  // Categorize attachments
  const imageAttachments: LightboxImage[] = useMemo(() => {
    if (!message.attachments || message.attachments.length === 0) return [];
    return message.attachments
      .filter(
        (a) =>
          a.type === "image" ||
          Boolean(a.image_url) ||
          (a.asset_url && /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(a.asset_url))
      )
      .map((a) => ({
        url: (a.image_url || a.asset_url) as string,
        title: a.title || a.fallback,
        fallback: a.fallback
      }))
      .filter((img) => Boolean(img.url));
  }, [message.attachments]);

  const voiceAttachments = useMemo(() => {
    if (!message.attachments || message.attachments.length === 0) return [];
    return message.attachments.filter(
      (a) =>
        a.type === "voice" ||
        a.type === "audio" ||
        a.mime_type?.startsWith("audio/") ||
        (a.asset_url && /\.(mp3|wav|ogg|m4a|aac|webm)$/i.test(a.asset_url))
    );
  }, [message.attachments]);

  const fileAttachments = useMemo(() => {
    if (!message.attachments || message.attachments.length === 0) return [];
    return message.attachments.filter((a) => {
      const isImg =
        a.type === "image" ||
        Boolean(a.image_url) ||
        (a.asset_url && /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(a.asset_url));
      const isVoice =
        a.type === "voice" ||
        a.type === "audio" ||
        a.mime_type?.startsWith("audio/") ||
        (a.asset_url && /\.(mp3|wav|ogg|m4a|aac|webm)$/i.test(a.asset_url));
      return !isImg && !isVoice && (a.type === "file" || Boolean(a.asset_url));
    });
  }, [message.attachments]);

  const hasMedia =
    imageAttachments.length > 0 ||
    fileAttachments.length > 0 ||
    voiceAttachments.length > 0;

  // Single or multiple image gallery
  const hasImages = imageAttachments.length > 0;

  const pollAttachment = useMemo(() => {
    return message.attachments?.find((a) => a.type === "poll");
  }, [message.attachments]);

  const studySessionAttachment = useMemo(() => {
    return message.attachments?.find((a) => a.type === "study_session");
  }, [message.attachments]);

  const callEvent = (message as any).call_event as CallEventData | undefined;

  // 2. Tombstone Render for Soft-Deleted Messages
  if (isDeleted) {
    return (
      <div
        id={`msg-${message.id}`}
        className={`group flex items-start gap-3 my-2 px-4 transition-all ${
          isMine ? "flex-row-reverse" : "flex-row"
        }`}
      >
        <div
          className={`flex flex-col max-w-[80%] sm:max-w-[70%] ${
            isMine ? "items-end" : "items-start"
          }`}
        >
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-100/90 dark:bg-slate-900/60 text-slate-400 dark:text-slate-500 border border-dashed border-slate-300 dark:border-slate-800 text-xs italic">
            <Trash2 size={13} className="shrink-0 opacity-60" />
            <span>This message was deleted</span>
            {timeStr && (
              <span className="text-[10px] not-italic ml-1 opacity-70">
                • {timeStr}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Scroll to quoted message
  const handleScrollToQuoted = (quotedId?: string) => {
    if (!quotedId) return;
    if (jumpToMessage) {
      jumpToMessage(quotedId);
    }
    const el = document.getElementById(`msg-${quotedId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-[#005FFF]", "ring-offset-2");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-[#005FFF]", "ring-offset-2");
      }, 2000);
    }
  };

  // Toggle reaction via Stream channel context
  const handleReactionToggle = async (reactionType: string) => {
    try {
      const ownReactions = message.own_reactions || [];
      const hasReaction = ownReactions.some((r) => r.type === reactionType);

      if (hasReaction) {
        await channel.deleteReaction(message.id, reactionType);
      } else {
        await channel.sendReaction(message.id, { type: reactionType });
      }
    } catch (err) {
      console.error("Failed to toggle reaction:", err);
    }
  };

  const quoted = message.quoted_message;
  const reactionCounts = message.reaction_counts || {};
  const reactionEntries = Object.entries(reactionCounts).filter(
    ([type, count]) =>
      type !== "star" &&
      Boolean(REACTION_EMOJIS[type]) &&
      typeof count === "number" &&
      count > 0
  );
  const hasReactions = reactionEntries.length > 0;
  const isSelected = selectedMessageIds.has(message.id);
  const isHighlighted = highlightedMessageId === message.id;
  const isStarred = useChatOrganizationStore((state) =>
    state.isMessageStarred(message.id)
  );

  return (
    <div
      id={`msg-${message.id}`}
      className={`group relative flex items-start gap-3 my-2.5 px-4 rounded-xl transition-all ${
        isSelected
          ? "bg-sky-50/70 dark:bg-sky-950/30 ring-1 ring-[#005FFF]/40"
          : ""
      } ${
        isHighlighted
          ? "ring-2 ring-[#1E90FF] ring-offset-2 ring-offset-white dark:ring-offset-[#0B1220] bg-sky-50/80 dark:bg-sky-950/50 shadow-md animate-pulse"
          : ""
      } ${isMine ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Multi-select checkbox */}
      {isSelectMode && (
        <button
          type="button"
          onClick={() => toggleSelectMessage(message.id)}
          className="self-center p-1 rounded-lg text-slate-400 hover:text-[#005FFF] transition-colors cursor-pointer shrink-0"
          title={isSelected ? "Deselect message" : "Select message"}
        >
          {isSelected ? (
            <CheckSquare size={18} className="text-[#005FFF]" />
          ) : (
            <Square size={18} />
          )}
        </button>
      )}

      {/* Sender Avatar (only for other's messages) */}
      {!isMine &&
        (senderAvatar ? (
          <img
            src={senderAvatar}
            alt={senderName}
            className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5 shadow-2xs ring-1 ring-slate-200 dark:ring-slate-800"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
            {senderName.slice(0, 2).toUpperCase()}
          </div>
        ))}

      {/* Message Body & Actions Container */}
      <div
        className={`relative flex flex-col max-w-[80%] sm:max-w-[70%] ${
          isMine ? "items-end" : "items-start"
        }`}
      >
        {/* Sender Name & Details Header */}
        {!isMine && (
          <div className="flex items-center gap-1.5 mb-1 px-1">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {senderName}
            </span>
            {senderRoll && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                {senderRoll}
              </span>
            )}
            {senderDept && (
              <span className="text-[10px] text-slate-400">• {senderDept}</span>
            )}
            <span className="text-[10px] text-slate-400 font-medium">
              {timeStr}
            </span>
          </div>
        )}

        {/* Forwarded from original sender indicator */}
        {isForwarded && (
          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mb-1 italic px-1">
            <Share2 size={11} className="shrink-0 rotate-12" />
            <span>Forwarded {forwardedFrom ? `from ${forwardedFrom}` : ""}</span>
          </div>
        )}

        {/* Pinned message badge */}
        {isPinned && (
          <div className="flex items-center gap-1 text-[10px] text-amber-500 dark:text-amber-400 font-semibold mb-1 px-1">
            <Pin size={10} className="shrink-0" />
            <span>Pinned message</span>
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={`relative rounded-2xl text-sm leading-relaxed shadow-2xs transition-all ${
            callEvent
              ? "p-0 bg-transparent shadow-none border-0"
              : !hasMedia
              ? "px-4 py-2.5"
              : "p-1.5"
          } ${
            callEvent
              ? ""
              : isMine
              ? "bg-[#1E90FF] text-white rounded-tr-xs"
              : "bg-slate-100 dark:bg-[#0F1A30] text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-800/80 rounded-tl-xs"
          } ${
            isFailed
              ? "border-red-500 bg-red-500/10 text-red-700 dark:text-red-300"
              : ""
          }`}
        >
          {/* Quoted Message Preview inside bubble */}
          {quoted && (
            <div
              onClick={() => handleScrollToQuoted(quoted.id)}
              className={`mb-2 p-2 rounded-xl text-xs flex flex-col gap-0.5 border-l-2 cursor-pointer transition-colors ${
                isMine
                  ? "bg-white/15 text-white/95 border-white hover:bg-white/25"
                  : "bg-slate-200/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-[#005FFF] hover:bg-slate-200 dark:hover:bg-slate-800"
              }`}
              title="Click to jump to original message"
            >
              <div className="flex items-center gap-1 font-semibold text-[11px] opacity-90">
                <Reply size={10} />
                <span>
                  {((quoted.user as any)?.name as string) || "Classmate"}
                </span>
              </div>
              <div className="line-clamp-2 text-[11px] opacity-80 break-words">
                {quoted.type === "deleted" || quoted.deleted_at
                  ? "Original message was deleted"
                  : quoted.text || (
                      quoted.attachments?.some((a) => a.type === "image" || a.image_url)
                        ? "🖼️ Photo"
                        : quoted.attachments?.some((a) => a.type === "voice" || a.type === "audio")
                        ? "🎤 Voice message"
                        : quoted.attachments?.length
                        ? "📄 File"
                        : "[Attachment]"
                    )}
              </div>
            </div>
          )}

          {/* 1. Image Gallery */}
          {imageAttachments.length > 0 && (
            <div className={message.text ? "mb-1.5" : ""}>
              <ImageGallery
                images={imageAttachments}
                onOpenLightbox={(idx) => openLightbox(imageAttachments, idx)}
                isSelectMode={isSelectMode}
              />
            </div>
          )}

          {/* 2. Document / File Attachments */}
          {fileAttachments.length > 0 && (
            <div className="space-y-1.5 my-1">
              {fileAttachments.map((att, idx) => (
                <FileAttachmentCard
                  key={idx}
                  attachment={att}
                  isSelectMode={isSelectMode}
                  isMine={isMine}
                />
              ))}
            </div>
          )}

          {/* 3. Voice Message Players */}
          {voiceAttachments.length > 0 && (
            <div className="space-y-1.5 my-1">
              {voiceAttachments.map((att, idx) => (
                <VoiceMessagePlayer
                  key={idx}
                  attachment={att}
                  messageId={`${message.id}-${idx}`}
                  isSelectMode={isSelectMode}
                  isMine={isMine}
                />
              ))}
            </div>
          )}

          {/* Call Event History Card */}
          {callEvent && (
            <CallEventCard
              callEvent={callEvent}
              isMine={isMine}
              peerId={peer?.id}
              peerName={peer?.name}
              peerAvatar={peer?.avatar}
              channelId={channel.id}
            />
          )}

          {/* Academic Message Text with Syntax Highlighting & KaTeX */}
          {message.text && !callEvent && (
            <div className={hasMedia ? "px-2.5 pt-1 pb-1" : ""}>
              <AcademicMessageRenderer text={message.text} isMine={isMine} />
            </div>
          )}

          {/* Live Stream-Native Poll Card */}
          {pollAttachment && (
            <div className="mt-2 px-1">
              <PollCard
                poll={(pollAttachment as any).poll_data || (pollAttachment as any)}
                messageId={message.id}
                channel={channel}
                reactionCounts={message.reaction_counts}
                ownReactions={message.own_reactions}
                isMine={isMine}
              />
            </div>
          )}

          {/* Study Sprint Pomodoro Card */}
          {studySessionAttachment && (
            <div className="mt-2 px-1">
              <StudySessionCard
                session={studySessionAttachment as any}
                isMine={isMine}
              />
            </div>
          )}

          {/* Desktop Hover & Mobile Action Menu */}
          <MessageActionMenu
            message={message}
            isMine={isMine}
            canModerate={false}
            channel={channel}
            onReply={(msg) => setReplyingTo(msg)}
            onOpenThread={(msg) => {
              if (openThread) openThread(msg);
            }}
            onEdit={(msg) => setEditingMessage(msg)}
            onDeleteForMe={(msg) => hideMessageLocally(msg.id)}
            onDeleteForEveryone={async (msg) => {
              try {
                await client.deleteMessage(msg.id, { hardDelete: false });
              } catch (err) {
                console.error("Failed to delete message for everyone:", err);
              }
            }}
            onToggleSelect={(id) => toggleSelectMessage(id)}
            onReact={handleReactionToggle}
            onForward={(msg) => openForwardModal([msg])}
            onTogglePin={async (msg) => {
              try {
                if (msg.pinned) {
                  await channel.unpinMessage(msg.id);
                } else {
                  await channel.pinMessage(msg.id);
                }
              } catch (err) {
                console.error("Failed to toggle pin:", err);
              }
            }}
            onReport={(msg) =>
              openReportModal({
                targetType: "MESSAGE",
                targetId: msg.id,
                targetTitle: msg.user?.name || "Message",
                snippet: msg.text
              })
            }
            ownReactions={message.own_reactions?.map((r) => r.type) || []}
            align={isMine ? "right" : "left"}
          />
        </div>

        {/* Reaction Pills beneath message bubble */}
        {hasReactions && (
          <div
            className={`flex flex-wrap items-center gap-1 mt-1 ${
              isMine ? "justify-end" : "justify-start"
            }`}
          >
            {reactionEntries.map(([type, count]) => {
              const emoji = REACTION_EMOJIS[type];
              if (!emoji) return null;
              const isOwn = message.own_reactions?.some((r) => r.type === type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleReactionToggle(type)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                    isOwn
                      ? "bg-sky-50 dark:bg-sky-950/60 border-[#005FFF]/60 text-[#005FFF] dark:text-sky-400 font-semibold shadow-2xs"
                      : "bg-slate-100/90 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/70 text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700/60"
                  }`}
                  title={`Reacted with ${type}`}
                >
                  <span>{emoji}</span>
                  <span className="text-[11px]">{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Thread Replies Button */}
        {Boolean(message.reply_count && message.reply_count > 0) && (
          <button
            type="button"
            onClick={() => {
              if (openThread) openThread(message);
            }}
            className="flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-[#005FFF] dark:text-sky-400 bg-sky-50/80 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/50 border border-sky-200/60 dark:border-sky-800/50 transition-colors cursor-pointer"
          >
            <MessageSquare size={12} />
            <span>
              {message.reply_count}{" "}
              {message.reply_count === 1 ? "reply" : "replies"}
            </span>
          </button>
        )}

        {/* Footer: timestamp, edited status, delivery state */}
        <div
          className={`flex items-center gap-1.5 mt-1 px-1 text-[11px] text-slate-400 ${
            isMine ? "justify-end" : "justify-start"
          }`}
        >
          {isStarred && (
            <span
              className="inline-flex items-center text-amber-500"
              title="Starred message"
            >
              <Star size={11} className="fill-amber-400 text-amber-400" />
            </span>
          )}
          {isMine && <span>{timeStr}</span>}
          {isEdited && <span className="italic text-[10px]">(edited)</span>}
          {isMine && (
            <>
              {isSending && (
                <span className="inline-flex items-center gap-1 text-sky-500">
                  <Clock size={11} className="animate-spin" />
                  <span className="text-[10px]">sending</span>
                </span>
              )}
              {isFailed && (
                <button
                  onClick={handleRetry}
                  className="inline-flex items-center gap-1 text-red-500 hover:text-red-600 font-medium cursor-pointer"
                  title="Click to retry"
                >
                  <AlertCircle size={11} />
                  <span className="text-[10px]">failed • retry</span>
                  <RotateCcw
                    size={10}
                    className="hover:rotate-180 transition-transform"
                  />
                </button>
              )}
              {status === "received" && (
                <span className="text-slate-400" title="Sent">
                  <Check size={12} />
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Inner Channel component consuming Stream React SDK contexts
function StreamChannelInner({
  channel,
  channelName,
  isDM = false,
  peer,
  communityName,
  onBack,
  isReadOnly = false,
  readOnlyNotice
}: {
  channel: StreamChannel;
  channelName: string;
  isDM?: boolean;
  peer?: ActivePeer | null;
  communityName?: string;
  onBack?: () => void;
  isReadOnly?: boolean;
  readOnlyNotice?: string;
}) {
  const { typing } = useTypingContext();
  const { client } = useChatContext();
  const {
    replyingTo,
    setReplyingTo,
    editingMessage,
    setEditingMessage,
    selectedMessageIds,
    toggleSelectMessage,
    isSelectMode,
    setIsSelectMode,
    hiddenMessageIds,
    hideMessageLocally,
    openLightbox,
    jumpToMessage,
    openReportModal,
    openForwardModal
  } = useMessageInteractions();

  const [isMuted, setIsMuted] = useState(false);
  const [isInChatSearchOpen, setIsInChatSearchOpen] = useState(false);
  const [isStarredDrawerOpen, setIsStarredDrawerOpen] = useState(false);
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);

  // Sync native channel mute status
  useEffect(() => {
    if (!channel) return;
    try {
      const status = channel.muteStatus();
      setIsMuted(Boolean(status?.muted));
    } catch {
      setIsMuted(false);
    }
  }, [channel]);

  const handleToggleMute = async () => {
    if (!channel) return;
    try {
      if (isMuted) {
        await channel.unmute();
        setIsMuted(false);
      } else {
        await channel.mute();
        setIsMuted(true);
      }
    } catch (err) {
      console.warn("Failed to toggle channel mute:", err);
    }
  };

  // Blocked user state for DMs
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const { addToast } = useToastStore();

  useEffect(() => {
    if (!isDM) return;
    let isMounted = true;
    usersApi
      .listBlocked()
      .then((list) => {
        if (isMounted && Array.isArray(list)) {
          const ids = list.map((b: any) =>
            String(b.user?._id || b.user?.id || b.user)
          );
          setBlockedUserIds(ids);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [isDM, channel.id]);

  const cleanPeerId = peer?.id ? fromStreamUserId(peer.id) : "";
  const isPeerBlocked =
    isDM &&
    Boolean(
      cleanPeerId &&
        (blockedUserIds.includes(cleanPeerId) ||
          (peer?.id && blockedUserIds.includes(peer.id)) ||
          blockedUserIds.includes(toStreamUserId(cleanPeerId)))
    );

  const handleUnblockPeer = async () => {
    if (!cleanPeerId) return;
    try {
      await usersApi.unblockUser(cleanPeerId);
      setBlockedUserIds((prev) =>
        prev.filter(
          (id) => id !== cleanPeerId && id !== peer?.id && id !== toStreamUserId(cleanPeerId)
        )
      );
      addToast(`Unblocked ${peer?.name || "user"}`, "success");
    } catch {
      addToast("Failed to unblock user", "error");
    }
  };

  // Disappearing messages duration
  const disappearingDuration =
    useChatPrivacyStore((state) => state.getDisappearingDuration(channel.id)) ||
    ((channel.data as any)?.disappearing_duration as number) ||
    0;

  // Strict Study Mode check
  const isStrictStudyMode =
    !isDM &&
    Boolean(
      (channel.data as any)?.isStrictStudyMode ??
        ((channel.data as any)?.category === "focus")
    );

  // Active Group Call state in this channel
  const [activeGroupCall, setActiveGroupCall] = useState<{
    callId: string;
    type: "voice" | "video";
    communityName?: string;
    participantCount: number;
    mode?: "normal" | "stage";
  } | null>(null);

  const groupCallId = useCallStore((s) => s.groupCallId);

  useEffect(() => {
    if (isDM) return;

    const socket = socketService.get();
    if (!socket) return;

    // Query active group call for this channel
    socket.emit("call:group:getActiveCall", { channelId: channel.id }, (res: any) => {
      if (res?.success && res.call) {
        setActiveGroupCall({
          callId: res.call.callId,
          type: res.call.type,
          communityName: res.call.communityName,
          participantCount: res.call.participantCount || res.call.participants?.length || 1,
          mode: res.call.mode
        });
      } else {
        setActiveGroupCall(null);
      }
    });

    const onGroupStarted = (data: any) => {
      if (data.channelId === channel.id) {
        setActiveGroupCall({
          callId: data.callId,
          type: data.type,
          communityName: data.communityName,
          participantCount: 1,
          mode: data.mode
        });
      }
    };

    const onParticipantJoined = (data: any) => {
      setActiveGroupCall((prev) => {
        if (!prev || prev.callId !== data.callId) return prev;
        return { ...prev, participantCount: prev.participantCount + 1 };
      });
    };

    const onParticipantLeft = (data: any) => {
      setActiveGroupCall((prev) => {
        if (!prev || prev.callId !== data.callId) return prev;
        const count = data.remainingParticipants ? data.remainingParticipants.length : Math.max(1, prev.participantCount - 1);
        return { ...prev, participantCount: count };
      });
    };

    const onGroupEnded = (data: any) => {
      setActiveGroupCall((prev) => {
        if (prev?.callId === data.callId || data.channelId === channel.id) {
          return null;
        }
        return prev;
      });
    };

    socket.on("call:group:started", onGroupStarted);
    socket.on("call:group:participant_joined", onParticipantJoined);
    socket.on("call:group:participant_left", onParticipantLeft);
    socket.on("call:group:ended", onGroupEnded);

    return () => {
      socket.off("call:group:started", onGroupStarted);
      socket.off("call:group:participant_joined", onParticipantJoined);
      socket.off("call:group:participant_left", onParticipantLeft);
      socket.off("call:group:ended", onGroupEnded);
    };
  }, [channel.id, isDM]);

  // Call history modal state
  const [isCallHistoryOpen, setIsCallHistoryOpen] = useState(false);

  // Drag and drop file upload state
  const [isDragging, setIsDragging] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<File[] | null>(null);
  const dragCounter = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      setIsDragging(false);
      dragCounter.current = 0;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setDroppedFiles(Array.from(e.dataTransfer.files));
    }
  };

  // Typing indicator calculation
  const typingUserNames = useMemo(() => {
    return Object.entries(typing || {})
      .filter(
        ([userId]) =>
          userId !== client.userID && userId !== client.user?.id
      )
      .map(
        ([_, data]) =>
          ((data as any)?.user?.name as string) || "Classmate"
      );
  }, [typing, client.userID, client.user?.id]);

  // Check if all selected messages belong to current user
  const allSelectedAreMine = useMemo(() => {
    if (selectedMessageIds.size === 0) return false;
    const messages = channel.state.messages || [];
    const selectedMessages = messages.filter((m) =>
      selectedMessageIds.has(m.id)
    );
    if (selectedMessages.length === 0) return false;
    return selectedMessages.every(
      (m) =>
        m.user?.id === client.userID || m.user?.id === client.user?.id
    );
  }, [selectedMessageIds, channel.state.messages, client.userID, client.user?.id]);

  // Bulk copy selected messages
  const handleCopySelected = async () => {
    const messages = channel.state.messages || [];
    const textToCopy = messages
      .filter((m) => selectedMessageIds.has(m.id))
      .map((m) => m.text)
      .filter(Boolean)
      .join("\n\n");
    if (textToCopy) {
      await navigator.clipboard.writeText(textToCopy);
    }
  };

  // Bulk delete for me
  const handleDeleteForMeSelected = () => {
    selectedMessageIds.forEach((id) => {
      hideMessageLocally(id);
    });
    setIsSelectMode(false);
  };

  // Bulk delete for everyone (authored by current user)
  const handleDeleteForEveryoneSelected = async () => {
    const messages = channel.state.messages || [];
    const mySelected = messages.filter(
      (m) =>
        selectedMessageIds.has(m.id) &&
        (m.user?.id === client.userID || m.user?.id === client.user?.id)
    );
    for (const msg of mySelected) {
      try {
        await client.deleteMessage(msg.id, { hardDelete: false });
      } catch (err) {
        console.error("Failed to soft-delete message:", err);
      }
    }
    setIsSelectMode(false);
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex flex-col h-full min-h-0 bg-white dark:bg-[#0B1220] relative"
    >
      {/* Visual Drop Zone for Drag & Drop Uploads */}
      <DropZoneOverlay isDragging={isDragging} />
      {/* Multi-Select Action Bar Overlay */}
      {isSelectMode && selectedMessageIds.size > 0 && (
        <MultiSelectActionBar
          selectedCount={selectedMessageIds.size}
          canDeleteEveryone={allSelectedAreMine}
          onCopySelected={handleCopySelected}
          onDeleteForMeSelected={handleDeleteForMeSelected}
          onDeleteForEveryoneSelected={handleDeleteForEveryoneSelected}
          onForwardSelected={() => {
            const messages = channel.state.messages || [];
            const selectedList = messages.filter((m) =>
              selectedMessageIds.has(m.id)
            );
            openForwardModal(selectedList);
          }}
          onCancel={() => {
            setIsSelectMode(false);
          }}
        />
      )}

      {/* 1. Header */}
      <div className="h-14 px-4 md:px-6 bg-white dark:bg-[#0E1726] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 -ml-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Back to conversations"
              aria-label="Back to conversations"
            >
              <ArrowLeft size={18} />
            </button>
          )}

          {isDM ? (
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                {peer?.avatar ? (
                  <img
                    src={peer.avatar}
                    alt={peer.name}
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 text-white font-bold text-xs flex items-center justify-center">
                    {(peer?.name || "DM").slice(0, 2).toUpperCase()}
                  </div>
                )}
                {peer?.isOnline && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0E1726]" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {peer?.name || channelName}
                  </h2>
                  {isPeerBlocked && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold border border-rose-500/20">
                      <Ban size={10} />
                      Blocked
                    </span>
                  )}
                  {disappearingDuration > 0 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 text-[10px] font-semibold border border-sky-500/20">
                      <Clock size={10} />
                      {disappearingDuration >= 2592000
                        ? "30d"
                        : disappearingDuration >= 604800
                        ? "7d"
                        : "24h"}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  {peer?.isOnline ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      Active now
                    </span>
                  ) : (
                    peer?.roll || "Student"
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-[#1E90FF] flex items-center justify-center shrink-0">
                <Hash size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {channelName}
                  </h2>
                  {isStrictStudyMode && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold border border-indigo-500/20">
                      <ShieldCheck size={10} />
                      Study Mode
                    </span>
                  )}
                  {disappearingDuration > 0 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 text-[10px] font-semibold border border-sky-500/20">
                      <Clock size={10} />
                      {disappearingDuration >= 2592000
                        ? "30d"
                        : disappearingDuration >= 604800
                        ? "7d"
                        : "24h"}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  {communityName || "Community"} • Stream Channel
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* DM 1-on-1 Audio/Video Call Buttons */}
          {isDM && peer ? (
            <>
              <button
                type="button"
                onClick={() => {
                  callSignalingService.initiateCall({
                    targetUserId: peer.id,
                    targetUserName: peer.name,
                    targetUserAvatar: peer.avatar,
                    channelId: channel.id,
                    isVideo: false
                  });
                }}
                className="p-2 rounded-lg text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={`Voice call ${peer.name}`}
                aria-label="Start voice call"
              >
                <Phone size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  callSignalingService.initiateCall({
                    targetUserId: peer.id,
                    targetUserName: peer.name,
                    targetUserAvatar: peer.avatar,
                    channelId: channel.id,
                    isVideo: true
                  });
                }}
                className="p-2 rounded-lg text-slate-400 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={`Video call ${peer.name}`}
                aria-label="Start video call"
              >
                <Video size={16} />
              </button>
            </>
          ) : (
            /* Community Channel Group Voice/Video Call Buttons */
            <>
              <button
                type="button"
                onClick={() => {
                  callSignalingService.initiateGroupCall({
                    channelId: channel.id,
                    communityName: communityName || channelName,
                    isVideo: false
                  });
                }}
                className="p-2 rounded-lg text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Start group voice call"
                aria-label="Start group voice call"
              >
                <Phone size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  callSignalingService.initiateGroupCall({
                    channelId: channel.id,
                    communityName: communityName || channelName,
                    isVideo: true
                  });
                }}
                className="p-2 rounded-lg text-slate-400 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Start group video call"
                aria-label="Start group video call"
              >
                <Video size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  callSignalingService.initiateGroupCall({
                    channelId: channel.id,
                    communityName: communityName || channelName,
                    isVideo: false,
                    mode: "stage"
                  });
                }}
                className="p-2 rounded-lg text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Start Voice Stage"
                aria-label="Start Voice Stage"
              >
                <Radio size={16} />
              </button>
            </>
          )}

          {/* Call History Button */}
          <button
            type="button"
            onClick={() => setIsCallHistoryOpen(true)}
            className="p-2 rounded-lg text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="View call history"
            aria-label="View call history"
          >
            <PhoneCall size={16} />
          </button>

          {/* Mute Button */}
          <button
            onClick={handleToggleMute}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              isMuted
                ? "text-amber-500 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
            title={isMuted ? "Channel muted (Click to unmute)" : "Mute notifications for this chat"}
            aria-label={isMuted ? "Unmute channel" : "Mute channel"}
          >
            {isMuted ? <BellOff size={16} /> : <Bell size={16} />}
          </button>

          {/* In-chat Search Button */}
          <button
            onClick={() => setIsInChatSearchOpen(true)}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Search in this conversation"
            aria-label="Search in this conversation"
          >
            <Search size={16} />
          </button>

          {/* Starred Messages Button */}
          <button
            onClick={() => setIsStarredDrawerOpen(true)}
            className="p-2 rounded-lg text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Starred messages"
            aria-label="Starred messages"
          >
            <Star size={16} />
          </button>

          {/* Info Panel Button */}
          <button
            onClick={() => setIsInfoPanelOpen(!isInfoPanelOpen)}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              isInfoPanelOpen
                ? "bg-sky-50 dark:bg-sky-950/50 text-[#1E90FF]"
                : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
            title="Chat info & shared media"
            aria-label="Chat info and shared media"
          >
            <Info size={16} />
          </button>
        </div>
      </div>

      {/* Pinned Messages Banner */}
      <PinnedMessagesBanner
        pinnedMessages={channel.state.pinnedMessages || []}
        canPin={true}
        onJumpToMessage={jumpToMessage}
        onUnpinMessage={async (msg) => {
          try {
            await channel.unpinMessage(msg.id);
          } catch (err) {
            console.error("Failed to unpin message:", err);
          }
        }}
      />

      {/* Active Group Call / Voice Stage Banner */}
      {!isDM && activeGroupCall && groupCallId !== activeGroupCall.callId && (
        <div
          className={`flex items-center justify-between px-4 py-2 border-b text-xs font-medium animate-in fade-in duration-200 ${
            activeGroupCall.mode === "stage"
              ? "bg-indigo-500/10 dark:bg-indigo-950/40 border-indigo-500/20 text-indigo-600 dark:text-indigo-400"
              : "bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2.5 h-2.5 rounded-full animate-pulse shrink-0 ${
                activeGroupCall.mode === "stage" ? "bg-indigo-500" : "bg-emerald-500"
              }`}
            />
            <span className="truncate">
              {activeGroupCall.mode === "stage"
                ? `Live Voice Stage in session • ${activeGroupCall.participantCount} participant${
                    activeGroupCall.participantCount === 1 ? "" : "s"
                  }`
                : `Active Group ${activeGroupCall.type === "video" ? "Video" : "Voice"} Call • ${
                    activeGroupCall.participantCount
                  } participant${activeGroupCall.participantCount === 1 ? "" : "s"}`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              callSignalingService.joinGroupCall({
                callId: activeGroupCall.callId,
                isVideo: activeGroupCall.type === "video"
              });
            }}
            className={`px-3 py-1 rounded-lg text-white text-xs font-semibold shadow-sm transition-transform active:scale-95 cursor-pointer shrink-0 ${
              activeGroupCall.mode === "stage"
                ? "bg-indigo-600 hover:bg-indigo-500"
                : "bg-emerald-600 hover:bg-emerald-500"
            }`}
          >
            {activeGroupCall.mode === "stage" ? "Join Stage" : "Join Call"}
          </button>
        </div>
      )}

      {/* 2. Message List with Stream React SDK */}
      <div className="flex-1 min-h-0 relative flex flex-col">
        <MessageList Message={StudyConnectMessageItem} />

        {/* Live Typing Indicator */}
        {typingUserNames.length > 0 && (
          <div className="px-5 py-1.5 flex items-center gap-2 text-xs text-sky-600 dark:text-sky-400 bg-sky-50/60 dark:bg-sky-950/30 border-t border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-bounce" />
            </div>
            <span className="font-medium text-[11px]">
              {typingUserNames.length === 1
                ? `${typingUserNames[0]} is typing...`
                : typingUserNames.length === 2
                ? `${typingUserNames[0]} and ${typingUserNames[1]} are typing...`
                : "Several classmates are typing..."}
            </span>
          </div>
        )}
      </div>

      {/* 3. Composer */}
      <div className="shrink-0 bg-white dark:bg-[#0E1726]">
        {isReadOnly ? (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-center gap-2.5 text-sm text-slate-500 dark:text-slate-400">
            <Lock className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{readOnlyNotice || "Only community administrators can send messages in this channel."}</span>
          </div>
        ) : (
          <StreamMessageComposer
            channel={channel}
            placeholder={
              isDM
                ? `Message ${peer?.name || "classmate"}...`
                : `Message #${channelName}...`
            }
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            editingMessage={editingMessage}
            onCancelEdit={() => setEditingMessage(null)}
            droppedFiles={droppedFiles}
            onFilesProcessed={() => setDroppedFiles(null)}
            isPeerBlocked={isPeerBlocked}
            onUnblockPeer={handleUnblockPeer}
            communityId={isDM ? undefined : (channel.data as any)?.communityId}
          />
        )}
      </div>

      {/* 4. Conversation Info Panel */}
      <ChatInfoPanel
        isOpen={isInfoPanelOpen}
        onClose={() => setIsInfoPanelOpen(false)}
        channel={channel}
        isDM={isDM}
        peer={peer}
        isPeerBlocked={isPeerBlocked}
        onToggleBlockPeer={async () => {
          if (!peer?.id) return;
          const cleanId = fromStreamUserId(peer.id);
          try {
            if (isPeerBlocked) {
              await usersApi.unblockUser(cleanId);
              setBlockedUserIds((prev) =>
                prev.filter(
                  (id) => id !== cleanId && id !== peer.id && id !== toStreamUserId(cleanId)
                )
              );
              addToast(`Unblocked ${peer.name || "user"}`, "success");
            } else {
              await usersApi.blockUser(cleanId);
              setBlockedUserIds((prev) => [...prev, cleanId]);
              addToast(`Blocked ${peer.name || "user"}`, "success");
            }
          } catch {
            addToast("Failed to update block status", "error");
          }
        }}
        onOpenReport={(target) => openReportModal(target)}
        channelName={channelName}
        communityName={communityName}
        onJumpToMessage={(msgId) => jumpToMessage(msgId)}
        onOpenSearch={() => setIsInChatSearchOpen(true)}
        onOpenStarred={() => setIsStarredDrawerOpen(true)}
        onOpenLightbox={openLightbox}
      />

      {/* 5. In-Chat Scoped Message Search Modal */}
      <GlobalMessageSearchModal
        isOpen={isInChatSearchOpen}
        onClose={() => setIsInChatSearchOpen(false)}
        initialScope="current"
        currentConversationId={channel.id}
        currentChannelCid={channel.cid}
        currentChannelId={channel.id}
        currentCommunityId={isDM ? undefined : (channel.data as any)?.communityId}
        currentPeerName={peer?.name}
        currentCircleName={communityName}
        onSelectMessage={(item) => {
          setIsInChatSearchOpen(false);
          jumpToMessage(item.id);
        }}
      />

      {/* 6. Starred Messages Drawer */}
      <StarredMessagesDrawer
        isOpen={isStarredDrawerOpen}
        onClose={() => setIsStarredDrawerOpen(false)}
        onSelectStarredMessage={(record) => {
          setIsStarredDrawerOpen(false);
          jumpToMessage(record.messageId);
        }}
      />

      {/* 7. Call History Modal */}
      <CallHistoryModal
        isOpen={isCallHistoryOpen}
        onClose={() => setIsCallHistoryOpen(false)}
      />
    </div>
  );
}

// Wrapper component managing interaction context across Window and Thread
function StreamChannelWrapper({
  channel,
  channelName,
  isDM = false,
  peer,
  communityName,
  targetMessageId,
  onBack,
  isReadOnly = false,
  readOnlyNotice
}: StreamChannelViewProps) {
  const [replyingTo, setReplyingTo] = useState<LocalMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<LocalMessage | null>(null);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(
    new Set()
  );
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [hiddenMessageIds, setHiddenMessageIds] = useState<Set<string>>(
    new Set()
  );
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(
    targetMessageId || null
  );

  const channelKey = channel.cid || channel.id || "default";
  const hiddenStorageKey = `${HIDDEN_MESSAGES_PREFIX}${channelKey}`;

  // Load hidden messages on channel switch
  useEffect(() => {
    try {
      const stored = localStorage.getItem(hiddenStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setHiddenMessageIds(new Set(parsed));
        }
      } else {
        setHiddenMessageIds(new Set());
      }
    } catch {
      setHiddenMessageIds(new Set());
    }
    // Reset interaction state on channel switch
    setReplyingTo(null);
    setEditingMessage(null);
    setSelectedMessageIds(new Set());
    setIsSelectMode(false);
  }, [channelKey, hiddenStorageKey]);

  // Jump to specific target message with smooth scroll and glowing pulse
  const jumpToMessage = useCallback(
    async (msgId: string) => {
      if (!channel || !msgId) return;

      const inState = channel.state.messages.some((m) => m.id === msgId);
      if (!inState) {
        try {
          await channel.query({
            messages: { id_around: msgId, limit: 30 }
          });
        } catch (err) {
          console.warn("Failed to query messages around target:", err);
        }
      }

      setTimeout(() => {
        const el = document.getElementById(`msg-${msgId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          setHighlightedMessageId(msgId);
          setTimeout(() => {
            setHighlightedMessageId((curr) => (curr === msgId ? null : curr));
          }, 2500);
        }
      }, 100);
    },
    [channel]
  );

  // Jump on initial mount or target change
  useEffect(() => {
    if (targetMessageId) {
      jumpToMessage(targetMessageId);
    }
  }, [targetMessageId, jumpToMessage]);

  // Hide message locally (Delete for Me)
  const hideMessageLocally = useCallback(
    (id: string) => {
      setHiddenMessageIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        try {
          localStorage.setItem(hiddenStorageKey, JSON.stringify(Array.from(next)));
        } catch {}
        return next;
      });
      // Deselect if it was selected
      setSelectedMessageIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [hiddenStorageKey]
  );

  const toggleSelectMessage = useCallback((id: string) => {
    setSelectedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (next.size === 0) setIsSelectMode(false);
      } else {
        next.add(id);
        setIsSelectMode(true);
      }
      return next;
    });
  }, []);

  const handleSetIsSelectMode = useCallback((val: boolean) => {
    setIsSelectMode(val);
    if (!val) {
      setSelectedMessageIds(new Set());
    }
  }, []);

  const [lightboxState, setLightboxState] = useState<{
    isOpen: boolean;
    images: LightboxImage[];
    initialIndex: number;
  }>({
    isOpen: false,
    images: [],
    initialIndex: 0
  });

  const openLightbox = useCallback((images: LightboxImage[], index = 0) => {
    setLightboxState({
      isOpen: true,
      images,
      initialIndex: index
    });
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const { client } = useChatContext();
  const [forwardingMessages, setForwardingMessages] = useState<LocalMessage[]>([]);
  const openForwardModal = useCallback((msgs: LocalMessage[]) => {
    setForwardingMessages(msgs);
  }, []);

  const [reportTarget, setReportTarget] = useState<{
    targetType: "MESSAGE" | "USER" | "COMMUNITY";
    targetId: string;
    targetTitle?: string;
    snippet?: string;
  } | null>(null);

  const openReportModal = useCallback(
    (target: {
      targetType: "MESSAGE" | "USER" | "COMMUNITY";
      targetId: string;
      targetTitle?: string;
      snippet?: string;
    }) => {
      setReportTarget(target);
    },
    []
  );

  const contextValue: MessageInteractionsContextValue = useMemo(
    () => ({
      peer,
      replyingTo,
      setReplyingTo,
      editingMessage,
      setEditingMessage,
      selectedMessageIds,
      toggleSelectMessage,
      isSelectMode,
      setIsSelectMode: handleSetIsSelectMode,
      hiddenMessageIds,
      hideMessageLocally,
      openLightbox,
      highlightedMessageId,
      setHighlightedMessageId,
      jumpToMessage,
      openReportModal,
      openForwardModal
    }),
    [
      peer,
      replyingTo,
      editingMessage,
      selectedMessageIds,
      toggleSelectMessage,
      isSelectMode,
      handleSetIsSelectMode,
      hiddenMessageIds,
      hideMessageLocally,
      openLightbox,
      highlightedMessageId,
      jumpToMessage,
      openReportModal,
      openForwardModal
    ]
  );

  return (
    <MessageInteractionsContext.Provider value={contextValue}>
      <div className="flex w-full h-full min-h-0 overflow-hidden relative">
        <Window>
          <StreamChannelInner
            channel={channel}
            channelName={channelName}
            isDM={isDM}
            peer={peer}
            communityName={communityName}
            onBack={onBack}
            isReadOnly={isReadOnly}
            readOnlyNotice={readOnlyNotice}
          />
        </Window>
        <Thread Message={StudyConnectMessageItem} />

        {/* Fullscreen Media Lightbox Viewer */}
        <MediaLightbox
          isOpen={lightboxState.isOpen}
          images={lightboxState.images}
          initialIndex={lightboxState.initialIndex}
          onClose={closeLightbox}
        />

        {/* Universal Report Modal */}
        <ReportModal
          isOpen={Boolean(reportTarget)}
          onClose={() => setReportTarget(null)}
          targetType={reportTarget?.targetType || "MESSAGE"}
          targetId={reportTarget?.targetId || ""}
          targetTitle={reportTarget?.targetTitle}
          snippet={reportTarget?.snippet}
        />

        {/* Forward Message Destination Picker Modal */}
        <ForwardMessageModal
          isOpen={forwardingMessages.length > 0}
          onClose={() => setForwardingMessages([])}
          messages={forwardingMessages}
          client={client}
          onForwardComplete={() => {
            setForwardingMessages([]);
            setIsSelectMode(false);
          }}
        />
      </div>
    </MessageInteractionsContext.Provider>
  );
}

export function StreamChannelView({
  channel,
  channelName,
  isDM = false,
  peer,
  communityName,
  targetMessageId,
  onBack,
  isReadOnly = false,
  readOnlyNotice
}: StreamChannelViewProps) {
  return (
    <Channel channel={channel}>
      <StreamChannelWrapper
        channel={channel}
        channelName={channelName}
        isDM={isDM}
        peer={peer}
        communityName={communityName}
        targetMessageId={targetMessageId}
        onBack={onBack}
        isReadOnly={isReadOnly}
        readOnlyNotice={readOnlyNotice}
      />
    </Channel>
  );
}
