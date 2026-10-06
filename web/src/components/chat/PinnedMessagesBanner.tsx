import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pin, ChevronDown, ChevronUp, CornerDownRight, X } from "lucide-react";
import type { LocalMessage } from "stream-chat";

interface PinnedMessagesBannerProps {
  pinnedMessages: LocalMessage[];
  canPin?: boolean;
  onJumpToMessage: (messageId: string) => void;
  onUnpinMessage?: (message: LocalMessage) => void;
}

export function PinnedMessagesBanner({
  pinnedMessages,
  canPin = false,
  onJumpToMessage,
  onUnpinMessage
}: PinnedMessagesBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!pinnedMessages || pinnedMessages.length === 0) {
    return null;
  }

  const latestPinned = pinnedMessages[pinnedMessages.length - 1];

  return (
    <div className="border-b border-slate-200/80 dark:border-slate-800 bg-amber-50/60 dark:bg-amber-950/20 px-4 py-2 shrink-0 transition-all">
      {/* Compact Header Bar */}
      <div className="flex items-center justify-between gap-3 text-xs">
        <div
          onClick={() => {
            if (pinnedMessages.length === 1 && latestPinned) {
              onJumpToMessage(latestPinned.id);
            } else {
              setIsExpanded(!isExpanded);
            }
          }}
          className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer group"
          title="Click to view pinned messages"
        >
          <div className="p-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
            <Pin size={13} className="fill-amber-500 text-amber-500" />
          </div>
          <span className="font-semibold text-amber-900 dark:text-amber-300 shrink-0">
            {pinnedMessages.length} {pinnedMessages.length === 1 ? "pinned message" : "pinned messages"}
          </span>
          <span className="text-slate-400 dark:text-slate-500">•</span>
          <p className="text-slate-600 dark:text-slate-400 truncate group-hover:underline">
            {latestPinned?.text || (latestPinned?.attachments?.length ? "[Attachment]" : "Pinned content")}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {latestPinned && (
            <button
              type="button"
              onClick={() => onJumpToMessage(latestPinned.id)}
              className="p-1 rounded-lg text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors cursor-pointer text-[11px] font-medium flex items-center gap-1"
              title="Jump to latest pinned message"
            >
              <CornerDownRight size={12} />
              <span className="hidden sm:inline">Jump</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors cursor-pointer"
            title={isExpanded ? "Collapse pinned messages" : "Expand pinned messages"}
            aria-label="Toggle pinned messages"
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Expanded Pinned List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden mt-2 pt-2 border-t border-amber-200/50 dark:border-amber-900/40 space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin"
          >
            {pinnedMessages.map((msg) => (
              <div
                key={msg.id}
                className="p-2.5 rounded-xl bg-white/80 dark:bg-[#111B2C] border border-amber-200/60 dark:border-amber-900/50 flex items-start justify-between gap-2.5 hover:border-amber-400 transition-colors group cursor-pointer"
                onClick={() => onJumpToMessage(msg.id)}
              >
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <div className="mt-0.5 shrink-0">
                    <Pin size={12} className="text-amber-500 fill-amber-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {msg.user?.name || "Classmate"}
                      </span>
                      {msg.pinned_at && (
                        <span className="text-[10px] text-slate-400">
                          {new Date(msg.pinned_at).toLocaleDateString([], {
                            month: "short",
                            day: "numeric"
                          })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5 leading-relaxed">
                      {msg.text || (msg.attachments?.length ? "[Attachment]" : "Pinned message")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => onJumpToMessage(msg.id)}
                    className="p-1 rounded-md text-slate-400 hover:text-[#1E90FF] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Jump to message"
                  >
                    <CornerDownRight size={13} />
                  </button>
                  {canPin && onUnpinMessage && (
                    <button
                      type="button"
                      onClick={() => onUnpinMessage(msg)}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Unpin message"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
