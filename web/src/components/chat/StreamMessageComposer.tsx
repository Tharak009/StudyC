import React, { useState, useEffect, useRef, useCallback } from "react";
import type { Channel as StreamChannel, LocalMessage, Attachment } from "stream-chat";
import {
  Send,
  Smile,
  Loader2,
  Reply,
  Pencil,
  X,
  Check,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Mic,
  Ban,
  Clock,
  ShieldAlert,
  BarChart2,
  Timer,
  Sparkles
} from "lucide-react";
import { EmojiPickerPopover } from "./EmojiPickerPopover";
import {
  AttachmentPreviewBar,
  type PendingAttachment
} from "./media/AttachmentPreviewBar";
import { VoiceMessageRecorder } from "./media/VoiceMessageRecorder";
import { AcademicRejectionBanner, type RejectionData } from "./AcademicRejectionBanner";
import { academicClassifierService } from "../../services/academic-classifier.service";
import { CreatePollModal } from "./modals/CreatePollModal";
import { StartStudySessionModal } from "./modals/StartStudySessionModal";

interface StreamMessageComposerProps {
  channel: StreamChannel;
  placeholder?: string;
  onSendMessage?: (text: string) => Promise<void>;
  disabled?: boolean;
  replyingTo?: LocalMessage | null;
  onCancelReply?: () => void;
  editingMessage?: LocalMessage | null;
  onCancelEdit?: () => void;
  droppedFiles?: File[] | null;
  onFilesProcessed?: () => void;
  isPeerBlocked?: boolean;
  onUnblockPeer?: () => void;
  communityId?: string;
}

const DRAFT_PREFIX = "studyconnect_draft_";
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

const DANGEROUS_EXTENSIONS = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".sh",
  ".bash",
  ".ps1",
  ".vbs",
  ".dll",
  ".msi",
  ".scr",
  ".com"
]);

