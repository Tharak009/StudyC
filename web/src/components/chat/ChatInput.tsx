import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Paperclip,
  Code2,
  Smile,
  X,
  Sparkles,
  FileText,
  Vote,
  Mic,
  Square,
  Plus,
  ArrowUp,
  CornerDownRight,
  Bold,
  Italic,
  Code,
  Link,
  HelpCircle,
  CheckCircle2,
  Lock,
  ShieldAlert
} from "lucide-react";
import type { ChatPoll } from "./MessageList";
import { recordStudyActivity } from "../../utils/streak";
import { AcademicRejectionBanner, type RejectionData } from "./AcademicRejectionBanner";
import { socketService } from "../../services/socket.service";
import { useToastStore } from "../../store/toast.store";

interface ChatInputProps {
  channelName: string;
  onSendMessage: (
    content: string,
    codeSnippet?: { language: string; code: string; title?: string },
    files?: File[],
    poll?: ChatPoll,
    voiceNote?: { duration: string; waveform: number[] },
    intent?: "chat" | "question" | "solution" | "code"
  ) => void;
  onTyping?: (isTyping: boolean) => void;
  typingUsers?: string[];
  replyTarget?: { senderName: string; content: string } | null;
  onCancelReply?: () => void;
  onSwitchToChannel?: (targetChannelName: string, draftContent?: string) => void;
  isLocked?: boolean;
  lockedReason?: string;
  isModeratorOrAdmin?: boolean;
}

const supportedLanguages = ["C++", "Python", "TypeScript", "JavaScript", "Java", "SQL", "Rust"];
const emojiOptions = ["👍", "🔥", "🚀", "❤️", "💡", "😂", "🎉", "👏", "🙌", "✨", "💯", "🤯", "📚", "💻", "☕"];

