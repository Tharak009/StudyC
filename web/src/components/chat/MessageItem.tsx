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
  Rocket
} from "lucide-react";
import type { ChatMessage, CodeSnippet } from "../../types/chat";
import { useChatStore } from "../../store/chat.store";

interface MessageItemProps {
  message: ChatMessage;
  currentUserId?: string;
  onReact?: (messageId: string, emoji: string) => void;
  onPin?: (messageId: string, isPinned: boolean) => void;
  onMarkSolution?: (messageId: string) => void;
  onReplyInThread?: (message: ChatMessage) => void;
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
  className = ""
}) => {
  const { openThread } = useChatStore();

  const [copiedCode, setCopiedCode] = useState(false);
  const [sandboxResult, setSandboxResult] = useState<{ output: string; isError: boolean } | null>(null);
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);

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

  const isAuthor = currentUserId && message.senderId?._id === currentUserId;

  return (
    <div
      className={`group relative flex gap-3 px-4 py-2.5 rounded-2xl transition-all hover:bg-[#0F1A30]/50 ${
        message.isPinned ? "bg-amber-950/10 border-l-2 border-amber-500" : ""
      } ${
        message.isAcceptedSolution ? "bg-emerald-950/15 border-l-2 border-emerald-500" : ""
      } ${className}`}
    >
      {/* ── Hover Action Dock ── */}
      <div className="absolute right-4 -top-3 hidden group-hover:flex items-center gap-1 bg-[#0B132B] border border-[#162544] rounded-xl px-2 py-1 shadow-2xl z-20 backdrop-blur-xl">
        {/* Quick Reactions */}
        {[
          { emoji: "👍", icon: ThumbsUp },
          { emoji: "💡", icon: Lightbulb },
          { emoji: "🚀", icon: Rocket },
          { emoji: "🔥", icon: Flame }
        ].map((r) => (
          <button
            key={r.emoji}
            onClick={() => onReact?.(message._id, r.emoji)}
            className="p-1 text-xs hover:bg-[#162544] rounded-lg transition-transform hover:scale-125"
            title={`React with ${r.emoji}`}
          >
            {r.emoji}
          </button>
        ))}

        <div className="w-px h-3.5 bg-[#162544] mx-0.5" />

        {/* Reply in Thread */}
        <button
          onClick={() => {
            if (onReplyInThread) onReplyInThread(message);
            else openThread(message);
          }}
          className="p-1 rounded-lg text-gray-400 hover:text-cyan-300 hover:bg-[#162544] transition-colors"
          title="Reply in Thread"
        >
          <MessageSquare className="w-3.5 h-3.5" />
        </button>

        {/* Pin Message */}
        <button
          onClick={() => onPin?.(message._id, !message.isPinned)}
          className={`p-1 rounded-lg transition-colors ${
            message.isPinned
              ? "text-amber-400 bg-amber-400/10"
              : "text-gray-400 hover:text-amber-300 hover:bg-[#162544]"
          }`}
          title={message.isPinned ? "Unpin Message" : "Pin to Vault"}
        >
          <Pin className="w-3.5 h-3.5" />
        </button>

        {/* Mark as Accepted Solution */}
        {!message.isAcceptedSolution && onMarkSolution && (
          <button
            onClick={() => onMarkSolution(message._id)}
            className="p-1 rounded-lg text-gray-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
            title="Mark as Accepted Solution (+25 Karma)"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Author Avatar ── */}
      <div className="flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-700 via-indigo-700 to-cyan-600 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-blue-900/30">
          {initial}
        </div>
      </div>

      {/* ── Message Content Area ── */}
      <div className="flex-1 min-w-0">
        {/* Header line */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-gray-200 hover:text-blue-400 cursor-pointer transition-colors">
            {senderName}
          </span>
          <span className="text-[10px] font-mono text-gray-500">{senderRoll}</span>

          {/* Karma Badge */}
          {senderKarma > 0 && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-semibold">
              <Award className="w-2.5 h-2.5" />
              {senderKarma}
            </span>
          )}

          {/* Intent Pill */}
          {intentPill}

          {/* Accepted Solution Badge */}
          {message.isAcceptedSolution && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold tracking-wide">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Accepted Solution (+25 Karma)
            </span>
          )}

          {/* Pinned Pill */}
          {message.isPinned && (
            <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-semibold">
              <Pin className="w-2.5 h-2.5" />
              Pinned
            </span>
          )}

          <span className="text-[10px] text-gray-500 ml-auto font-mono">{formattedTime}</span>
        </div>

        {/* Reply Context Bar (if replying to another message) */}
        {message.replyTo && (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-400 pl-2 border-l-2 border-[#162544]">
            <span className="text-[10px] text-blue-400 font-semibold">
              @{message.replyTo.senderId?.fullName || "User"}:
            </span>
            <span className="truncate max-w-[300px] text-gray-400 text-[11px]">
              {message.replyTo.content || "[Code or Attachment]"}
            </span>
          </div>
        )}

        {/* Main Text with KaTeX Math Rendering */}
        {message.content && (
          <div className="mt-1 text-xs leading-relaxed text-gray-200 break-words select-text">
            {renderMathAndText(message.content)}
          </div>
        )}

        {/* ── Code Snippet Showcase with 1-Click Sandbox Runner ── */}
        {message.codeSnippet && (
          <div className="mt-2.5 rounded-xl overflow-hidden border border-[#162544] bg-[#080D1A] text-gray-200">
            {/* Code Header Bar */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#0F1A30] border-b border-[#162544] text-[11px]">
              <div className="flex items-center gap-2">
                <Code className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-semibold text-gray-300">
                  {message.codeSnippet.title || `${message.codeSnippet.language.toUpperCase()} Snippet`}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#162544] text-cyan-300">
                  {message.codeSnippet.language}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* 1-Click Sandbox Runner */}
                <button
                  onClick={() => handleRunCode(message.codeSnippet!.code, message.codeSnippet!.language)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all"
                  title="Run code live in browser sandbox"
                >
                  <Play className="w-2.5 h-2.5 fill-current" />
                  Run
                </button>

                {/* Copy Button */}
                <button
                  onClick={() => handleCopyCode(message.codeSnippet!.code)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium text-gray-400 hover:text-white hover:bg-[#162544] transition-colors"
                >
                  {copiedCode ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                  {copiedCode ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            {/* Prism Code Block */}
            <pre className="p-3 text-[11px] font-mono leading-relaxed overflow-x-auto text-gray-300 select-text">
              <code
                dangerouslySetInnerHTML={{
                  __html: highlightedCode || message.codeSnippet.code
                }}
              />
            </pre>

            {/* Sandbox Execution Console Drawer */}
            {isSandboxOpen && sandboxResult && (
              <div className="p-2.5 bg-[#050811] border-t border-[#162544] font-mono text-[10px]">
                <div className="flex items-center justify-between text-gray-400 mb-1">
                  <span className="flex items-center gap-1 font-bold text-gray-300">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    Sandbox Execution Console
                  </span>
                  <button
                    onClick={() => setIsSandboxOpen(false)}
                    className="text-gray-500 hover:text-gray-300"
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
                className="flex items-center gap-2 p-2 rounded-xl bg-[#080D1A] border border-[#162544] hover:border-blue-500/40 text-xs transition-colors group"
              >
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-300 group-hover:text-white font-medium truncate max-w-[150px]">
                    {file.originalName}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <Download className="w-3 h-3 text-gray-500 group-hover:text-blue-400 ml-1" />
              </a>
            ))}
          </div>
        )}

        {/* ── Reactions Bar ── */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.reactions.map((r, idx) => {
              const hasReacted = currentUserId && r.users.includes(currentUserId);
              return (
                <button
                  key={idx}
                  onClick={() => onReact?.(message._id, r.emoji)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all ${
                    hasReacted
                      ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                      : "bg-[#080D1A] text-gray-400 border border-[#162544] hover:border-gray-500"
                  }`}
                >
                  <span>{r.emoji}</span>
                  <span className="text-[10px] font-bold">{r.users.length}</span>
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
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors group"
            >
              <MessageSquare className="w-3 h-3 group-hover:scale-110 transition-transform" />
              <span>
                {message.threadCount} {message.threadCount === 1 ? "reply" : "replies"}
              </span>
              <span className="text-[10px] text-gray-500 font-normal">
                • View Thread in Drawer
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