export function StreamMessageComposer({
  channel,
  placeholder,
  onSendMessage,
  disabled = false,
  replyingTo = null,
  onCancelReply,
  editingMessage = null,
  onCancelEdit,
  droppedFiles = null,
  onFilesProcessed,
  isPeerBlocked = false,
  onUnblockPeer,
  communityId
}: StreamMessageComposerProps) {
  const [text, setText] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [emojiPickerInitialMode, setEmojiPickerInitialMode] = useState<"emoji" | "stickers" | "gifs">("emoji");
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [isStudySessionModalOpen, setIsStudySessionModalOpen] = useState(false);
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [rejectionData, setRejectionData] = useState<RejectionData | null>(null);
  const [strikeCount, setStrikeCount] = useState<number>(0);
  const [timeoutExpiry, setTimeoutExpiry] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  // Countdown timer for study-mode timeout
  useEffect(() => {
    if (!timeoutExpiry) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((timeoutExpiry - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        setTimeoutExpiry(null);
        setRejectionData(null);
        setStrikeCount(0);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [timeoutExpiry]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const channelKey = channel.cid || channel.id || "default";
  const draftStorageKey = `${DRAFT_PREFIX}${channelKey}`;

  // Restore draft when active channel changes
  useEffect(() => {
    if (editingMessage) return;
    try {
      const savedDraft = localStorage.getItem(draftStorageKey);
      if (savedDraft) {
        setText(savedDraft);
      } else {
        setText("");
      }
    } catch {
      setText("");
    }
  }, [channelKey, draftStorageKey, editingMessage]);

  // When editingMessage changes, prefill text and focus
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text || "");
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          (editingMessage.text || "").length,
          (editingMessage.text || "").length
        );
      }
    }
  }, [editingMessage]);

  // When replyingTo changes, focus textarea
  useEffect(() => {
    if (replyingTo && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyingTo]);

  // Adjust textarea height automatically based on content
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [text, adjustTextareaHeight]);

  // Click outside to close attach menu
  useEffect(() => {
    if (!isAttachMenuOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setIsAttachMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isAttachMenuOpen]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      pendingAttachments.forEach((att) => {
        if (att.previewUrl) URL.revokeObjectURL(att.previewUrl);
        if (att.abortController) att.abortController.abort();
      });
    };
  }, [pendingAttachments]);

  // Persist draft on content change
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);

    if (!editingMessage) {
      try {
        if (newText.trim()) {
          localStorage.setItem(draftStorageKey, newText);
        } else {
          localStorage.removeItem(draftStorageKey);
        }
      } catch {}
    }

    if (channel && newText.trim()) {
      channel.keystroke().catch(() => {});
    } else if (channel && !newText.trim()) {
      channel.stopTyping().catch(() => {});
    }
  };

  // Upload a single file to Stream CDN
  const uploadAttachment = useCallback(
    async (pendingId: string, file: File, type: "image" | "file") => {
      const abortController = new AbortController();

      setPendingAttachments((prev) =>
        prev.map((att) =>
          att.id === pendingId
            ? { ...att, status: "uploading", progress: 0, abortController }
            : att
        )
      );

      try {
        let uploadRes: { file: string };

        const axiosConfig = {
          signal: abortController.signal,
          timeout: 60000,
          onUploadProgress: (progressEvent: any) => {
            const total = progressEvent.total || file.size || 1;
            const current = progressEvent.loaded || 0;
            const percent = Math.min(100, Math.round((current * 100) / total));
            setPendingAttachments((prev) =>
              prev.map((att) =>
                att.id === pendingId ? { ...att, progress: percent } : att
              )
            );
          }
        };

        if (type === "image") {
          try {
            uploadRes = await channel.sendImage(
              file,
              file.name,
              file.type,
              undefined,
              axiosConfig
            );
          } catch (imgErr) {
            console.warn("sendImage failed, falling back to sendFile:", imgErr);
            uploadRes = await channel.sendFile(
              file,
              file.name,
              file.type,
              undefined,
              axiosConfig
            );
          }
        } else {
          uploadRes = await channel.sendFile(
            file,
            file.name,
            file.type,
            undefined,
            axiosConfig
          );
        }

        setPendingAttachments((prev) =>
          prev.map((att) =>
            att.id === pendingId
              ? {
                  ...att,
                  status: "success",
                  progress: 100,
                  uploadedUrl: uploadRes.file
                }
              : att
          )
        );
      } catch (err: any) {
        if (abortController.signal.aborted) {
          return;
        }
        console.error("Stream upload failed:", err);
        setPendingAttachments((prev) =>
          prev.map((att) =>
            att.id === pendingId
              ? {
                  ...att,
                  status: "error",
                  errorMsg: err?.message || "Upload failed"
                }
              : att
          )
        );
      }
    },
    [channel]
  );

  // Validate and enqueue selected files
  const handleFilesSelected = useCallback(
    (files: FileList | File[] | null, preferredType?: "image" | "file") => {
      if (!files || files.length === 0) return;
      setValidationError(null);

      const newPending: PendingAttachment[] = [];

      Array.from(files).forEach((file) => {
        const ext = "." + (file.name.split(".").pop() || "").toLowerCase();

        // Check dangerous extensions
        if (DANGEROUS_EXTENSIONS.has(ext)) {
          setValidationError(`Executable file ${file.name} is not allowed.`);
          return;
        }

        // Check file size
        if (file.size > MAX_FILE_SIZE_BYTES) {
          setValidationError(`File ${file.name} exceeds the 25 MB limit.`);
          return;
        }

        const isImg =
          preferredType === "image" ||
          file.type.startsWith("image/") ||
          [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext);

        const id = Math.random().toString(36).substring(2, 9);
        const previewUrl = isImg ? URL.createObjectURL(file) : undefined;

        const item: PendingAttachment = {
          id,
          file,
          type: isImg ? "image" : "file",
          previewUrl,
          progress: 0,
          status: "pending"
        };

        newPending.push(item);
      });

      if (newPending.length > 0) {
        setPendingAttachments((prev) => [...prev, ...newPending]);
        // Start uploads immediately
        newPending.forEach((att) => {
          uploadAttachment(att.id, att.file, att.type);
        });
      }

      setIsAttachMenuOpen(false);
    },
    [uploadAttachment]
  );

  // Handle dropped files from parent drag-and-drop container
  useEffect(() => {
    if (droppedFiles && droppedFiles.length > 0) {
      handleFilesSelected(droppedFiles);
      onFilesProcessed?.();
    }
  }, [droppedFiles, handleFilesSelected, onFilesProcessed]);

  // Remove pending attachment
  const handleRemoveAttachment = (id: string) => {
    setPendingAttachments((prev) => {
      const target = prev.find((att) => att.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      if (target?.abortController) {
        target.abortController.abort();
      }
      return prev.filter((att) => att.id !== id);
    });
  };

  // Retry failed upload
  const handleRetryAttachment = (id: string) => {
    const target = pendingAttachments.find((att) => att.id === id);
    if (target) {
      uploadAttachment(id, target.file, target.type);
    }
  };

  // Send voice note directly to Stream
  const handleSendVoice = async (audioBlob: Blob, durationSeconds: number) => {
    if (!audioBlob || audioBlob.size === 0) {
      setValidationError("Recorded audio was empty. Please try recording again.");
      return;
    }

    try {
      const cleanMime = (audioBlob.type?.split(";")[0] || "audio/webm").trim();
      const ext = cleanMime.includes("mp4")
        ? "mp4"
        : cleanMime.includes("ogg")
        ? "ogg"
        : "webm";
      const filename = `voice-message-${Date.now()}.${ext}`;

      const audioFile = new File([audioBlob], filename, {
        type: cleanMime
      });

      // Upload audio to Stream with extended timeout
      const uploadRes = await channel.sendFile(
        audioFile,
        filename,
        cleanMime,
        undefined,
        { timeout: 60000 }
      );

      const voiceAttachment: Attachment = {
        type: "voice",
        asset_url: uploadRes.file,
        title: "Voice message",
        duration: durationSeconds,
        file_size: audioBlob.size,
        mime_type: cleanMime
      };

      await channel.sendMessage({
        text: "",
        attachments: [voiceAttachment],
        quoted_message_id: replyingTo ? replyingTo.id : undefined
      });

      if (replyingTo) onCancelReply?.();
      setIsRecordingVoice(false);
    } catch (err: any) {
      console.error("Failed to send voice message:", err);
      setValidationError(
        err?.message || "Failed to send voice message. Please check connection and try again."
      );
      throw err;
    }
  };

  // Send or update message
  const handleSend = async () => {
    const trimmed = text.trim();
    const hasAttachments = pendingAttachments.length > 0;

    // Check if anything to send
    if ((!trimmed && !hasAttachments) || sending || disabled || !channel) return;

    // Disallow sending if timed out
    if (timeoutExpiry && Date.now() < timeoutExpiry) {
      setValidationError(`Strict Study Mode timeout active. Please wait ${secondsLeft}s.`);
      return;
    }

    // Strict Study Mode Evaluation
    const chanData = (channel.data || {}) as any;
    const isStrictStudyMode = Boolean(
      chanData.isStrictStudyMode ?? (chanData.category === "focus")
    );

    if (isStrictStudyMode && trimmed && !editingMessage) {
      const evaluation = academicClassifierService.evaluateAcademicRelevance(trimmed, {
        isStrictStudyMode: true,
        academicContextTags: chanData.academicContextTags,
        strictnessThreshold: chanData.strictnessThreshold ?? 0.40,
        allowCodeSnippetsOnly: chanData.allowCodeSnippetsOnly,
        channelName: channel.id
      });

      if (!evaluation.isAllowed) {
        const nextStrikes = strikeCount + 1;
        setStrikeCount(nextStrikes);

        if (nextStrikes >= 3) {
          const timeoutSeconds = (chanData.timeoutDurationMinutes || 5) * 60;
          const expiry = Date.now() + timeoutSeconds * 1000;
          setTimeoutExpiry(expiry);
          setSecondsLeft(timeoutSeconds);
          setRejectionData({
            originalContent: trimmed,
            channelId: channel.id,
            reason: evaluation.reason,
            confidence: evaluation.confidence,
            matchedKeywords: evaluation.matchedKeywords,
            flaggedViolations: evaluation.flaggedViolations,
            strikes: 3,
            strikesRemaining: 0,
            isTimedOut: true,
            timeoutSeconds
          });
        } else {
          setRejectionData({
            originalContent: trimmed,
            channelId: channel.id,
            reason: evaluation.reason,
            confidence: evaluation.confidence,
            matchedKeywords: evaluation.matchedKeywords,
            flaggedViolations: evaluation.flaggedViolations,
            strikes: nextStrikes,
            strikesRemaining: 3 - nextStrikes
          });
        }
        return;
      }
    }

    try {
      setSending(true);
      setRejectionData(null);
      channel.stopTyping().catch(() => {});

      if (editingMessage) {
        const client = channel.getClient();
        await client.updateMessage({
          id: editingMessage.id,
          text: trimmed
        });

        onCancelEdit?.();
        const savedDraft = localStorage.getItem(draftStorageKey) || "";
        setText(savedDraft);
      } else {
        // Construct Stream attachments
        const attachmentsToSend: Attachment[] = pendingAttachments
          .filter((a) => a.status === "success" && a.uploadedUrl)
          .map((a) => {
            if (a.type === "image") {
              return {
                type: "image",
                image_url: a.uploadedUrl,
                asset_url: a.uploadedUrl,
                fallback: a.file.name
              };
            }
            return {
              type: "file",
              asset_url: a.uploadedUrl,
              title: a.file.name,
              file_size: a.file.size,
              mime_type: a.file.type
            };
          });

        if (replyingTo) {
          await channel.sendMessage({
            text: trimmed,
            attachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
            quoted_message_id: replyingTo.id
          });
          onCancelReply?.();
        } else {
          if (onSendMessage && attachmentsToSend.length === 0) {
            await onSendMessage(trimmed);
          } else {
            await channel.sendMessage({
              text: trimmed,
              attachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined
            });
          }
        }

        // Cleanup pending attachments
        pendingAttachments.forEach((a) => {
          if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
        });
        setPendingAttachments([]);
        setText("");
        try {
          localStorage.removeItem(draftStorageKey);
        } catch {}
      }

      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.focus();
      }
    } catch (err) {
      console.error("Failed to send message via Stream:", err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      if (editingMessage) {
        onCancelEdit?.();
        const savedDraft = localStorage.getItem(draftStorageKey) || "";
        setText(savedDraft);
      } else if (replyingTo) {
        onCancelReply?.();
      }
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSelectEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setText((prev) => prev + emoji);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextText = text.slice(0, start) + emoji + text.slice(end);
    setText(nextText);

    if (!editingMessage) {
      try {
        localStorage.setItem(draftStorageKey, nextText);
      } catch {}
    }

    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
      textarea.focus();
      adjustTextareaHeight();
    }, 0);
  };

  const handleSelectGif = async (gifUrl: string) => {
    setIsEmojiPickerOpen(false);
    try {
      await channel.sendMessage({
        text: "",
        attachments: [
          {
            type: "image",
            image_url: gifUrl,
            title: "GIF"
          }
        ]
      });
    } catch (err) {
      console.error("Failed to send GIF:", err);
    }
  };

  if (isPeerBlocked) {
    return (
      <div className="p-4 bg-slate-50 dark:bg-[#0F1726] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <Ban size={16} className="text-rose-500 shrink-0" />
          <span>You have blocked this user. Unblock them to resume conversation.</span>
        </div>
        {onUnblockPeer && (
          <button
            type="button"
            onClick={onUnblockPeer}
            className="px-3.5 py-1.5 rounded-xl bg-[#1E90FF] hover:bg-sky-600 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer shrink-0"
          >
            Unblock User
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative p-3 sm:p-4 bg-white dark:bg-[#0D1524] border-t border-slate-200/80 dark:border-slate-800">
      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          handleFilesSelected(e.target.files, "image");
          e.target.value = "";
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,application/pdf"
        className="hidden"
        onChange={(e) => {
          handleFilesSelected(e.target.files, "file");
          e.target.value = "";
        }}
      />

      {/* Strict Study Mode Interception Banner */}
      {rejectionData && (
        <AcademicRejectionBanner
          data={rejectionData}
          onDismiss={() => setRejectionData(null)}
        />
      )}

      {/* Timeout banner */}
      {timeoutExpiry && Date.now() < timeoutExpiry && (
        <div className="flex items-center gap-2.5 p-3 mb-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-xs text-red-700 dark:text-red-300">
          <Clock size={16} className="text-red-500 shrink-0 animate-pulse" />
          <span>
            Strict Study Mode Timeout active:{" "}
            <strong>
              {Math.floor(secondsLeft / 60)}:
              {(secondsLeft % 60).toString().padStart(2, "0")}
            </strong>{" "}
            remaining. You cannot post until the timer expires.
          </span>
        </div>
      )}

      {/* Validation Error Toast */}
      {validationError && (
        <div className="flex items-center justify-between px-3 py-1.5 mb-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-200">
          <span>{validationError}</span>
          <button
            type="button"
            onClick={() => setValidationError(null)}
            className="p-1 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/50 cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Reply Banner */}
      {replyingTo && !editingMessage && (
        <div className="flex items-center justify-between px-3 py-2 mb-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/60 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Reply size={14} className="text-[#005FFF] shrink-0" />
            <div className="min-w-0">
              <span className="font-semibold text-slate-900 dark:text-white mr-1.5">
                Replying to {((replyingTo.user as any)?.name as string) || "Classmate"}
              </span>
              <span className="text-slate-500 dark:text-slate-400 truncate inline-block max-w-xs sm:max-w-md align-bottom">
                {replyingTo.text ||
                  (replyingTo.attachments?.some((a) => a.type === "image" || a.image_url)
                    ? "🖼️ Photo"
                    : replyingTo.attachments?.some((a) => a.type === "voice" || a.type === "audio")
                    ? "🎤 Voice message"
                    : replyingTo.attachments?.length
                    ? "📄 Document"
                    : "[Message]")}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors shrink-0 cursor-pointer"
            title="Cancel reply (Esc)"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Edit Banner */}
      {editingMessage && (
        <div className="flex items-center justify-between px-3 py-2 mb-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Pencil size={14} className="text-amber-500 shrink-0" />
            <div className="min-w-0">
              <span className="font-semibold text-amber-900 dark:text-amber-300 mr-1.5">
                Editing message
              </span>
              <span className="text-slate-500 dark:text-slate-400 truncate inline-block max-w-xs sm:max-w-md align-bottom">
                {editingMessage.text}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onCancelEdit?.();
              const savedDraft = localStorage.getItem(draftStorageKey) || "";
              setText(savedDraft);
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors shrink-0 cursor-pointer"
            title="Cancel edit (Esc)"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Pending Attachments Preview Bar */}
      {pendingAttachments.length > 0 && !isRecordingVoice && (
        <AttachmentPreviewBar
          attachments={pendingAttachments}
          onRemove={handleRemoveAttachment}
          onRetry={handleRetryAttachment}
        />
      )}

      {/* Voice Recorder View or Normal Input Box */}
      {isRecordingVoice ? (
        <VoiceMessageRecorder
          onSendVoice={handleSendVoice}
          onCancel={() => setIsRecordingVoice(false)}
        />
      ) : (
        <div className="flex items-end gap-2 p-2 rounded-2xl bg-slate-50 dark:bg-[#151E2E] border border-slate-200 dark:border-slate-700/60 focus-within:border-[#005FFF] focus-within:ring-2 focus-within:ring-[#005FFF]/20 transition-all shadow-xs">
          {/* Attachment (+) Button with Dropdown */}
          <div className="relative shrink-0" ref={attachMenuRef}>
            <button
              type="button"
              onClick={() => setIsAttachMenuOpen(!isAttachMenuOpen)}
              className={`p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/50 transition-colors cursor-pointer ${
                isAttachMenuOpen ? "bg-slate-200/80 dark:bg-slate-700 text-[#005FFF]" : ""
              }`}
              title="Attach photos or documents"
              aria-label="Attach file"
            >
              <Paperclip size={18} />
            </button>

            {isAttachMenuOpen && (
              <div className="absolute left-0 bottom-full mb-2 z-50 w-48 rounded-2xl bg-white dark:bg-[#121B2D] border border-slate-200 dark:border-slate-700/80 shadow-xl py-1 text-xs text-slate-700 dark:text-slate-200 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => {
                    setIsAttachMenuOpen(false);
                    imageInputRef.current?.click();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-left transition-colors cursor-pointer"
                >
                  <ImageIcon size={16} className="text-sky-500" />
                  <span>Photos & Images</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAttachMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-left transition-colors cursor-pointer"
                >
                  <FileText size={16} className="text-indigo-500" />
                  <span>Document / File</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAttachMenuOpen(false);
                    setIsPollModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-left transition-colors cursor-pointer"
                >
                  <BarChart2 size={16} className="text-emerald-500" />
                  <span>Create Live Poll</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAttachMenuOpen(false);
                    setIsStudySessionModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-left transition-colors cursor-pointer"
                >
                  <Timer size={16} className="text-amber-500" />
                  <span>Start Study Sprint</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAttachMenuOpen(false);
                    setEmojiPickerInitialMode("stickers");
                    setIsEmojiPickerOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-left transition-colors cursor-pointer"
                >
                  <Sparkles size={16} className="text-purple-500" />
                  <span>Campus Stickers</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAttachMenuOpen(false);
                    setEmojiPickerInitialMode("gifs");
                    setIsEmojiPickerOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-left transition-colors cursor-pointer"
                >
                  <Smile size={16} className="text-pink-500" />
                  <span>GIFs & Memes</span>
                </button>
              </div>
            )}
          </div>

          {/* Emoji Button */}
          <div className="relative shrink-0">
            <button
              ref={emojiButtonRef}
              type="button"
              onClick={() => {
                setEmojiPickerInitialMode("emoji");
                setIsEmojiPickerOpen(!isEmojiPickerOpen);
              }}
              className={`p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/50 transition-colors cursor-pointer ${
                isEmojiPickerOpen ? "bg-slate-200/80 dark:bg-slate-700 text-[#005FFF]" : ""
              }`}
              title="Emoji & Stickers"
            >
              <Smile size={19} />
            </button>

            {isEmojiPickerOpen && (
              <EmojiPickerPopover
                isOpen={isEmojiPickerOpen}
                onClose={() => setIsEmojiPickerOpen(false)}
                onSelectEmoji={(emoji) => handleSelectEmoji(emoji)}
                onSelectGif={handleSelectGif}
                initialMode={emojiPickerInitialMode}
                align="left"
              />
            )}
          </div>

          {/* Textarea Input */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (channel) channel.stopTyping().catch(() => {});
            }}
            disabled={disabled || sending}
            placeholder={
              editingMessage
                ? "Edit your message... (Enter to save, Esc to cancel)"
                : replyingTo
                ? "Type your reply... (Enter to send, Esc to cancel)"
                : placeholder || "Type a message... (Enter to send, Shift+Enter for newline)"
            }
            rows={1}
            className="flex-1 max-h-44 py-2 px-1 text-sm bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 resize-none focus:outline-none leading-relaxed"
          />

          {/* Microphone button (only shown when not typing and not editing) */}
          {!text.trim() && !editingMessage && pendingAttachments.length === 0 && (
            <button
              type="button"
              onClick={() => setIsRecordingVoice(true)}
              className="p-2 rounded-xl text-slate-500 hover:text-[#005FFF] dark:text-slate-400 dark:hover:text-sky-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/50 transition-colors cursor-pointer shrink-0"
              title="Record voice message"
              aria-label="Record voice message"
            >
              <Mic size={19} />
            </button>
          )}

          {/* Send / Save Button */}
          {(text.trim() || pendingAttachments.length > 0 || editingMessage) && (
            <button
              type="button"
              onClick={handleSend}
              disabled={(!text.trim() && pendingAttachments.length === 0) || sending || disabled}
              className={`p-2.5 rounded-xl font-medium transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs active:scale-95 text-white ${
                editingMessage
                  ? "bg-amber-500 hover:bg-amber-600 disabled:opacity-40"
                  : "bg-[#005FFF] hover:bg-[#0052db] disabled:opacity-40 disabled:hover:bg-[#005FFF]"
              }`}
              title={editingMessage ? "Save changes" : "Send message"}
            >
              {sending ? (
                <Loader2 size={17} className="animate-spin" />
              ) : editingMessage ? (
                <Check size={17} />
              ) : (
                <Send size={17} />
              )}
            </button>
          )}
        </div>
      )}

      {/* Helper Shortcut hint */}
      <div className="mt-1.5 flex items-center px-2 text-[10px] text-slate-400 dark:text-slate-500">
        <span>
          <kbd className="font-sans px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[9px]">Enter</kbd>{" "}
          {editingMessage ? "to save" : "to send"},{" "}
          <kbd className="font-sans px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[9px]">Shift + Enter</kbd> for newline
        </span>
      </div>

      {/* Interactive Feature Modals */}
      <CreatePollModal
        isOpen={isPollModalOpen}
        onClose={() => setIsPollModalOpen(false)}
        channel={channel}
      />
      <StartStudySessionModal
        isOpen={isStudySessionModalOpen}
        onClose={() => setIsStudySessionModalOpen(false)}
        channel={channel}
        communityId={communityId}
      />
    </div>
  );
}
