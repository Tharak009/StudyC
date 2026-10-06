import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { Channel as StreamChannel, FormatMessageResponse } from "stream-chat";
import {
  Hash,
  MessageSquare,
  Radio,
  Clock,
  Check,
  CheckCheck,
  AlertCircle,
  RotateCcw,
  Loader2,
  Calendar,
  Sparkles,
  ArrowDown
} from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import { fromStreamUserId } from "../../utils/stream-id";
import { StreamMessageComposer } from "./StreamMessageComposer";
import type { ActivePeer } from "../dm/ConversationHeader";

interface StreamMessageStreamProps {
  channel: StreamChannel;
  channelName: string;
  isDM?: boolean;
  peer?: ActivePeer | null;
}

// Format message timestamp
function formatMessageTime(dateString?: string | Date): string {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Format date separator label
function formatDateSeparator(dateString?: string | Date): string {
  if (!dateString) return "";
  const d = new Date(dateString);
  const now = new Date();

  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (isToday) return "Today";

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return "Yesterday";

  return d.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined
  });
}

// Safe formatting of message text supporting inline code and code snippets
function FormattedMessageContent({ text }: { text?: string }) {
  if (!text) return null;

  // Handle multi-line code blocks: ```code```
  if (text.startsWith("```") && text.endsWith("```")) {
    const lines = text.slice(3, -3).trim().split("\n");
    const firstLine = lines[0]?.trim() || "";
    const hasLang = /^[a-zA-Z0-9_-]+$/.test(firstLine);
    const code = hasLang ? lines.slice(1).join("\n") : lines.join("\n");

    return (
      <div className="my-1.5 rounded-xl bg-slate-900 text-slate-100 p-3 font-mono text-xs overflow-x-auto border border-slate-700/50">
        {hasLang && (
          <div className="text-[10px] uppercase font-bold text-sky-400 mb-1 tracking-wider">
            {firstLine}
          </div>
        )}
        <pre className="whitespace-pre">
          <code>{code}</code>
        </pre>
      </div>
    );
  }

  // Handle inline code: `code`
  const parts = text.split(/(`[^`]+`)/g);

  return (
    <p className="whitespace-pre-wrap break-words leading-relaxed text-sm">
      {parts.map((part, index) => {
        if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
          return (
            <code
              key={index}
              className="px-1.5 py-0.5 mx-0.5 rounded-md font-mono text-xs bg-slate-200/80 dark:bg-slate-800 text-sky-600 dark:text-sky-300 border border-slate-300/60 dark:border-slate-700"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      })}
    </p>
  );
}

export function StreamMessageStream({
  channel,
  channelName,
  isDM = false,
  peer
}: StreamMessageStreamProps) {
  const authUser = useAuthStore((state) => state.user);
  const currentUserId = authUser?._id;

  const [messages, setMessages] = useState<FormatMessageResponse[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isAutoScrollEnabledRef = useRef<boolean>(true);

  const channelKey = channel.cid || channel.id;

  // Mark channel read helper
  const markChannelRead = useCallback(() => {
    if (channel && typeof channel.markRead === "function") {
      channel.markRead().catch(() => {});
    }
  }, [channel]);

  // Initial channel history loading
  useEffect(() => {
    if (!channel) return;

    let isMounted = true;

    async function loadChannelHistory() {
      try {
        setLoadingInitial(true);
        setTypingUsers({});

        // Query initial messages through Stream SDK
        const response = await channel.query({
          messages: { limit: 30 }
        });

        if (isMounted) {
          const loaded = (channel.state.messages && channel.state.messages.length > 0)
            ? channel.state.messages
            : ((response.messages as any[]) || []);
          setMessages([...(loaded as any[])]);
          setHasMoreOlder(loaded.length >= 30);
          markChannelRead();
        }
      } catch (err) {
        console.warn(`Failed to query messages for channel ${channelKey}:`, err);
        if (isMounted) {
          setMessages([...(channel.state.messages || [])]);
        }
      } finally {
        if (isMounted) setLoadingInitial(false);
      }
    }

    loadChannelHistory();

    return () => {
      isMounted = false;
    };
  }, [channel, channelKey, markChannelRead]);

  // Real-time Event Subscriptions via Stream Channel
  useEffect(() => {
    if (!channel) return;

    const handleNewMessage = (event: any) => {
      // Re-sync messages array from channel state
      setMessages([...(channel.state.messages || [])]);

      // Automatically mark as read if this channel is active
      markChannelRead();

      // Auto-scroll to bottom on new message
      if (isAutoScrollEnabledRef.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    };

    const handleUpdatedMessage = () => {
      setMessages([...(channel.state.messages || [])]);
    };

    const handleDeletedMessage = () => {
      setMessages([...(channel.state.messages || [])]);
    };

    const handleMessageRead = () => {
      // Trigger re-render to update read receipts
      setMessages([...(channel.state.messages || [])]);
    };

    const handleTypingStart = (event: any) => {
      if (!event.user) return;
      const rawUserId = fromStreamUserId(event.user.id || "");
      if (rawUserId === currentUserId || event.user.id === channel.getClient().userID) {
        return;
      }
      setTypingUsers((prev) => ({
        ...prev,
        [event.user.id]: event.user.name || "Classmate"
      }));
    };

    const handleTypingStop = (event: any) => {
      if (!event.user) return;
      setTypingUsers((prev) => {
        const updated = { ...prev };
        delete updated[event.user.id];
        return updated;
      });
    };

    channel.on("message.new", handleNewMessage);
    channel.on("message.updated", handleUpdatedMessage);
    channel.on("message.deleted", handleDeletedMessage);
    channel.on("message.read", handleMessageRead);
    channel.on("typing.start", handleTypingStart);
    channel.on("typing.stop", handleTypingStop);

    return () => {
      channel.off("message.new", handleNewMessage);
      channel.off("message.updated", handleUpdatedMessage);
      channel.off("message.deleted", handleDeletedMessage);
      channel.off("message.read", handleMessageRead);
      channel.off("typing.start", handleTypingStart);
      channel.off("typing.stop", handleTypingStop);
    };
  }, [channel, currentUserId, markChannelRead]);

  // Handle scroll events (detect near-bottom for auto-scroll and show scroll button)
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    isAutoScrollEnabledRef.current = isAtBottom;
    setShowScrollBottom(!isAtBottom && messages.length > 5);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Pagination: Fetch older messages from Stream
  const handleLoadOlder = async () => {
    if (loadingOlder || !hasMoreOlder || messages.length === 0) return;

    try {
      setLoadingOlder(true);
      const oldestMsg = messages[0];
      const container = scrollContainerRef.current;
      const oldScrollHeight = container?.scrollHeight || 0;

      const response = await channel.query({
        messages: { limit: 30, id_lt: oldestMsg.id }
      });

      const olderMessages = response.messages || [];
      if (olderMessages.length < 30) {
        setHasMoreOlder(false);
      }

      setMessages([...(channel.state.messages || [])]);

      // Preserve scroll position
      setTimeout(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = newScrollHeight - oldScrollHeight;
        }
      }, 0);
    } catch (err) {
      console.warn("Error loading older messages from Stream:", err);
    } finally {
      setLoadingOlder(false);
    }
  };

  // Retry sending failed message
  const handleRetry = async (msg: FormatMessageResponse) => {
    try {
      if (typeof (channel as any).retryMessage === "function") {
        await (channel as any).retryMessage(msg);
      } else {
        await channel.sendMessage({ text: msg.text || "" });
      }
      setMessages([...(channel.state.messages || [])]);
    } catch (err) {
      console.error("Failed to retry message:", err);
    }
  };

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: Array<{ date: string; items: FormatMessageResponse[] }> = [];
    let currentDate = "";

    messages.forEach((msg) => {
      const msgDate = msg.created_at
        ? new Date(msg.created_at).toDateString()
        : new Date().toDateString();

      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msgDate, items: [msg] });
      } else {
        groups[groups.length - 1].items.push(msg);
      }
    });

    return groups;
  }, [messages]);

  // Typing indicator text
  const typingUserNames = Object.values(typingUsers);
  const typingText = useMemo(() => {
    if (typingUserNames.length === 0) return null;
    if (typingUserNames.length === 1) return `${typingUserNames[0]} is typing...`;
    if (typingUserNames.length === 2)
      return `${typingUserNames[0]} and ${typingUserNames[1]} are typing...`;
    return `${typingUserNames[0]} and ${typingUserNames.length - 1} others are typing...`;
  }, [typingUserNames]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#0B1220] relative">
      {/* ── Channel Header Ambient Banner ── */}
      <div className="px-5 py-2.5 bg-slate-50/90 dark:bg-[#0E1726]/90 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs shrink-0 select-none z-10 backdrop-blur-xs">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <Radio size={13} className="text-[#005FFF] animate-pulse shrink-0" />
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            Stream Chat Realtime
          </span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="font-mono text-[11px] text-slate-500 truncate max-w-xs">
            {channel.cid || channel.id}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Connected</span>
          </div>
        </div>
      </div>

      {/* ── Messages Viewport ── */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6"
      >
        {/* Load older messages button */}
        {hasMoreOlder && messages.length > 0 && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={handleLoadOlder}
              disabled={loadingOlder}
              className="px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-2 cursor-pointer shadow-2xs border border-slate-200 dark:border-slate-700"
            >
              {loadingOlder ? (
                <>
                  <Loader2 size={13} className="animate-spin text-[#005FFF]" />
                  <span>Loading history...</span>
                </>
              ) : (
                <span>Load earlier messages</span>
              )}
            </button>
          </div>
        )}

        {/* Welcome Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-sky-500/5 via-violet-500/5 to-transparent border border-sky-500/15 dark:border-sky-500/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-[#005FFF]/10 dark:bg-[#005FFF]/20 text-[#005FFF] flex items-center justify-center font-bold shrink-0">
              {isDM ? <MessageSquare size={22} /> : <Hash size={22} />}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                {isDM ? `Conversation with ${channelName}` : `Welcome to #${channelName}`}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isDM
                  ? "This is the start of your direct messaging thread. Messages sync across all devices in real-time."
                  : "This is the start of the community study channel. Share questions, notes, and academic discussions."}
              </p>
            </div>
          </div>
        </div>

        {/* Initial Loading Spinner */}
        {loadingInitial && messages.length === 0 && (
          <div className="h-32 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 size={24} className="animate-spin text-[#005FFF]" />
            <span className="text-xs">Loading message stream...</span>
          </div>
        )}

        {/* Empty State */}
        {!loadingInitial && messages.length === 0 && (
          <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-slate-500">
            <MessageSquare size={36} className="mb-2.5 opacity-40 text-[#005FFF]" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No messages yet
            </p>
            <p className="text-xs mt-1 max-w-xs">
              Say hello and start the conversation! Your message will be delivered instantly via Stream Chat.
            </p>
          </div>
        )}

        {/* Message Groups by Date */}
        {groupedMessages.map((group) => (
          <div key={group.date} className="space-y-4">
            {/* Date Separator Pill */}
            <div className="relative flex items-center justify-center my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200/80 dark:border-slate-800" />
              </div>
              <span className="relative px-3 py-1 rounded-full bg-slate-100 dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 shadow-2xs">
                {formatDateSeparator(group.date)}
              </span>
            </div>

            {/* Messages in Group */}
            {group.items.map((msg) => {
              const rawSenderId = fromStreamUserId(msg.user?.id || "");
              const isMine =
                rawSenderId === currentUserId ||
                msg.user?.id === currentUserId ||
                msg.user?.id === channel.getClient().userID;

              const senderName = (msg.user?.name as string) || "Classmate";
              const senderAvatar = (msg.user?.image as string) || undefined;
              const senderRoll = ((msg.user as any)?.rollNumber as string) || "";
              const senderDept = ((msg.user as any)?.department as string) || "";

              const status = msg.status; // 'sending' | 'received' | 'failed'
              const isFailed = status === "failed";
              const isSending = status === "sending";

              return (
                <div
                  key={msg.id}
                  className={`group flex items-start gap-3 ${
                    isMine ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {/* Avatar */}
                  {senderAvatar ? (
                    <img
                      src={senderAvatar}
                      alt={senderName}
                      className="w-8 h-8 rounded-full object-cover shrink-0 mt-1 shadow-2xs ring-1 ring-slate-200 dark:ring-slate-800"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-1 shadow-2xs">
                      {senderName.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  {/* Message Bubble Container */}
                  <div
                    className={`max-w-[85%] sm:max-w-lg flex flex-col ${
                      isMine ? "items-end" : "items-start"
                    }`}
                  >
                    {/* Header: Sender Name & Time */}
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {isMine ? "You" : senderName}
                      </span>

                      {!isMine && (senderRoll || senderDept) && (
                        <span className="text-[10px] text-slate-400">
                          ({[senderRoll, senderDept].filter(Boolean).join(" • ")})
                        </span>
                      )}

                      <span className="text-[10px] text-slate-400">
                        {formatMessageTime(msg.created_at)}
                      </span>
                    </div>

                    {/* Bubble */}
                    <div
                      className={`relative px-4 py-2.5 rounded-2xl text-sm leading-relaxed transition-all ${
                        isMine
                          ? isFailed
                            ? "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-900 rounded-tr-xs"
                            : "bg-[#005FFF] text-white rounded-tr-xs shadow-xs"
                          : "bg-slate-100 dark:bg-[#162235] text-slate-900 dark:text-slate-100 rounded-tl-xs border border-slate-200/80 dark:border-slate-800/80 shadow-2xs"
                      }`}
                    >
                      <FormattedMessageContent text={msg.text} />

                      {/* Delivery Status Indicator (for own messages) */}
                      {isMine && (
                        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-80">
                          {isSending && (
                            <span className="inline-flex items-center gap-1 text-white/80">
                              <Clock size={11} className="animate-spin" />
                              <span>Sending</span>
                            </span>
                          )}

                          {status === "received" && (
                            <span className="inline-flex items-center gap-1 text-white/80" title="Delivered">
                              <Check size={12} />
                            </span>
                          )}

                          {isFailed && (
                            <button
                              type="button"
                              onClick={() => handleRetry(msg)}
                              className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold cursor-pointer hover:underline"
                            >
                              <AlertCircle size={12} />
                              <span>Failed — Retry</span>
                              <RotateCcw size={10} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Scroll To Bottom Floating Button ── */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute right-6 bottom-24 p-2.5 rounded-full bg-[#005FFF] text-white shadow-lg hover:bg-[#0052db] transition-all cursor-pointer z-20 active:scale-95 flex items-center justify-center"
          title="Jump to latest message"
        >
          <ArrowDown size={16} />
        </button>
      )}

      {/* ── Active Typing Indicator Banner ── */}
      {typingText && (
        <div className="px-5 py-1.5 bg-slate-50/90 dark:bg-[#0D1524]/90 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2 text-xs text-[#005FFF] select-none">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#005FFF] animate-bounce" />
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#005FFF] animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#005FFF] animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
          <span className="font-medium italic text-[11px]">{typingText}</span>
        </div>
      )}

      {/* ── Stream Message Composer ── */}
      <StreamMessageComposer
        channel={channel}
        placeholder={
          isDM
            ? `Message ${channelName}...`
            : `Message #${channelName}...`
        }
      />
    </div>
  );
}
export default StreamMessageStream;
