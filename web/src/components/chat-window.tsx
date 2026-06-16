import { FileText, LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DirectMessage } from "../types/direct-message";
import { Avatar } from "./avatar";
import { ReadReceiptIndicator } from "./read-receipt-indicator";
import { TypingIndicator } from "./typing-indicator";

interface ChatWindowProps {
  messages: DirectMessage[];
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  typingUserIds: string[];
  participantName: string;
  participantId: string;
  currentUserId: string;
  onReply: (message: DirectMessage) => void;
  onEdit: (message: DirectMessage) => void;
}

export function ChatWindow({
  messages,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  typingUserIds,
  participantName,
  currentUserId,
  onReply,
  onEdit
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const orderedMessages = useMemo(
    () =>
      [...messages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    [messages]
  );

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [orderedMessages.length, autoScroll]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 150;
    setAutoScroll(isNearBottom);
  };

  return (
    <div className="flex flex-1 flex-col">
      <div
        className="flex-1 overflow-y-auto px-4 py-4"
        onScroll={handleScroll}
      >
        {hasNextPage && (
          <div className="mb-4 text-center">
            <button
              className="secondary-button text-sm"
              type="button"
              onClick={onLoadMore}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage && <LoaderCircle className="animate-spin" size={14} />}
              Load older messages
            </button>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <LoaderCircle className="animate-spin" size={24} />
          </div>
        )}

        {!isLoading && orderedMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-sm text-slate-500 dark:text-slate-400">
            <p>No messages yet</p>
            <p className="mt-1 text-xs">Send a message to start the conversation</p>
          </div>
        )}

        {orderedMessages.map((message) => {
          const isOwn = message.senderId._id === currentUserId;
          return (
            <article
              key={message._id}
              className={`group flex gap-3 py-2 ${isOwn ? "sm:flex-row-reverse" : ""}`}
            >
              <Avatar
                name={message.senderId.fullName}
                src={message.senderId.profilePicture}
                className="mt-1 size-8 shrink-0"
              />
              <div className={`min-w-0 max-w-[min(680px,86%)] ${isOwn ? "items-end" : ""}`}>
                <div className={`mb-0.5 flex items-center gap-2 ${isOwn ? "justify-end" : ""}`}>
                  <span className="text-xs text-slate-400">
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                  {message.edited && !message.deleted && (
                    <span className="text-xs text-slate-400">edited</span>
                  )}
                  <ReadReceiptIndicator
                    read={message.read}
                    isOwn={isOwn}
                    createdAt={message.createdAt}
                    readAt={message.readAt}
                  />
                </div>

                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm leading-6 ${
                    isOwn
                      ? "bg-slate-950 text-white dark:bg-white dark:text-ink-950"
                      : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 dark:bg-white/[0.05] dark:text-slate-200 dark:ring-white/10"
                  }`}
                >
                  {message.replyTo && (
                    <div
                      className={`mb-1.5 border-l-2 pl-2 text-xs ${
                        isOwn
                          ? "border-white/30 text-white/70 dark:border-ink-950/30 dark:text-ink-950/60"
                          : "border-signal-400 text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      Replying to {message.replyTo.senderId?.fullName ?? "a message"}:{" "}
                      {message.replyTo.deleted
                        ? "deleted message"
                        : message.replyTo.content.slice(0, 80)}
                    </div>
                  )}

                  {message.deleted ? (
                    <p className="italic opacity-65">This message was deleted.</p>
                  ) : (
                    <>
                      {message.content && (
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      )}
                      {message.attachments.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {message.attachments.map((attachment) => (
                            <a
                              key={attachment.key}
                              href={attachment.url}
                              target="_blank"
                              rel="noreferrer"
                              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
                                isOwn
                                  ? "bg-white/10 dark:bg-ink-950/10"
                                  : "bg-slate-100 dark:bg-white/[0.06]"
                              }`}
                            >
                              <FileText size={14} />
                              <span className="truncate">{attachment.originalName}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {!message.deleted && (
                  <div
                    className={`mt-0.5 flex gap-1 opacity-0 transition group-hover:opacity-100 ${
                      isOwn ? "justify-end" : ""
                    }`}
                  >
                    <button
                      className="icon-button size-7"
                      type="button"
                      onClick={() => onReply(message)}
                      aria-label="Reply"
                    >
                      <span className="text-xs font-medium text-slate-400">Reply</span>
                    </button>
                    {isOwn && (
                      <button
                        className="icon-button size-7"
                        type="button"
                        onClick={() => onEdit(message)}
                        aria-label="Edit"
                      >
                        <span className="text-xs font-medium text-slate-400">Edit</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}

        <div ref={bottomRef} />
      </div>

      <TypingIndicator
        names={typingUserIds.map(() => participantName)}
      />
    </div>
  );
}