export function ChatInput({
  channelName,
  onSendMessage,
  onTyping,
  typingUsers = [],
  replyTarget,
  onCancelReply,
  onSwitchToChannel,
  isLocked = false,
  lockedReason = "",
  isModeratorOrAdmin = false
}: ChatInputProps) {
  const [content, setContent] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [intent, setIntent] = useState<"chat" | "question" | "solution" | "code">("chat");

  const insertMarkdown = (prefix: string, suffix: string = prefix) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.substring(start, end);
    const replacement = `${prefix}${selected || "text"}${suffix}`;
    const nextContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(nextContent);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + (selected ? selected.length : 4));
    }, 0);
  };
  
  // Code drawer state
  const [codeDrawerOpen, setCodeDrawerOpen] = useState(false);
  const [codeLang, setCodeLang] = useState(supportedLanguages[0]);
  const [codeText, setCodeText] = useState("");

  // Poll drawer state (WhatsApp feature)
  const [pollOpen, setPollOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);

  // Voice recording state (WhatsApp feature)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Emoji picker state
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const { addToast } = useToastStore();
  const [rejectionData, setRejectionData] = useState<RejectionData | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  // Live Socket interception listeners
  useEffect(() => {
    const socket = socketService.get();
    if (!socket) return;

    const handleRejected = (payload: RejectionData) => {
      // 1. Restore exact draft immediately so student never loses text
      if (payload.originalContent) {
        setContent(payload.originalContent);
      }
      // 2. Display AcademicRejectionBanner
      setRejectionData(payload);
      // 3. Trigger lively shake animation
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
      // 4. Focus textarea
      textareaRef.current?.focus();
    };

    const handleTimedOut = (payload: {
      channelId?: string;
      remainingSeconds?: number;
      message?: string;
    }) => {
      addToast(
        payload.message ||
          `You are currently timed out from #${channelName} for ${
            payload.remainingSeconds || 300
          }s.`,
        "error"
      );
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
    };

    socket.on("chat:messageRejected", handleRejected);
    socket.on("chat:userTimedOut", handleTimedOut);

    return () => {
      socket.off("chat:messageRejected", handleRejected);
      socket.off("chat:userTimedOut", handleTimedOut);
    };
  }, [addToast, channelName]);

  // Handle typing debounce
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    onTyping?.(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      onTyping?.(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArr]);
    }
  };

  const removeFile = (idx: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // Voice Recording simulation
  const startRecording = () => {
    setIsRecording(true);
    setRecordingSeconds(0);
    recordIntervalRef.current = setInterval(() => {
      setRecordingSeconds((sec) => sec + 1);
    }, 1000);
  };

  const stopRecording = (send: boolean) => {
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    setIsRecording(false);

    if (send && recordingSeconds > 0) {
      const mins = Math.floor(recordingSeconds / 60);
      const secs = recordingSeconds % 60;
      const durationStr = `${mins}:${secs < 10 ? "0" : ""}${secs}`;
      const randomWaveform = Array.from({ length: 24 }, () =>
        Math.floor(Math.random() * 70) + 20
      );

      recordStudyActivity();
      onSendMessage(
        "🎤 Voice Note",
        undefined,
        undefined,
        undefined,
        { duration: durationStr, waveform: randomWaveform }
      );
    }
    setRecordingSeconds(0);
  };

  // Poll option handling
  const addPollOption = () => {
    if (pollOptions.length < 5) {
      setPollOptions((prev) => [...prev, ""]);
    }
  };

  const updatePollOption = (index: number, val: string) => {
    setPollOptions((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleSendPoll = () => {
    const validOptions = pollOptions.filter((o) => o.trim().length > 0);
    if (!pollQuestion.trim() || validOptions.length < 2) return;

    const pollObj: ChatPoll = {
      question: pollQuestion.trim(),
      options: validOptions.map((opt, i) => ({
        id: `opt-${i}`,
        text: opt.trim(),
        votes: 0
      })),
      totalVotes: 0
    };

    recordStudyActivity();
    onSendMessage("📊 Campus Poll", undefined, undefined, pollObj);
    setPollQuestion("");
    setPollOptions(["", ""]);
    setPollOpen(false);
  };

  const handleSubmit = () => {
    if (!content.trim() && !codeText.trim() && selectedFiles.length === 0) return;

    const codeObj =
      codeDrawerOpen && codeText.trim()
        ? { language: codeLang, code: codeText.trim() }
        : undefined;

    recordStudyActivity();
    onSendMessage(
      content.trim(),
      codeObj,
      selectedFiles.length > 0 ? selectedFiles : undefined,
      undefined,
      undefined,
      intent
    );

    setContent("");
    setCodeText("");
    setCodeDrawerOpen(false);
    setSelectedFiles([]);
    setIntent("chat");
    onTyping?.(false);
    onCancelReply?.();
  };

  const addEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
    setEmojiOpen(false);
  };

  return (
    <div className="relative p-3 sm:p-4 shrink-0 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent dark:from-[#080D1A] dark:via-[#080D1A]/90 dark:to-transparent">
      {/* ── Live Typing Feedback Banner ───────────────────────────────── */}
      <AnimatePresence>
        {typingUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="flex items-center gap-2 mb-2 px-2 text-[11px] text-[#1E90FF]"
          >
            <span className="flex gap-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" />
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce delay-100" />
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce delay-200" />
            </span>
            <span>
              {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Strict Academic Mode Rejection Banner ────────────────────────── */}
      <AnimatePresence>
        {rejectionData && (
          <AcademicRejectionBanner
            data={rejectionData}
            onDismiss={() => setRejectionData(null)}
            onSwitchToLounge={(draft) => {
              setRejectionData(null);
              onSwitchToChannel?.("campus-lounge", draft);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Quoted Reply Target Banner ────────────────────────────────── */}
      <AnimatePresence>
        {replyTarget && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2 flex items-center justify-between rounded-2xl border border-[#1E90FF]/40 bg-[#1E90FF]/10 dark:bg-[#1E90FF]/15 px-3.5 py-1.5 text-xs"
          >
            <div className="flex items-center gap-2 truncate">
              <CornerDownRight size={12} className="text-[#1E90FF] shrink-0" />
              <span className="text-[11px] font-bold text-[#1E90FF]">
                Replying to @{replyTarget.senderName}:
              </span>
              <span className="text-slate-600 dark:text-slate-300 truncate max-w-sm">
                {replyTarget.content}
              </span>
            </div>
            <button
              onClick={onCancelReply}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Discord Code Snippet Input Drawer ─────────────────────────── */}
      <AnimatePresence>
        {codeDrawerOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-900 dark:bg-[#0B1324] p-3 shadow-xl space-y-2 overflow-hidden"
          >
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Code2 size={14} className="text-[#1E90FF]" />
                <span className="font-bold text-white text-xs">
                  Attach Code Snippet
                </span>
                <select
                  value={codeLang}
                  onChange={(e) => setCodeLang(e.target.value)}
                  className="rounded-lg bg-slate-800 dark:bg-slate-900 border border-slate-700 px-2 py-0.5 text-xs font-semibold text-[#1E90FF] focus:outline-none"
                >
                  {supportedLanguages.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setCodeDrawerOpen(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <textarea
              value={codeText}
              onChange={(e) => setCodeText(e.target.value)}
              placeholder={`// Paste your ${codeLang} code or algorithm here...`}
              rows={4}
              className="w-full p-2.5 font-mono text-xs rounded-xl bg-slate-950/80 dark:bg-[#080D1A] border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#1E90FF]"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── WhatsApp Interactive Poll Creator Drawer ─────────────────── */}
      <AnimatePresence>
        {pollOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0B1324] p-4 shadow-xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Vote size={16} className="text-[#1E90FF]" />
                <span className="font-bold text-xs text-slate-900 dark:text-white">
                  Create Study Poll
                </span>
              </div>
              <button
                onClick={() => setPollOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <input
              type="text"
              placeholder="Ask a question (e.g. When should we meet for Lab 4?)"
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              className="w-full p-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1E90FF]"
            />

            <div className="space-y-1.5">
              {pollOptions.map((opt, i) => (
                <input
                  key={i}
                  type="text"
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={(e) => updatePollOption(i, e.target.value)}
                  className="w-full p-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                />
              ))}
            </div>

            <div className="flex items-center justify-between pt-1 text-xs">
              <button
                type="button"
                onClick={addPollOption}
                className="text-[11px] font-bold text-[#1E90FF] hover:underline cursor-pointer"
              >
                + Add another option
              </button>

              <button
                type="button"
                onClick={handleSendPoll}
                className="px-3 py-1 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-md shadow-[#1E90FF]/20 cursor-pointer"
              >
                Post Poll
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Files Attachment Pill Previews ───────────────────────────── */}
      {selectedFiles.length > 0 && (
        <div className="flex items-center gap-2 mb-2 overflow-x-auto no-scrollbar">
          {selectedFiles.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#1E90FF]/10 border border-[#1E90FF]/20 text-xs font-bold text-[#1E90FF]"
            >
              <FileText size={12} />
              <span className="truncate max-w-[120px]">{f.name}</span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="hover:text-red-500 ml-1"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── WhatsApp-Style Voice Recording In-Progress Banner ─────────── */}
      {isRecording ? (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 animate-pulse">
          <div className="flex items-center gap-2.5">
            <span className="h-3 w-3 rounded-full bg-rose-500" />
            <span className="text-xs font-bold">
              Recording Voice Note... ({recordingSeconds}s)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => stopRecording(false)}
              className="px-3 py-1 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => stopRecording(true)}
              className="px-3.5 py-1 rounded-xl bg-rose-500 text-white text-xs font-bold shadow-sm"
            >
              Send Note
            </button>
          </div>
        </div>
      ) : isLocked && !isModeratorOrAdmin ? (
        /* ── Channel Locked State for Non-Moderators ── */
        <div className="flex items-center justify-between gap-3 p-4 rounded-3xl bg-slate-100/90 dark:bg-[#0B1324]/90 border border-amber-500/30 text-slate-500 dark:text-slate-400 select-none shadow-md backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Lock size={18} className="animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>Channel Locked</span>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-500/15 text-amber-400 font-mono">
                  Read Only
                </span>
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {lockedReason || "This channel is locked. Only moderators and faculty can post new messages."}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {/* ── Academic Intent Pills & Markdown Quick Toolbar ── */}
          <div className="flex items-center justify-between gap-2 px-2 text-xs">
            {/* Intent Pills & Moderator Override Badge */}
            <div className="flex items-center gap-1">
              {isLocked && isModeratorOrAdmin && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 mr-1.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                  <ShieldAlert size={11} />
                  <span>Admin Override</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setIntent("chat")}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  intent === "chat"
                    ? "bg-[#1E90FF]/15 text-[#1E90FF] border border-[#1E90FF]/30 font-bold"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Chat
              </button>
              <button
                type="button"
                onClick={() => setIntent("question")}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  intent === "question"
                    ? "bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30 font-bold"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                ❓ Question
              </button>
              <button
                type="button"
                onClick={() => setIntent("solution")}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  intent === "solution"
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 font-bold"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                💡 Solution
              </button>
              <button
                type="button"
                onClick={() => {
                  setIntent("code");
                  setCodeDrawerOpen(true);
                }}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  intent === "code"
                    ? "bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30 font-bold"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                💻 Code
              </button>
            </div>

            {/* Markdown Action Hotkeys */}
            <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
              <button
                type="button"
                onClick={() => insertMarkdown("**")}
                className="p-1 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#162544] rounded transition-colors cursor-pointer"
                title="Bold (**text**)"
              >
                <Bold size={13} />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown("*")}
                className="p-1 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#162544] rounded transition-colors cursor-pointer"
                title="Italic (*text*)"
              >
                <Italic size={13} />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown("`")}
                className="p-1 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#162544] rounded transition-colors cursor-pointer"
                title="Inline Code (`code`)"
              >
                <Code size={13} />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown("$")}
                className="px-1 py-0.5 font-mono text-[10px] hover:text-[#1E90FF] hover:bg-slate-100 dark:hover:bg-[#162544] rounded transition-colors cursor-pointer"
                title="LaTeX Math ($x^2$ or $$\sum$$)"
              >
                $x$
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown("[", "](url)")}
                className="p-1 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#162544] rounded transition-colors cursor-pointer"
                title="Link ([title](url))"
              >
                <Link size={13} />
              </button>
            </div>
          </div>

          {/* ── Main Input Card Surface (WhatsApp + Discord Blend) ───────── */}
          <motion.div
            animate={isShaking ? { x: [-12, 12, -10, 10, -6, 6, -2, 2, 0] } : {}}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="relative flex items-end gap-2 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-[#0B1324]/95 backdrop-blur-xl p-2 shadow-lg"
          >
          {/* ── Left Action Sheet Trigger (+) ─────────────────────────── */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              title="Add attachments, polls, code"
              className={`p-2 rounded-2xl transition-all cursor-pointer ${
                menuOpen
                  ? "bg-[#1E90FF] text-white rotate-45 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#162544] hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              <Plus size={18} />
            </button>

            {/* WhatsApp Attachment Popover Menu */}
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  className="absolute bottom-12 left-0 w-52 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0B1324] shadow-2xl p-1.5 z-50 text-xs space-y-0.5"
                >
                  <button
                    type="button"
                    onClick={() => {
                      fileInputRef.current?.click();
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#162544] font-bold text-left cursor-pointer"
                  >
                    <FileText size={15} className="text-red-500" />
                    <span>Upload Study Note / PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCodeDrawerOpen(true);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#162544] font-bold text-left cursor-pointer"
                  >
                    <Code2 size={15} className="text-[#1E90FF]" />
                    <span>Attach Code Snippet</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPollOpen(true);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#162544] font-bold text-left cursor-pointer"
                  >
                    <Vote size={15} className="text-emerald-500" />
                    <span>Create Campus Poll</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              className="hidden"
            />
          </div>

          {/* ── Center Auto-Expanding Textarea ────────────────────────── */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={content}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={`Message #${channelName}... (Shift+Enter for newline)`}
            className="flex-1 max-h-32 min-h-[38px] py-2 px-2 bg-transparent text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
          />

          {/* ── Right Action Controls ─────────────────────────────────── */}
          <div className="flex items-center gap-1 shrink-0 pb-0.5">
            {/* Emoji Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setEmojiOpen(!emojiOpen)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#162544] transition-colors cursor-pointer"
                title="Add Emoji"
              >
                <Smile size={18} />
              </button>

              {/* Emoji Picker Tray */}
              <AnimatePresence>
                {emojiOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    className="absolute bottom-12 right-0 w-64 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0B1324] shadow-2xl p-2.5 z-50"
                  >
                    <div className="grid grid-cols-5 gap-1.5 text-lg">
                      {emojiOptions.map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => addEmoji(em)}
                          className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-[#162544] flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Voice Memo Button or Send Button */}
            {content.trim() || selectedFiles.length > 0 || codeText.trim() ? (
              <button
                type="button"
                onClick={handleSubmit}
                title="Send Message (Enter)"
                className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#1E90FF] hover:bg-[#187bcd] text-white shadow-md shadow-[#1E90FF]/30 hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <ArrowUp size={18} strokeWidth={2.5} />
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                title="Hold or click to record voice note (WhatsApp style)"
                className="flex h-9 w-9 items-center justify-center rounded-2xl text-slate-400 hover:text-[#1E90FF] hover:bg-[#1E90FF]/10 dark:hover:bg-[#1E90FF]/10 transition-colors cursor-pointer shrink-0"
              >
                <Mic size={18} />
              </button>
            )}
          </div>
        </motion.div>
        </div>
      )}
    </div>
  );
}

export default ChatInput;
