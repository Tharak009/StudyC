import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ShieldCheck,
  FileText,
  Download,
  Copy,
  Check,
  CheckCheck,
  Smile,
  CornerDownRight,
  Pencil,
  Trash2,
  ExternalLink,
  Star,
  Pin,
  Play,
  Pause,
  Vote,
  Volume2,
  Clock,
  MoreHorizontal,
  MessageCircle
} from "lucide-react";
import type { User } from "../../types/auth";

export interface ChatAttachment {
  name: string;
  size: string;
  type: "pdf" | "code" | "zip" | "image";
  url: string;
}

export interface Reaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface ChatPollOption {
  id: string;
  text: string;
  votes: number;
  votedByMe?: boolean;
}

export interface ChatPoll {
  question: string;
  options: ChatPollOption[];
  totalVotes: number;
}

export interface ChatVoiceNote {
  duration: string;
  waveform: number[];
}

export interface ChatMessageItem {
  id: string;
  sender: {
    id: string;
    name: string;
    roll: string;
    dept: string;
    avatar?: string;
    isVerified?: boolean;
    roleTag?: "ADMIN" | "MODERATOR" | "FACULTY" | "TA" | "STUDENT";
  };
  content: string;
  codeSnippet?: {
    language: string;
    code: string;
  };
  attachments?: ChatAttachment[];
  poll?: ChatPoll;
  voiceNote?: ChatVoiceNote;
  replyTo?: {
    senderName: string;
    content: string;
  };
  reactions?: Reaction[];
  isStarred?: boolean;
  isPinned?: boolean;
  edited?: boolean;
  editedAt?: string;
  timestamp: string;
}

