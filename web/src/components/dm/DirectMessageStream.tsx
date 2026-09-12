import React, { useEffect, useRef, useState } from "react";
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
  Smile,
  Play,
  Pause,
  Volume2,
  Mic,
  MoreHorizontal,
  MessageSquare
} from "lucide-react";
import type { User } from "../../types/auth";

export interface DirectMessageItem {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  attachments?: Array<{
    name: string;
    size: string;
    type: string;
    url: string;
  }>;
  replyTo?: {
    senderName: string;
    content: string;
  };
  codeSnippet?: {
    language: string;
    code: string;
  };
  voiceNote?: {
    duration: string;
    url?: string;
  };
  reactions?: Record<string, string[]>; // emoji -> array of user names
  isRead: boolean;
  isDelivered?: boolean;
  time: string;
  createdAt: string;
}

interface DirectMessageStreamProps {
  messages: DirectMessageItem[];
  currentUser?: User | null;
  onReply?: (msg: DirectMessageItem) => void;
  onReact?: (messageId: string, emoji: string) => void;
  searchQuery?: string;
}

const QUICK_EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🙏"];

export function DirectMessageStream({
  messages,
  currentUser,
  onReply,
  onReact,
  searchQuery = ""
}: DirectMessageStreamProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const toggleVoicePlay = (msgId: string) => {
    setPlayingVoiceId((prev) => (prev === msgId ? null : msgId));
  };

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippetId(id);
    setTimeout(() => setCopiedSnippetId(null), 2000);
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
    <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 relative bg-slate-100/60 dark:bg-[#080D1A]/60 select-text scrollbar-none transition-colors duration-200">
      
      {/* ── Modern Dot Texture Overlay ─────────────────── */}
      <div
        className="absolute inset-0 opacity-[0.035] dark:opacity-[0.06] pointer-events-none bg-repeat"
        style={{
          backgroundImage: `radial-gradient(currentColor 1.2px, transparent 1.2px)`,
          backgroundSize: "20px 20px"
        }}
      />

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
          searchQuery.trim().length > 1 &&
          msg.content.toLowerCase().includes(searchQuery.toLowerCase());

        return (
          <React.Fragment key={msg.id}>
            
            {/* ── WhatsApp Date Pill Separator ─────────────────────────── */}
            {showDateSeparator && (
              <div className="flex justify-center my-3 sticky top-2 z-10">
                <span className="px-3.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-white/80 dark:bg-[#111C33]/90 text-slate-600 dark:text-slate-300 shadow-sm border border-slate-200/60 dark:border-slate-800/60 backdrop-blur-md">
                  {formatDateLabel(msg.createdAt)}
                </span>
              </div>
            )}

            {/* ── Message Row ─────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.15 }}
              onMouseEnter={() => setHoveredMessageId(msg.id)}
              onMouseLeave={() => setHoveredMessageId(null)}
              className={`group relative flex flex-col ${isMe ? "items-end" : "items-start"} ${
                isHighlight ? "ring-2 ring-amber-400/60 rounded-3xl p-1" : ""
              }`}
            >
              
              {/* WhatsApp Quick Reaction Hover Bar */}
              <AnimatePresence>
                {hoveredMessageId === msg.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.12 }}
                    className={`absolute -top-7 ${isMe ? "right-2" : "left-2"} z-20 flex items-center gap-1 p-1 rounded-full bg-white dark:bg-[#0F1A30] border border-slate-200 dark:border-slate-700 shadow-lg backdrop-blur-md`}
                  >
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => onReact?.(msg.id, emoji)}
                        className="h-6 w-6 rounded-full hover:scale-125 transition-transform flex items-center justify-center text-xs cursor-pointer"
                        title={`React with ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}

                    <div className="h-3 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

                    <button
                      type="button"
                      onClick={() => onReply?.(msg)}
                      className="p-1 rounded-full text-slate-400 hover:text-[#1E90FF] transition-colors cursor-pointer"
                      title="Reply"
                    >
                      <Reply size={12} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Message Bubble ───────────────────────────── */}
              <div
                className={`relative max-w-[85%] sm:max-w-md md:max-w-lg p-3 sm:px-4 sm:py-2.5 shadow-sm transition-all select-text ${
                  isMe
                    ? "bg-gradient-to-br from-[#1E90FF] to-[#187bcd] text-white rounded-2xl rounded-tr-xs shadow-[0_2px_12px_rgba(30,144,255,0.22)]"
                    : "bg-white/95 dark:bg-[#111C33]/95 border border-slate-200/80 dark:border-slate-800/80 text-slate-900 dark:text-slate-100 rounded-2xl rounded-tl-xs shadow-slate-200/40 dark:shadow-none"
                }`}
              >
                {/* Quoted Reply Context */}
                {msg.replyTo && (
                  <div
                    className={`mb-2 pl-2.5 py-1 text-[11px] rounded-r-lg border-l-3 ${
                      isMe
                        ? "border-blue-200 bg-white/15 text-white"
                        : "border-[#1E90FF] bg-[#1E90FF]/10 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className={`font-bold text-[10px] flex items-center gap-1 ${isMe ? "text-white" : "text-[#1E90FF]"}`}>
                      <CornerDownRight size={10} />
                      <span>{msg.replyTo.senderName}</span>
                    </div>
                    <p className="truncate italic text-[11px] opacity-90">
                      {msg.replyTo.content}
                    </p>
                  </div>
                )}

                {/* Main Message Text */}
                {msg.content && (
                  <p className="text-xs sm:text-[13px] leading-relaxed break-words whitespace-pre-wrap">
                    {msg.content}
                  </p>
                )}

                {/* ── WhatsApp Voice Note Simulation Widget ───────────── */}
                {msg.voiceNote && (
                  <div className="mt-1 flex items-center gap-2.5 p-2 rounded-xl bg-black/10 dark:bg-black/20">
                    <button
                      type="button"
                      onClick={() => toggleVoicePlay(msg.id)}
                      className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                        isMe ? "bg-white text-[#1E90FF]" : "bg-[#1E90FF] text-white"
                      }`}
                    >
                      {playingVoiceId === msg.id ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                    </button>

                    <div className="flex-1 flex flex-col gap-1">
                      {/* Waveform visualization simulation */}
                      <div className="flex items-center gap-0.5 h-4">
                        {[40, 70, 30, 90, 60, 45, 80, 100, 65, 30, 85, 55, 95, 40, 60, 75, 50].map((h, i) => (
                          <div
                            key={i}
                            className={`w-0.5 rounded-full transition-all ${
                              playingVoiceId === msg.id
                                ? isMe ? "bg-white animate-pulse" : "bg-[#1E90FF] animate-pulse"
                                : isMe ? "bg-white/50" : "bg-slate-400/50 dark:bg-slate-600"
                            }`}
                            style={{ height: `${h}%` }}
                          />
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-[9px] opacity-80 tabular-nums">
                        <span className="flex items-center gap-1">
                          <Mic size={9} />
                          Voice Note
                        </span>
                        <span>{msg.voiceNote.duration}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Code Snippet Attachment ───────────────────────────── */}
                {msg.codeSnippet && (
                  <div className="mt-2 rounded-xl bg-slate-950 text-slate-100 font-mono text-[11px] overflow-hidden border border-slate-800 shadow-inner">
                    <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-900 border-b border-slate-800 text-[10px] text-[#1E90FF]">
                      <div className="flex items-center gap-1.5">
                        <FileCode size={11} />
                        <span className="font-bold">{msg.codeSnippet.language}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(msg.id, msg.codeSnippet!.code)}
                        className="text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Copy size={11} />
                        <span>{copiedSnippetId === msg.id ? "Copied!" : "Copy"}</span>
                      </button>
                    </div>
                    <pre className="p-2.5 text-[#1E90FF]/90 overflow-x-auto max-h-48 scrollbar-none leading-relaxed">
                      <code>{msg.codeSnippet.code}</code>
                    </pre>
                  </div>
                )}

                {/* ── File Attachments (WhatsApp Document Card) ──────────── */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {msg.attachments.map((att, aIdx) => (
                      <div
                        key={aIdx}
                        className={`flex items-center justify-between gap-2.5 p-2 rounded-xl border ${
                          isMe
                            ? "bg-white/10 border-white/20 text-white"
                            : "bg-slate-50 dark:bg-[#080D1A] border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="p-1.5 rounded-lg bg-[#1E90FF]/15 text-[#1E90FF] shrink-0">
                            <FileText size={16} />
                          </div>
                          <div className="truncate">
                            <span className="text-xs font-bold truncate max-w-[170px] block">
                              {att.name}
                            </span>
                            <span className="text-[10px] opacity-75 tabular-nums block">
                              {att.size} • {att.type.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <a
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg hover:bg-white/20 transition-colors shrink-0"
                          title="Download Note"
                        >
                          <Download size={14} />
                        </a>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Timestamp & Delivery Checkmarks (WhatsApp Web style) ─ */}
                <div
                  className={`mt-1 flex items-center justify-end gap-1 text-[10px] tabular-nums leading-none ${
                    isMe ? "text-white/80" : "text-slate-400"
                  }`}
                >
                  <span>{msg.time}</span>

                  {isMe && (
                    <span
                      className="ml-0.5 inline-flex items-center"
                      title={msg.isRead ? "Read" : msg.isDelivered ? "Delivered" : "Sent"}
                    >
                      {msg.isRead ? (
                        <CheckCheck size={13} className="text-white" />
                      ) : msg.isDelivered ? (
                        <CheckCheck size={13} className="text-white/70" />
                      ) : (
                        <Check size={13} className="text-white/70" />
                      )}
                    </span>
                  )}
                </div>

                {/* ── Reaction Badges Pill ─────────────────────────────── */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className={`absolute -bottom-2.5 ${isMe ? "right-2" : "left-2"} flex items-center gap-0.5 bg-white dark:bg-[#0F1A30] border border-slate-200 dark:border-slate-800 rounded-full px-1.5 py-0.2 shadow-sm text-[11px]`}>
                    {Object.entries(msg.reactions).map(([emoji, users]) => (
                      <span key={emoji} title={users.join(", ")} className="cursor-pointer">
                        {emoji}
                        {users.length > 1 && (
                          <span className="text-[9px] font-bold text-slate-500 ml-0.5">
                            {users.length}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                )}

              </div>
            </motion.div>
          </React.Fragment>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

export default DirectMessageStream;
