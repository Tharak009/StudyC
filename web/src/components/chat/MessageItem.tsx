import React, { useState, useMemo } from "react";
import katex from "katex";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";
import {
  Check,
  Copy,
  Play,
  RotateCcw,
  MessageSquare,
  Pin,
  CheckCircle2,
  Award,
  Sparkles,
  ExternalLink,
  Code,
  FileText,
  Download,
  Flame,
  ThumbsUp,
  Heart,
  Lightbulb,
  Rocket,
  Trash2,
  Plus
} from "lucide-react";
import type { ChatMessage, CodeSnippet } from "../../types/chat";
import { useChatStore } from "../../store/chat.store";
import { EmojiPickerPopover, CAMPUS_STICKERS } from "./EmojiPickerPopover";
import { DeleteMessageModal } from "./modals/DeleteMessageModal";

interface MessageItemProps {
  message: ChatMessage;
  currentUserId?: string;
  onReact?: (messageId: string, emoji: string, category?: "STANDARD" | "CAMPUS_CUSTOM") => void;
  onPin?: (messageId: string, isPinned: boolean) => void;
  onMarkSolution?: (messageId: string) => void;
  onReplyInThread?: (message: ChatMessage) => void;
  onDeleteForMe?: (messageId: string) => void;
  onDeleteForEveryone?: (messageId: string) => void;
  isModeratorOrAdmin?: boolean;
  className?: string;
}

