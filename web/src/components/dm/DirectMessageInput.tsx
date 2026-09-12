import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Paperclip,
  Code2,
  Smile,
  X,
  FileText,
  Mic,
  Image,
  Square,
  Sparkles,
  Check
} from "lucide-react";
import { useToastStore } from "../../store/toast.store";

interface DirectMessageInputProps {
  peerName: string;
  onSendMessage: (
    content: string,
    codeSnippet?: { language: string; code: string },
    files?: File[],
    voiceNote?: { duration: string; url?: string }
  ) => void;
  onTyping?: (isTyping: boolean) => void;
  isPeerTyping?: boolean;
  replyTarget?: { senderName: string; content: string } | null;
  onCancelReply?: () => void;
}

const COMMON_EMOJIS = [
  "👍", "❤️", "🔥", "🙌", "✨", "🎉", "😊", "😂", 
  "💡", "🚀", "📚", "💻", "✅", "⚡", "🤝", "💯"
];

export function DirectMessageInput({
  peerName,
  onSendMessage,
  onTyping,
  isPeerTyping = false,
  replyTarget,
  onCancelReply
}: DirectMessageInputProps) {
  const [content, setContent] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [codeDrawerOpen, setCodeDrawerOpen] = useState(false);
  const [codeLang, setCodeLang] = useState("C++");
  const [codeText, setCodeText] = useState("");
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Voice recording simulation state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { addToast } = useToastStore();

  useEffect(() => {
    if (isRecordingVoice) {
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      setRecordingSeconds(0);
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [isRecordingVoice]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    // Trigger typing emission
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
      const validFiles: File[] = [];

      for (const file of filesArr) {
        if (file.size > 15 * 1024 * 1024) {
          addToast(`File ${file.name} exceeds 15MB maximum limit.`, "warning");
        } else {
          validFiles.push(file);
        }
      }

      setSelectedFiles((prev) => [...prev, ...validFiles]);
      setAttachMenuOpen(false);
    }
  };

  const removeFile = (idx: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleInsertEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
    setEmojiPickerOpen(false);
  };

  const handleStartVoiceRecording = () => {
    setIsRecordingVoice(true);
  };

  const handleCancelVoiceRecording = () => {
    setIsRecordingVoice(false);
  };

  const handleSendVoiceNote = () => {
    const mins = Math.floor(recordingSeconds / 60);
    const secs = recordingSeconds % 60;
    const duration = `${mins}:${secs < 10 ? "0" : ""}${secs}`;

    onSendMessage(
      "🎙️ Voice Note",
      undefined,
      undefined,
      { duration: duration === "0:00" ? "0:05" : duration }
    );

    setIsRecordingVoice(false);
    addToast("Voice note sent", "success");
  };

  const handleSubmit = async () => {
    if (isSending) return;
    if (!content.trim() && !codeText.trim() && selectedFiles.length === 0) return;

    const codeObj = codeDrawerOpen && codeText.trim()
      ? { language: codeLang, code: codeText.trim() }
      : undefined;

    const toSend = content.trim();
    const filesToSend = selectedFiles.length > 0 ? selectedFiles : undefined;

    setContent("");
    setCodeText("");
    setCodeDrawerOpen(false);
    setSelectedFiles([]);
    setAttachMenuOpen(false);
    setEmojiPickerOpen(false);
    onTyping?.(false);
    onCancelReply?.();

    setIsSending(true);
    try {
      await onSendMessage(toSend, codeObj, filesToSend);
    } finally {
      setIsSending(false);
    }
  };

  const hasContentToSend = content.trim().length > 0 || codeText.trim().length > 0 || selectedFiles.length > 0;

  return (
    <div className="relative p-3 sm:p-4 shrink-0 bg-white/95 dark:bg-[#0c1424]/95 border-t border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl z-20">
      
      {/* ── Live Peer Typing Feedback Banner ─────────────────────────── */}
      <AnimatePresence>
        {isPeerTyping && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="flex items-center gap-2 mb-2 px-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold"
          >
            <span className="flex gap-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" />
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce delay-100" />
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce delay-200" />
            </span>
            <span>{peerName} is typing...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Quoted Reply Target Banner ────────────────────────────────── */}
      <AnimatePresence>
        {replyTarget && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2.5 flex items-center justify-between rounded-2xl border border-[#1E90FF]/30 bg-[#1E90FF]/10 px-3.5 py-1.5 text-xs shadow-xs"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="text-[11px] font-bold text-[#1E90FF]">
                Replying to {replyTarget.senderName}:
              </span>
              <span className="text-slate-600 dark:text-slate-300 truncate max-w-sm">
                "{replyTarget.content}"
              </span>
            </div>
            <button
              type="button"
              onClick={onCancelReply}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Selected Attachments Queue ────────────────────────────────── */}
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2.5">
          {selectedFiles.map((file, fIdx) => (
            <div
              key={fIdx}
              className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-2.5 py-1 text-[11px] text-slate-700 dark:text-slate-300 shadow-xs"
            >
              <FileText size={12} className="text-[#1E90FF] shrink-0" />
              <span className="truncate max-w-[130px] font-medium">{file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(fIdx)}
                className="text-slate-400 hover:text-rose-500 cursor-pointer"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── WhatsApp-Style Code Snippet Drawer ────────────────────────── */}
      <AnimatePresence>
        {codeDrawerOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 p-3 shadow-xl"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <Code2 size={15} className="text-[#1E90FF]" />
                <span className="font-bold text-slate-200">Share Code Snippet</span>
                <select
                  value={codeLang}
                  onChange={(e) => setCodeLang(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-800 text-[#1E90FF] text-xs px-2.5 py-0.5 outline-none font-semibold"
                >
                  {["C++", "Python", "Java", "TypeScript", "SQL", "Rust", "Go", "C"].map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => setCodeDrawerOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
            <textarea
              placeholder="Paste or type formatted source code..."
              value={codeText}
              onChange={(e) => setCodeText(e.target.value)}
              rows={3}
              className="w-full bg-slate-950/90 rounded-xl p-2.5 font-mono text-xs text-[#1E90FF]/90 placeholder-slate-500 focus:outline-none scrollbar-none"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── WhatsApp-Style Emoji Picker Popover ───────────────────────── */}
      <AnimatePresence>
        {emojiPickerOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute bottom-16 left-4 z-30 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F1A30] shadow-2xl backdrop-blur-xl w-64"
          >
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Campus Reactions
            </div>
            <div className="grid grid-cols-8 gap-1.5">
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleInsertEmoji(emoji)}
                  className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-base hover:scale-125 transition-transform cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── WhatsApp-Style Attachment Menu Popup ──────────────────────── */}
      <AnimatePresence>
        {attachMenuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute bottom-16 left-12 z-30 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F1A30] shadow-2xl backdrop-blur-xl w-48 space-y-1"
          >
            {/* Document */}
            <button
              type="button"
              onClick={() => {
                fileInputRef.current?.click();
                setAttachMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <div className="p-1.5 rounded-lg bg-[#1E90FF]/10 text-[#1E90FF]">
                <FileText size={15} />
              </div>
              <span>Document</span>
            </button>

            {/* Photo / Media */}
            <button
              type="button"
              onClick={() => {
                imageInputRef.current?.click();
                setAttachMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                <Image size={15} />
              </div>
              <span>Photos & Media</span>
            </button>

            {/* Code Snippet */}
            <button
              type="button"
              onClick={() => {
                setCodeDrawerOpen(true);
                setAttachMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                <Code2 size={15} />
              </div>
              <span>Code Snippet</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        accept=".pdf,.doc,.docx,.zip,.tar,.gz,.ipynb,.cpp,.java,.py"
      />
      <input
        ref={imageInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*"
      />

      {/* ── Main WhatsApp Input Bar ───────────────────────────────────── */}
      {isRecordingVoice ? (
        /* WhatsApp Voice Recording Dock */
        <div className="flex items-center justify-between gap-3 p-2 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400">
          <div className="flex items-center gap-2.5 px-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
            <span className="font-bold tabular-nums text-xs">
              Recording 0:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancelVoiceRecording}
              className="px-3 py-1 rounded-xl text-xs font-semibold hover:bg-rose-500/20 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSendVoiceNote}
              className="h-8 px-3 rounded-xl bg-rose-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm hover:bg-rose-700 transition-colors cursor-pointer"
            >
              <Send size={12} />
              <span>Send Voice</span>
            </button>
          </div>
        </div>
      ) : (
        /* Regular Input Dock */
        <div className="relative flex items-center gap-2 rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-slate-50/80 dark:bg-[#080D1A]/90 px-3 py-1.5 shadow-sm backdrop-blur-2xl transition-all focus-within:border-[#1E90FF]/50">
          
          {/* Emoji Toggle */}
          <button
            type="button"
            onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer shrink-0 ${
              emojiPickerOpen
                ? "text-[#1E90FF] bg-[#1E90FF]/10"
                : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
            title="Emoji"
          >
            <Smile size={18} />
          </button>

          {/* Paperclip Attachment Menu Toggle */}
          <button
            type="button"
            onClick={() => setAttachMenuOpen(!attachMenuOpen)}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer shrink-0 ${
              attachMenuOpen
                ? "text-[#1E90FF] bg-[#1E90FF]/10"
                : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
            title="Attach file or code"
          >
            <Paperclip size={18} />
          </button>

          {/* Message Textarea */}
          <textarea
            rows={1}
            placeholder={`Message ${peerName}...`}
            value={content}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent py-1.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none resize-none max-h-32 leading-relaxed"
          />

          {/* Dynamic Action Button: Mic when empty, Send when text/attachments ready */}
          {hasContentToSend ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              className="h-9 w-9 rounded-2xl bg-[#1E90FF] hover:bg-[#187bcd] flex items-center justify-center text-white shadow-md shadow-[#1E90FF]/25 hover:shadow-lg transition-all cursor-pointer shrink-0"
              title="Send Message"
            >
              <Send size={15} />
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleStartVoiceRecording}
              className="h-9 w-9 rounded-2xl bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#1E90FF] flex items-center justify-center transition-all cursor-pointer shrink-0"
              title="Record Voice Note"
            >
              <Mic size={17} />
            </motion.button>
          )}

        </div>
      )}
    </div>
  );
}

export default DirectMessageInput;
