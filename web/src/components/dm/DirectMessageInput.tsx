import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Paperclip,
  Code2,
  Smile,
  X,
  FileText,
  Mic,
  Image as ImageIcon,
  Square,
  Sparkles,
  Check,
  Lock,
  Edit2,
  UploadCloud,
  FileArchive,
  FileSpreadsheet,
  FileCode
} from "lucide-react";
import { useToastStore } from "../../store/toast.store";
import { useDirectMessageStore } from "../../store/direct-message.store";
import { VoiceRecorderDock } from "../chat/media/VoiceRecorderDock";

export interface DMVoiceNotePayload {
  file?: File;
  duration: string;
  durationSec?: number;
  waveform?: number[];
  url?: string;
}

interface DirectMessageInputProps {
  conversationId?: string;
  peerName: string;
  onSendMessage: (
    content: string,
    codeSnippet?: { language: string; code: string },
    files?: File[],
    voiceNote?: DMVoiceNotePayload
  ) => void;
  onTyping?: (isTyping: boolean) => void;
  isPeerTyping?: boolean;
  replyTarget?: { senderName: string; content: string } | null;
  onCancelReply?: () => void;
  editingTarget?: { id: string; content: string } | null;
  onCancelEdit?: () => void;
  onSaveEdit?: (messageId: string, newContent: string) => void;
  isLocked?: boolean;
  lockedReason?: string;
}

const COMMON_EMOJIS = [
  "👍", "❤️", "🔥", "🙌", "✨", "🎉", "😊", "😂", 
  "💡", "🚀", "📚", "💻", "✅", "⚡", "🤝", "💯"
];