// ── Helper: KaTeX Math Parser ───────────────────────────────────────────────
const renderMathAndText = (text: string) => {
  if (!text) return null;

  // Split by $$...$$ (block) and $...$ (inline)
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  // Regex matches $$...$$ or $...$
  const mathRegex = /(\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$)/g;
  let match: RegExpExecArray | null;
  let lastIndex = 0;

  while ((match = mathRegex.exec(remaining)) !== null) {
    const textBefore = remaining.substring(lastIndex, match.index);
    if (textBefore) {
      parts.push(<span key={`text-${keyIdx++}`}>{textBefore}</span>);
    }

    const rawFormula = match[0];
    const isBlock = rawFormula.startsWith("$$");
    const formula = isBlock
      ? rawFormula.slice(2, -2).trim()
      : rawFormula.slice(1, -1).trim();

    try {
      const html = katex.renderToString(formula, {
        displayMode: isBlock,
        throwOnError: false
      });
      parts.push(
        <span
          key={`math-${keyIdx++}`}
          className={isBlock ? "block my-2 text-center text-cyan-300 overflow-x-auto" : "inline-block text-cyan-300 font-mono px-1"}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    } catch {
      parts.push(<code key={`err-${keyIdx++}`} className="text-rose-400">{rawFormula}</code>);
    }

    lastIndex = match.index + rawFormula.length;
  }

  if (lastIndex < remaining.length) {
    parts.push(<span key={`text-end-${keyIdx++}`}>{remaining.substring(lastIndex)}</span>);
  }

  return parts.length > 0 ? parts : text;
};

// ── Helper: Code Sandbox Runner ─────────────────────────────────────────────
const runCodeSandbox = (code: string, language: string): { output: string; isError: boolean } => {
  const lang = language.toLowerCase();
  if (lang !== "javascript" && lang !== "typescript" && lang !== "js" && lang !== "ts") {
    return {
      output: `[Sandbox Runner] Live execution is supported for JavaScript & TypeScript. Language '${language}' requires backend compiler execution.`,
      isError: false
    };
  }

  const logs: string[] = [];
  const customConsole = {
    log: (...args: any[]) => logs.push(args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ")),
    warn: (...args: any[]) => logs.push("[WARN] " + args.join(" ")),
    error: (...args: any[]) => logs.push("[ERR] " + args.join(" ")),
    info: (...args: any[]) => logs.push(args.join(" "))
  };

  try {
    const fn = new Function("console", `"use strict"; ${code}`);
    fn(customConsole);
    return {
      output: logs.length > 0 ? logs.join("\n") : "[Execution finished with return value: undefined (no console logs)]",
      isError: false
    };
  } catch (err: any) {
    return {
      output: `Runtime Error: ${err.message}`,
      isError: true
    };
  }
};

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  currentUserId,
  onReact,
  onPin,
  onMarkSolution,
  onReplyInThread,
  onDeleteForMe,
  onDeleteForEveryone,
  isModeratorOrAdmin = false,
  className = ""
}) => {
  const { openThread } = useChatStore();

  const [copiedCode, setCopiedCode] = useState(false);
  const [sandboxResult, setSandboxResult] = useState<{ output: string; isError: boolean } | null>(null);
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Author details
  const senderName = message.senderName || message.senderId?.fullName || "Student";
  const senderRoll = message.senderRoll || message.senderId?.rollNumber || "CS24";
  const senderKarma = message.senderId?.karma || 0;
  const initial = senderName.charAt(0).toUpperCase();

  // Copy code handler
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Run code handler
  const handleRunCode = (code: string, language: string) => {
    const res = runCodeSandbox(code, language);
    setSandboxResult(res);
    setIsSandboxOpen(true);
  };

  // Syntax highlighting for code snippet
  const highlightedCode = useMemo(() => {
    if (!message.codeSnippet?.code) return null;
    const lang = message.codeSnippet.language.toLowerCase();
    const grammar = Prism.languages[lang] || Prism.languages.javascript;
    try {
      return Prism.highlight(message.codeSnippet.code, grammar, lang);
    } catch {
      return message.codeSnippet.code;
    }
  }, [message.codeSnippet]);

  // Intent pill design
  const intentPill = useMemo(() => {
    switch (message.intent) {
      case "question":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-300 border border-purple-500/20">
            ❓ Question
          </span>
        );
      case "solution":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            💡 Solution
          </span>
        );
      case "code":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-300 border border-blue-500/20">
            💻 Code Snippet
          </span>
        );
      default:
        return null;
    }
  }, [message.intent]);

  // Format time
  const formattedTime = useMemo(() => {
    try {
      const d = new Date(message.createdAt);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  }, [message.createdAt]);

  const isAuthor = currentUserId && (
    message.senderId?._id === currentUserId ||
    (typeof message.senderId === "string" && message.senderId === currentUserId)
  );

  // Authoritative Tombstone Rendering
  if (message.isDeletedForEveryone) {
    const isModeratorDeletion =
      message.deletedBy &&
      (typeof message.deletedBy === "object"
        ? message.deletedBy._id !== (message.senderId as any)?._id
        : message.deletedBy !== (message.senderId as any)?._id);

    return (
      <div
        className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-100/60 dark:bg-[#0B1324]/60 border border-dashed border-slate-300 dark:border-slate-800 my-1 select-none ${className}`}
      >
        <div className="w-8 h-8 rounded-xl bg-slate-200/80 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 dark:text-slate-500 shrink-0">
          <Trash2 className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        </div>
        <div className="flex-1 flex items-center justify-between min-w-0">
          <span className="text-xs italic text-slate-500 dark:text-slate-400 font-medium">
            {isModeratorDeletion
              ? "This message was removed by a moderator"
              : "This message was deleted by sender"}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono ml-2">
            {formattedTime}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative flex gap-3 px-4 py-2.5 rounded-2xl transition-all hover:bg-slate-100/60 dark:hover:bg-[#0F1A30]/50 ${
        message.isPinned ? "bg-amber-500/10 border-l-2 border-amber-500" : ""
      } ${
        message.isAcceptedSolution ? "bg-emerald-500/10 border-l-2 border-emerald-500" : ""
      } ${className}`}
    >
      {/* ── Hover Action Dock ── */}
      <div className="absolute right-4 -top-3 hidden group-hover:flex items-center gap-1 bg-white dark:bg-[#0B1324] border border-slate-200/80 dark:border-slate-700/80 rounded-xl px-2 py-1 shadow-xl z-20 backdrop-blur-xl text-slate-700 dark:text-slate-300">
        {/* Quick Reactions: 6 academic/popular pills */}
        {["👍", "💡", "🔥", "🚀", "❓", "👀"].map((emoji) => (
          <button
            key={emoji}
            onClick={() => onReact?.(message._id, emoji, "STANDARD")}
            className="p-1 text-xs hover:bg-slate-100 dark:hover:bg-[#162544] rounded-lg transition-transform hover:scale-125 cursor-pointer"
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}

        {/* '+' Button: Opens Academic & Campus Sticker Popover */}
        <div className="relative">
          <button
            onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
            className="p-1 text-xs hover:bg-slate-100 dark:hover:bg-[#162544] rounded-lg text-slate-500 dark:text-slate-400 hover:text-[#1E90FF] transition-colors cursor-pointer"
            title="More Reactions & Campus Stickers"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <EmojiPickerPopover
            isOpen={isEmojiPickerOpen}
            onClose={() => setIsEmojiPickerOpen(false)}
            onSelectEmoji={(emoji, category) => onReact?.(message._id, emoji, category)}
            align="right"
          />
        </div>

        <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700 mx-0.5" />

        {/* Reply in Thread */}
        <button
          onClick={() => {
            if (onReplyInThread) onReplyInThread(message);
            else openThread(message);
          }}
          className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-[#1E90FF] hover:bg-slate-100 dark:hover:bg-[#162544] transition-colors cursor-pointer"
          title="Reply in Thread"
        >
          <MessageSquare className="w-3.5 h-3.5" />
        </button>

        {/* Pin Message */}
        <button
          onClick={() => onPin?.(message._id, !message.isPinned)}
          className={`p-1 rounded-lg transition-colors cursor-pointer ${
            message.isPinned
              ? "text-amber-500 bg-amber-500/10"
              : "text-slate-500 dark:text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-[#162544]"
          }`}
          title={message.isPinned ? "Unpin Message" : "Pin to Vault"}
        >
          <Pin className="w-3.5 h-3.5" />
        </button>

        {/* Mark as Accepted Solution */}
        {!message.isAcceptedSolution && onMarkSolution && (
          <button
            onClick={() => onMarkSolution(message._id)}
            className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
            title="Mark as Accepted Solution (+25 Karma)"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Delete Message Button */}
        {(isAuthor || isModeratorOrAdmin || onDeleteForMe) && (
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Delete Message"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Author Avatar ── */}
      <div className="flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1E90FF] via-indigo-600 to-cyan-500 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-[#1E90FF]/25">
          {initial}
        </div>
      </div>

      {/* ── Message Content Area ── */}
      <div className="flex-1 min-w-0">
        {/* Header line */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 hover:text-[#1E90FF] cursor-pointer transition-colors">
            {senderName}
          </span>
          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{senderRoll}</span>

          {/* Karma Badge */}
          {senderKarma > 0 && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20 text-[10px] font-semibold">
              <Award className="w-2.5 h-2.5" />
              {senderKarma}
            </span>
          )}

          {/* Intent Pill */}
          {intentPill}

          {/* Accepted Solution Badge */}
          {message.isAcceptedSolution && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold tracking-wide">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              Accepted Solution (+25 Karma)
            </span>
          )}

          {/* Pinned Pill */}
          {message.isPinned && (
            <span className="inline-flex items-center gap-1 text-[10px] text-amber-500 font-semibold">
              <Pin className="w-2.5 h-2.5" />
              Pinned
            </span>
          )}

          <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto font-mono">{formattedTime}</span>
        </div>

        {/* Reply Context Bar (if replying to another message) */}
        {message.replyTo && (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 pl-2 border-l-2 border-slate-300 dark:border-slate-700">
            <span className="text-[10px] text-[#1E90FF] font-semibold">
              @{message.replyTo.senderId?.fullName || "User"}:
            </span>
            <span className="truncate max-w-[300px] text-slate-600 dark:text-slate-400 text-[11px]">
              {message.replyTo.content || "[Code or Attachment]"}
            </span>
          </div>
        )}

        {/* Main Text with KaTeX Math Rendering */}
        {message.content && (
          <div className="mt-1 text-xs leading-relaxed text-slate-800 dark:text-slate-200 break-words select-text">
            {renderMathAndText(message.content)}
          </div>
        )}

        {/* ── Code Snippet Showcase with 1-Click Sandbox Runner ── */}
        {message.codeSnippet && (
          <div className="mt-2.5 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 dark:bg-[#080D1A] text-slate-100 shadow-md">
            {/* Code Header Bar */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/90 dark:bg-[#0F1A30] border-b border-slate-700/80 dark:border-slate-800 text-[11px]">
              <div className="flex items-center gap-2">
                <Code className="w-3.5 h-3.5 text-[#1E90FF]" />
                <span className="font-semibold text-slate-200">
                  {message.codeSnippet.title || `${message.codeSnippet.language.toUpperCase()} Snippet`}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-700/60 dark:bg-[#162544] text-cyan-300">
                  {message.codeSnippet.language}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* 1-Click Sandbox Runner */}
                <button
                  onClick={() => handleRunCode(message.codeSnippet!.code, message.codeSnippet!.language)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer"
                  title="Run code live in browser sandbox"
                >
                  <Play className="w-2.5 h-2.5 fill-current" />
                  Run
                </button>

                {/* Copy Button */}
                <button
                  onClick={() => handleCopyCode(message.codeSnippet!.code)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium text-slate-400 hover:text-white hover:bg-slate-700/60 dark:hover:bg-[#162544] transition-colors cursor-pointer"
                >
                  {copiedCode ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                  {copiedCode ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            {/* Prism Code Block */}
            <pre className="p-3 text-[11px] font-mono leading-relaxed overflow-x-auto text-slate-200 select-text">
              <code
                dangerouslySetInnerHTML={{
                  __html: highlightedCode || message.codeSnippet.code
                }}
              />
            </pre>

            {/* Sandbox Execution Console Drawer */}
            {isSandboxOpen && sandboxResult && (
              <div className="p-2.5 bg-slate-950 dark:bg-[#050811] border-t border-slate-800 dark:border-slate-800 font-mono text-[10px]">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="flex items-center gap-1 font-bold text-slate-300">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    Sandbox Execution Console
                  </span>
                  <button
                    onClick={() => setIsSandboxOpen(false)}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    Close
                  </button>
                </div>
                <pre
                  className={`p-2 rounded-lg whitespace-pre-wrap ${
                    sandboxResult.isError ? "text-rose-400 bg-rose-950/20" : "text-emerald-300 bg-emerald-950/20"
                  }`}
                >
                  {sandboxResult.output}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* ── File Attachments ── */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.attachments.map((file, idx) => (
              <a
                key={idx}
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-[#080D1A] border border-slate-200/80 dark:border-slate-800 hover:border-[#1E90FF]/50 text-xs transition-colors group shadow-xs"
              >
                <div className="p-1.5 rounded-lg bg-[#1E90FF]/10 text-[#1E90FF] group-hover:bg-[#1E90FF]/20">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-800 dark:text-slate-200 group-hover:text-[#1E90FF] font-medium truncate max-w-[150px]">
                    {file.originalName}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <Download className="w-3 h-3 text-slate-400 group-hover:text-[#1E90FF] ml-1" />
              </a>
            ))}
          </div>
        )}

        {/* ── Reactions Bar with Campus Sticker Support ── */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.reactions.map((r, idx) => {
              const hasReacted = currentUserId && (r.users || []).includes(currentUserId);
              const isCampus = r.emoji.startsWith(":");
              const sticker = isCampus ? CAMPUS_STICKERS.find((s) => s.shortcode === r.emoji) : null;
              const count = r.count ?? r.users?.length ?? 1;

              return (
                <button
                  key={idx}
                  onClick={() =>
                    onReact?.(
                      message._id,
                      r.emoji,
                      isCampus ? "CAMPUS_CUSTOM" : "STANDARD"
                    )
                  }
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs transition-all cursor-pointer ${
                    hasReacted
                      ? "bg-[#1E90FF]/20 text-[#1E90FF] border border-[#1E90FF]/50 font-semibold shadow-[0_0_12px_rgba(30,144,255,0.25)]"
                      : "bg-slate-100/80 dark:bg-[#080D1A] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600"
                  }`}
                  title={sticker ? `${sticker.name} (${sticker.shortcode})` : r.emoji}
                >
                  <span className="text-sm">{sticker ? sticker.emoji : r.emoji}</span>
                  {isCampus && (
                    <span className="text-[10px] font-mono text-sky-400/90 hidden sm:inline">
                      {sticker?.tag || "Campus"}
                    </span>
                  )}
                  <span className="text-[10px] font-bold">{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Thread Discussion Trigger Footer ── */}
        {(message.threadCount || 0) > 0 && (
          <div className="mt-2">
            <button
              onClick={() => {
                if (onReplyInThread) onReplyInThread(message);
                else openThread(message);
              }}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#1E90FF] hover:text-[#187bcd] transition-colors group cursor-pointer"
            >
              <MessageSquare className="w-3 h-3 group-hover:scale-110 transition-transform" />
              <span>
                {message.threadCount} {message.threadCount === 1 ? "reply" : "replies"}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                • View Thread in Drawer
              </span>
            </button>
          </div>
        )}
      </div>

      {/* ── Dual-Tier Delete Message Modal ── */}
      <DeleteMessageModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDeleteForMe={() => onDeleteForMe?.(message._id)}
        onDeleteForEveryone={() => onDeleteForEveryone?.(message._id)}
        createdAt={message.createdAt}
        isAuthor={Boolean(isAuthor)}
        isModeratorOrAdmin={Boolean(isModeratorOrAdmin)}
        messageSnippet={message.content || message.codeSnippet?.code}
      />
    </div>
  );
};