interface MessageListProps {
  messages: ChatMessageItem[];
  currentUser?: User | null;
  onReply?: (msg: ChatMessageItem) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onDelete?: (messageId: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onVotePoll?: (messageId: string, optionId: string) => void;
  onToggleStar?: (messageId: string) => void;
  pinnedMessage?: ChatMessageItem | null;
  onUnpin?: () => void;
}

const quickEmojis = ["👍", "🔥", "❤️", "💡", "🚀", "😂"];

export function MessageList({
  messages,
  currentUser,
  onReply,
  onReact,
  onDelete,
  onEdit,
  onVotePoll,
  onToggleStar,
  pinnedMessage,
  onUnpin
}: MessageListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [voiceSpeed, setVoiceSpeed] = useState<1 | 1.5 | 2>(1);
  const [showPinnedBanner, setShowPinnedBanner] = useState(true);

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const startEdit = (msg: ChatMessageItem) => {
    setEditingId(msg.id);
    setEditDraft(msg.content);
  };

  const saveEdit = (msgId: string) => {
    if (editDraft.trim()) {
      onEdit?.(msgId, editDraft.trim());
    }
    setEditingId(null);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const toggleVoicePlayback = (id: string) => {
    setPlayingVoiceId((prev) => (prev === id ? null : id));
  };

  const cycleVoiceSpeed = () => {
    setVoiceSpeed((prev) => (prev === 1 ? 1.5 : prev === 1.5 ? 2 : 1));
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 relative no-scrollbar">
      {/* ── Discord / WhatsApp Pinned Announcement Banner ─────────────── */}
      {pinnedMessage && showPinnedBanner && (
        <div className="sticky top-0 z-20 mb-4 rounded-2xl border border-[#1E90FF]/30 bg-white/95 dark:bg-[#0c1322]/95 backdrop-blur-xl p-3 shadow-lg flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#1E90FF]/15 text-[#1E90FF]">
              <Pin size={14} className="rotate-45" />
            </div>
            <div className="truncate">
              <span className="font-bold text-slate-900 dark:text-white">
                Pinned by {pinnedMessage.sender.name}:{" "}
              </span>
              <span className="text-slate-600 dark:text-slate-300">
                {pinnedMessage.content}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowPinnedBanner(false)}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ── Empty State when no messages in channel ─────────────────── */}
      {messages.length === 0 && (
        <div className="h-full min-h-[340px] flex flex-col items-center justify-center text-center p-6 space-y-3 select-none">
          <div className="h-16 w-16 rounded-3xl bg-[#1E90FF]/10 text-[#1E90FF] flex items-center justify-center shadow-inner">
            <MessageCircle size={30} />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
              No Messages in this Channel Yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
              Type a message, attach lecture slides, or launch a quick poll below to start testing the conversation!
            </p>
          </div>
        </div>
      )}

      {/* ── Messages Feed ─────────────────────────────────────────────── */}
      {messages
        .filter((msg) => !(pinnedMessage && showPinnedBanner && msg.id === pinnedMessage.id))
        .map((msg) => {
        const isOwn =
          currentUser?._id === msg.sender.id ||
          currentUser?.fullName === msg.sender.name;
        const isEditing = editingId === msg.id;

        return (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            onMouseEnter={() => setHoveredMsgId(msg.id)}
            onMouseLeave={() => setHoveredMsgId(null)}
            className={`group relative flex items-start gap-3 transition-colors ${
              isOwn ? "flex-row-reverse" : "flex-row"
            }`}
          >
            {/* ── Student Avatar ─────────────────────────────────────── */}
            <div className="relative shrink-0 mt-0.5">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-2xl font-bold text-xs shadow-sm ${
                  isOwn
                    ? "bg-[#1E90FF] text-white"
                    : msg.sender.roleTag === "TA"
                    ? "bg-gradient-to-tr from-emerald-500 to-teal-400 text-white"
                    : "bg-[#1E90FF] text-white"
                }`}
              >
                {getInitials(msg.sender.name)}
              </div>
              {msg.sender.isVerified && (
                <span
                  title="Verified .edu Student"
                  className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#1E90FF] text-white ring-2 ring-white dark:ring-[#080D1A]"
                >
                  <ShieldCheck size={10} />
                </span>
              )}
            </div>

            {/* ── Message Bubble Container ───────────────────────────── */}
            <div
              className={`flex-1 max-w-[85%] sm:max-w-[75%] ${
                isOwn ? "items-end text-right" : "items-start text-left"
              }`}
            >
              {/* Header Info: Sender Name, Roll No, Role Tag & Time */}
              <div
                className={`flex items-center gap-2 mb-1 text-[11px] ${
                  isOwn ? "justify-end" : "justify-start"
                }`}
              >
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {msg.sender.name}
                </span>

                {msg.sender.roleTag && msg.sender.roleTag !== "STUDENT" && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                      msg.sender.roleTag === "FACULTY"
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    }`}
                  >
                    {msg.sender.roleTag}
                  </span>
                )}

                <span className="text-[10px] tabular-nums text-slate-400">
                  {msg.sender.roll}
                </span>

                <span className="text-[10px] text-slate-400">
                  {msg.timestamp}
                </span>

                {/* Starred Indicator */}
                {msg.isStarred && (
                  <Star size={11} className="text-amber-400 fill-amber-400" />
                )}
              </div>

              {/* ── Quoted Reply Context ─────────────────────────────── */}
              {msg.replyTo && (
                <div
                  className={`mb-1.5 text-xs p-2 rounded-xl border-l-2 bg-slate-100/80 dark:bg-white/[0.04] max-w-md ${
                    isOwn
                      ? "border-[#1E90FF] text-left ml-auto"
                      : "border-[#1E90FF]/60 text-left"
                  }`}
                >
                  <div className="flex items-center gap-1 text-[10px] font-bold text-[#1E90FF]">
                    <CornerDownRight size={10} />
                    <span>@{msg.replyTo.senderName}</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 truncate text-[11px] mt-0.5">
                    {msg.replyTo.content}
                  </p>
                </div>
              )}

              {/* ── Main Message Bubble Surface (Cobalt Mist Style) ──── */}
              <div
                className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm transition-all ${
                  isOwn
                    ? "bg-[#1E90FF]/15 dark:bg-[#1E90FF]/25 border border-[#1E90FF]/30 text-slate-900 dark:text-white rounded-tr-none"
                    : "bg-white dark:bg-[#0F1A30]/90 border border-slate-200/80 dark:border-white/[0.07] text-slate-800 dark:text-slate-200 rounded-tl-none"
                }`}
              >
                {/* Editing Inline Mode */}
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      className="w-full p-2 text-xs rounded-xl border border-[#1E90FF] bg-white dark:bg-[#080D1A] text-slate-900 dark:text-white focus:outline-none"
                      rows={2}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2.5 py-1 text-[11px] font-bold text-slate-400 hover:text-slate-600"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveEdit(msg.id)}
                        className="px-3 py-1 rounded-lg bg-[#1E90FF] hover:bg-[#187bcd] text-white text-[11px] font-bold"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}

                {/* ── Interactive WhatsApp/Discord Poll ────────────────── */}
                {msg.poll && (
                  <div className="mt-3 p-3.5 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                        <Vote size={14} className="text-[#1E90FF]" />
                        <span>{msg.poll.question}</span>
                      </div>
                      <span className="text-[10px] tabular-nums text-slate-400 font-bold">
                        {msg.poll.totalVotes} votes
                      </span>
                    </div>

                    <div className="space-y-2">
                      {msg.poll.options.map((opt) => {
                        const pct = msg.poll!.totalVotes
                          ? Math.round((opt.votes / msg.poll!.totalVotes) * 100)
                          : 0;

                        return (
                          <div
                            key={opt.id}
                            onClick={() => onVotePoll?.(msg.id, opt.id)}
                            className={`relative overflow-hidden p-2 rounded-xl border cursor-pointer transition-all ${
                              opt.votedByMe
                                ? "border-[#1E90FF] bg-[#1E90FF]/10 text-[#1E90FF] font-bold"
                                : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {/* Animated progress fill */}
                            <div
                              style={{ width: `${pct}%` }}
                              className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                                opt.votedByMe
                                  ? "bg-[#1E90FF]/20"
                                  : "bg-slate-200/60 dark:bg-white/[0.04]"
                              }`}
                            />

                            <div className="relative flex items-center justify-between text-xs px-1">
                              <div className="flex items-center gap-2">
                                <span className="h-3.5 w-3.5 rounded-full border border-current flex items-center justify-center text-[9px]">
                                  {opt.votedByMe && "✓"}
                                </span>
                                <span>{opt.text}</span>
                              </div>
                              <span className="tabular-nums text-[11px]">
                                {pct}% ({opt.votes})
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── WhatsApp-Style Voice Note Waveform ──────────────── */}
                {msg.voiceNote && (
                  <div className="mt-2.5 p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleVoicePlayback(msg.id)}
                      className="h-8 w-8 rounded-full bg-[#1E90FF] hover:bg-[#187bcd] text-white flex items-center justify-center shrink-0 shadow-sm cursor-pointer hover:scale-105 transition-transform"
                    >
                      {playingVoiceId === msg.id ? (
                        <Pause size={14} />
                      ) : (
                        <Play size={14} className="ml-0.5" />
                      )}
                    </button>

                    {/* Simulated Waveform Bars */}
                    <div className="flex-1 flex items-center gap-0.5 h-6">
                      {msg.voiceNote.waveform.map((height, idx) => (
                        <div
                          key={idx}
                          style={{ height: `${height}%` }}
                          className={`w-1 rounded-full transition-all ${
                            playingVoiceId === msg.id && idx < 16
                              ? "bg-[#1E90FF] animate-pulse"
                              : "bg-slate-300 dark:bg-slate-600"
                          }`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] tabular-nums text-slate-400">
                      <span>{msg.voiceNote.duration}</span>
                      <button
                        type="button"
                        onClick={cycleVoiceSpeed}
                        className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-300"
                      >
                        {voiceSpeed}x
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Code Snippet Block (Discord Style) ──────────────── */}
                {msg.codeSnippet && (
                  <div className="mt-3 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-900 text-slate-100 text-left font-mono">
                    <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/80 border-b border-slate-700/80 text-[10px]">
                      <span className="font-bold text-[#1E90FF]">
                        {msg.codeSnippet.language}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyCode(msg.id, msg.codeSnippet!.code)
                        }
                        className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check size={11} className="text-emerald-400" />
                            <span className="text-emerald-400 font-bold">
                              Copied!
                            </span>
                          </>
                        ) : (
                          <>
                            <Copy size={11} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-3 text-[11px] overflow-x-auto no-scrollbar">
                      <code>{msg.codeSnippet.code}</code>
                    </pre>
                  </div>
                )}

                {/* ── File Attachments ─────────────────────────────────── */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-2.5 space-y-1.5">
                    {msg.attachments.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
                            <FileText size={16} />
                          </div>
                          <div className="flex flex-col truncate text-left">
                            <span className="font-bold text-xs truncate">
                              {file.name}
                            </span>
                            <span className="text-[10px] tabular-nums text-slate-400">
                              {file.size} • Resource Vault
                            </span>
                          </div>
                        </div>

                        <a
                          href={file.url}
                          download={file.name}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#1E90FF] hover:bg-[#1E90FF]/10 transition-colors"
                          title="Download note"
                        >
                          <Download size={14} />
                        </a>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer Metadata in Bubble: Edited tag & WhatsApp read checkmarks */}
                <div
                  className={`flex items-center gap-1.5 mt-1.5 text-[10px] text-slate-400 ${
                    isOwn ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.edited && <span className="italic">(edited)</span>}
                  {isOwn && (
                    <span
                      title="Read by classmates"
                      className="text-[#1E90FF] font-bold"
                    >
                      <CheckCheck size={13} />
                    </span>
                  )}
                </div>
              </div>

              {/* ── Live Emoji Reaction Badges Under Bubble ─────────── */}
              {msg.reactions && msg.reactions.length > 0 && (
                <div
                  className={`flex items-center gap-1 mt-1.5 flex-wrap ${
                    isOwn ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.reactions.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => onReact?.(msg.id, r.emoji)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-slate-100 dark:bg-[#162544] border border-slate-200 dark:border-white/10 hover:border-[#1E90FF] transition-colors cursor-pointer"
                    >
                      <span>{r.emoji}</span>
                      <span className="font-bold tabular-nums text-[10px] text-slate-600 dark:text-slate-300">
                        {r.count}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Floating Discord/WhatsApp Message Action Bar ───────── */}
            <div
              className={`absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center gap-0.5 p-1 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0c1322]/95 backdrop-blur-md shadow-xl ${
                isOwn ? "left-12 -top-3" : "right-12 -top-3"
              }`}
            >
              {quickEmojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onReact?.(msg.id, emoji)}
                  className="p-1 text-xs hover:scale-125 transition-transform cursor-pointer"
                >
                  {emoji}
                </button>
              ))}

              <div className="h-3 w-px bg-slate-200 dark:bg-white/10 mx-0.5" />

              {/* Reply Button */}
              <button
                type="button"
                onClick={() => onReply?.(msg)}
                title="Reply"
                className="p-1.5 rounded-lg text-slate-400 hover:text-[#1E90FF] hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <CornerDownRight size={13} />
              </button>

              {/* Star / Bookmark (WhatsApp style) */}
              <button
                type="button"
                onClick={() => onToggleStar?.(msg.id)}
                title={msg.isStarred ? "Unstar" : "Star message"}
                className={`p-1.5 rounded-lg transition-colors ${
                  msg.isStarred
                    ? "text-amber-400"
                    : "text-slate-400 hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-white/10"
                }`}
              >
                <Star size={13} />
              </button>

              {/* Edit (if own) */}
              {isOwn && (
                <button
                  type="button"
                  onClick={() => startEdit(msg)}
                  title="Edit message"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-[#1E90FF] hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                >
                  <Pencil size={13} />
                </button>
              )}

              {/* Delete (if own) */}
              {isOwn && (
                <button
                  type="button"
                  onClick={() => onDelete?.(msg.id)}
                  title="Delete message"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export default MessageList;