export function DirectMessageInput({
  conversationId,
  peerName,
  onSendMessage,
  onTyping,
  isPeerTyping = false,
  replyTarget,
  onCancelReply,
  editingTarget,
  onCancelEdit,
  onSaveEdit,
  isLocked = false,
  lockedReason = ""
}: DirectMessageInputProps) {
  const drafts = useDirectMessageStore((state) => state.drafts);
  const setDraft = useDirectMessageStore((state) => state.setDraft);
  const clearDraft = useDirectMessageStore((state) => state.clearDraft);

  const [content, setContent] = useState(() => {
    if (conversationId && drafts[conversationId]) {
      return drafts[conversationId];
    }
    return "";
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [codeDrawerOpen, setCodeDrawerOpen] = useState(false);
  const [codeLang, setCodeLang] = useState("C++");
  const [codeText, setCodeText] = useState("");
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { addToast } = useToastStore();

  // Object URLs for image previews
  const filePreviews = useMemo(() => {
    return selectedFiles.map((file) => ({
      file,
      isImage: file.type.startsWith("image/"),
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null
    }));
  }, [selectedFiles]);

  useEffect(() => {
    return () => {
      filePreviews.forEach((p) => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      });
    };
  }, [filePreviews]);

  useEffect(() => {
    if (editingTarget) {
      setContent(editingTarget.content);
    }
  }, [editingTarget]);

  useEffect(() => {
    if (conversationId && drafts[conversationId] !== undefined && !editingTarget) {
      setContent(drafts[conversationId]);
    } else if (!editingTarget) {
      setContent("");
    }
  }, [conversationId, editingTarget]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    if (conversationId && !editingTarget) {
      setDraft(conversationId, val);
    }

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

  const handleAddFiles = (filesArr: File[]) => {
    const validFiles: File[] = [];

    for (const file of filesArr) {
      if (file.size > 25 * 1024 * 1024) {
        addToast(`File "${file.name}" exceeds 25MB maximum limit.`, "warning");
      } else {
        validFiles.push(file);
      }
    }

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleAddFiles(Array.from(e.target.files));
      e.target.value = "";
      setAttachMenuOpen(false);
    }
  };

  const removeFile = (idx: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
      e.preventDefault();
      const files = Array.from(e.clipboardData.files);
      handleAddFiles(files);
      addToast(
        files.length === 1 && files[0].type.startsWith("image/")
          ? "Image pasted from clipboard"
          : `${files.length} attachment(s) pasted from clipboard`,
        "info"
      );
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleInsertEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
    setEmojiPickerOpen(false);
  };

  const handleSendVoiceNote = (voiceFile: File, durationSec: number, waveform: number[]) => {
    const mins = Math.floor(durationSec / 60);
    const secs = Math.floor(durationSec % 60);
    const duration = `${mins}:${secs < 10 ? "0" : ""}${secs}`;

    onSendMessage(
      "",
      undefined,
      undefined,
      {
        file: voiceFile,
        duration: duration === "0:00" ? "0:05" : duration,
        durationSec,
        waveform
      }
    );

    setIsRecordingVoice(false);
    addToast("Voice note sent", "success");
  };

  const getFileIcon = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (file.type.includes("pdf") || ext === "pdf") return <FileText size={14} className="text-rose-500" />;
    if (["zip", "tar", "gz", "rar"].includes(ext)) return <FileArchive size={14} className="text-amber-500" />;
    if (["xls", "xlsx", "csv"].includes(ext)) return <FileSpreadsheet size={14} className="text-emerald-500" />;
    if (["js", "ts", "py", "java", "cpp", "c", "html", "css"].includes(ext)) return <FileCode size={14} className="text-cyan-500" />;
    return <FileText size={14} className="text-[#1E90FF]" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async () => {
    if (isSending) return;
    if (!content.trim() && !codeText.trim() && selectedFiles.length === 0) return;

    if (editingTarget && onSaveEdit) {
      if (!content.trim()) return;
      const toSave = content.trim();
      setContent("");
      onCancelEdit?.();
      onSaveEdit(editingTarget.id, toSave);
      return;
    }

    const codeObj = codeDrawerOpen && codeText.trim()
      ? { language: codeLang, code: codeText.trim() }
      : undefined;

    const toSend = content.trim();
    const filesToSend = selectedFiles.length > 0 ? selectedFiles : undefined;

    setContent("");
    if (conversationId) {
      clearDraft(conversationId);
    }
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
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative p-3 sm:p-4 shrink-0 bg-white/95 dark:bg-[#0c1424]/95 border-t border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl z-20"
    >
      {/* ── Drag & Drop Active Overlay ───────────────────────────────── */}
      <AnimatePresence>
        {isDraggingOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#1E90FF]/15 border-2 border-dashed border-[#1E90FF] rounded-2xl z-40 backdrop-blur-xs flex items-center justify-center pointer-events-none"
          >
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white dark:bg-[#0c1424] shadow-xl text-[#1E90FF] font-bold text-xs">
              <UploadCloud size={18} className="animate-bounce" />
              <span>Drop photos or documents here to attach</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* ── Editing Message Target Banner ────────────────────────────── */}
      <AnimatePresence>
        {editingTarget && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2.5 flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs shadow-xs"
          >
            <div className="flex items-center gap-2 truncate">
              <Edit2 size={13} className="text-emerald-500 shrink-0" />
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                Editing message:
              </span>
              <span className="text-slate-600 dark:text-slate-300 truncate max-w-sm">
                "{editingTarget.content}"
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setContent("");
                onCancelEdit?.();
              }}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title="Cancel editing"
            >
              <X size={13} />
            </button>
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

      {/* ── Selected Attachments Queue (Thumbnails & File Pills) ──────── */}
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-2.5 max-h-36 overflow-y-auto no-scrollbar p-1">
          {filePreviews.map(({ file, isImage, previewUrl }, fIdx) => (
            <div
              key={fIdx}
              className={`relative group rounded-xl border transition-all ${
                isImage
                  ? "w-14 h-14 overflow-hidden border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                  : "flex items-center gap-2 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-2.5 py-1.5 text-[11px] text-slate-700 dark:text-slate-300 shadow-xs"
              }`}
            >
              {isImage && previewUrl ? (
                <>
                  <img
                    src={previewUrl}
                    alt={file.name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => removeFile(fIdx)}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white hover:bg-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                    title="Remove photo"
                  >
                    <X size={11} />
                  </button>
                </>
              ) : (
                <>
                  {getFileIcon(file)}
                  <div className="flex flex-col truncate max-w-[130px]">
                    <span className="truncate font-medium leading-tight">{file.name}</span>
                    <span className="text-[9px] text-slate-400 tabular-nums">{formatSize(file.size)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(fIdx)}
                    className="text-slate-400 hover:text-rose-500 cursor-pointer p-0.5 ml-1"
                    title="Remove file"
                  >
                    <X size={12} />
                  </button>
                </>
              )}
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
                <ImageIcon size={15} />
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
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.tar,.gz,.rar,.txt,.md,.ipynb,.cpp,.java,.py"
      />
      <input
        ref={imageInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*"
      />

      {/* ── Main WhatsApp Input Bar or Voice Recording Dock ───────────── */}
      {isLocked ? (
        /* Locked Conversation State */
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-3xl bg-slate-100/90 dark:bg-[#111b21]/90 border border-amber-500/30 text-slate-500 dark:text-slate-400 select-none shadow-md backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Lock size={16} className="animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                This conversation is locked
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {lockedReason || "New direct messages cannot be sent while this chat is locked."}
              </span>
            </div>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500">
            Locked
          </span>
        </div>
      ) : isRecordingVoice ? (
        /* WhatsApp-Style In-Browser Voice Recording Dock */
        <VoiceRecorderDock
          isOpen={isRecordingVoice}
          onCancel={() => setIsRecordingVoice(false)}
          onSendVoice={handleSendVoiceNote}
        />
      ) : (
        /* Regular Input Dock */
        <div className="relative flex items-center gap-2 rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-slate-50/80 dark:bg-[#080D1A]/90 px-3 py-1.5 shadow-sm backdrop-blur-2xl transition-all focus-within:border-[#1E90FF]/50">
          
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
            <Paperclip size={19} />
          </button>

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
            <Smile size={19} />
          </button>

          {/* Message Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder="Type a message or paste images (Ctrl+V)..."
            value={content}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            className="flex-1 bg-transparent py-1.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none resize-none max-h-32 leading-relaxed"
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
              onClick={() => setIsRecordingVoice(true)}
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
