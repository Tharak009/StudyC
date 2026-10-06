import React, { useState, useEffect, useMemo } from "react";
import Prism from "prismjs";
import katex from "katex";
import { Copy, Check, ExternalLink } from "lucide-react";
import { linkPreviewApi } from "../../api/link-preview.api";
import { LinkPreviewCard } from "./cards/LinkPreviewCard";
import type { LinkPreviewPayload } from "../../types/chat";

// Import common Prism components
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";
import "prismjs/components/prism-markdown";

interface AcademicMessageRendererProps {
  text: string;
  isMine?: boolean;
}

// URL extraction regex
const URL_REGEX = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/gi;

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const cleanLang = language.toLowerCase().trim();
  const grammar = Prism.languages[cleanLang] || Prism.languages.javascript || Prism.languages.clike;

  const highlighted = useMemo(() => {
    try {
      return Prism.highlight(code, grammar, cleanLang || "javascript");
    } catch {
      return code;
    }
  }, [code, grammar, cleanLang]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  return (
    <div className="relative my-2 rounded-2xl overflow-hidden border border-slate-700/80 bg-[#0F1726] shadow-md font-mono text-xs group">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#090E1A] border-b border-slate-800 text-[11px] text-slate-400">
        <span className="font-semibold uppercase tracking-wider text-sky-400">
          {cleanLang || "code"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check size={12} className="text-emerald-400" />
              <span className="text-[10px] text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span className="text-[10px]">Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code body */}
      <div className="p-3.5 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700">
        <pre className="!bg-transparent !p-0 !m-0">
          <code
            className={`language-${cleanLang || "javascript"} !bg-transparent text-slate-100 leading-relaxed`}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </pre>
      </div>
    </div>
  );
}

function MathBlock({ math, displayMode }: { math: string; displayMode: boolean }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(math, {
        displayMode,
        throwOnError: false
      });
    } catch {
      return math;
    }
  }, [math, displayMode]);

  return (
    <span
      className={
        displayMode
          ? "block my-2 p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 overflow-x-auto text-center"
          : "inline-block px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 mx-0.5"
      }
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function AcademicMessageRenderer({ text, isMine = false }: AcademicMessageRendererProps) {
  const [previews, setPreviews] = useState<LinkPreviewPayload[]>([]);

  // Find all URLs and fetch preview for the first valid HTTP URL
  useEffect(() => {
    const matches = text.match(URL_REGEX);
    if (!matches || matches.length === 0) return;

    const firstUrl = matches[0];
    let isMounted = true;

    linkPreviewApi
      .getPreview(firstUrl)
      .then((data) => {
        if (isMounted && data && (data.title || data.description || data.imageUrl)) {
          setPreviews([data]);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [text]);

  // Segment the message by fenced code blocks (```lang\n...```)
  const segments = useMemo(() => {
    const result: Array<{ type: "text" | "code"; content: string; lang?: string }> = [];
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        result.push({ type: "text", content: text.slice(lastIndex, match.index) });
      }
      result.push({
        type: "code",
        lang: match[1] || "text",
        content: match[2].trim()
      });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      result.push({ type: "text", content: text.slice(lastIndex) });
    }

    return result;
  }, [text]);

  return (
    <div className="space-y-1">
      {segments.map((seg, idx) => {
        if (seg.type === "code") {
          return <CodeBlock key={idx} code={seg.content} language={seg.lang || "text"} />;
        }

        // Parse inline math ($...$), display math ($$...$$), inline code (`...`), and links
        const raw = seg.content;
        const textParts = raw.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|`[^`\n]+`|https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g);

        return (
          <p
            key={idx}
            className="whitespace-pre-wrap break-words leading-relaxed text-sm"
          >
            {textParts.map((part, pIdx) => {
              // 1. Display math $$...$$
              if (part.startsWith("$$") && part.endsWith("$$") && part.length > 4) {
                const math = part.slice(2, -2).trim();
                return <MathBlock key={pIdx} math={math} displayMode={true} />;
              }

              // 2. Inline math $...$
              if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
                const math = part.slice(1, -1).trim();
                return <MathBlock key={pIdx} math={math} displayMode={false} />;
              }

              // 3. Inline code `...`
              if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
                const inlineCode = part.slice(1, -1);
                return (
                  <code
                    key={pIdx}
                    className={`px-1.5 py-0.5 mx-0.5 rounded-md font-mono text-xs border ${
                      isMine
                        ? "bg-white/20 text-white border-white/30"
                        : "bg-slate-200/80 dark:bg-slate-800 text-sky-600 dark:text-sky-300 border-slate-300/60 dark:border-slate-700"
                    }`}
                  >
                    {inlineCode}
                  </code>
                );
              }

              // 4. Hyperlinks
              if (/^https?:\/\//i.test(part)) {
                return (
                  <a
                    key={pIdx}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-0.5 font-medium underline underline-offset-2 hover:opacity-80 transition-opacity ${
                      isMine ? "text-white" : "text-[#1E90FF]"
                    }`}
                  >
                    <span>{part}</span>
                    <ExternalLink size={11} className="inline ml-0.5 shrink-0" />
                  </a>
                );
              }

              // 5. Plain text
              return part;
            })}
          </p>
        );
      })}

      {/* Link preview card if available */}
      {previews.length > 0 && (
        <div className="pt-1">
          {previews.map((preview, i) => (
            <LinkPreviewCard key={i} preview={preview} />
          ))}
        </div>
      )}
    </div>
  );
}
