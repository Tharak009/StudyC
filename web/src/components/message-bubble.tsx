import { FileText, MoreHorizontal, Pencil, Reply, Trash2 } from "lucide-react";
import { Avatar } from "./avatar";
import type { ChatMessage } from "../types/chat";

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  canModerate: boolean;
  onReply: (message: ChatMessage) => void;
  onEdit: (message: ChatMessage) => void;
  onDelete: (message: ChatMessage) => void;
}

export function MessageBubble({
  message,
  isOwn,
  canModerate,
  onReply,
  onEdit,
  onDelete
}: MessageBubbleProps) {
  const canDelete = isOwn || canModerate;

  return (
    <article className={`group flex gap-3 py-3 ${isOwn ? "sm:flex-row-reverse" : ""}`}>
      <Avatar
        name={message.senderId.fullName}
        src={message.senderId.profilePicture}
        className="mt-1 size-9 shrink-0"
      />
      <div className={`min-w-0 max-w-[min(760px,86%)] ${isOwn ? "items-end" : ""}`}>
        <div className={`mb-1 flex items-center gap-2 ${isOwn ? "justify-end" : ""}`}>
          <span className="text-sm font-semibold">{message.senderId.fullName}</span>
          <span className="text-xs text-slate-400">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          {message.edited && !message.deleted && <span className="text-xs text-slate-400">edited</span>}
        </div>

        <div className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
          isOwn
            ? "bg-slate-950 text-white dark:bg-white dark:text-ink-950"
            : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 dark:bg-white/[0.05] dark:text-slate-200 dark:ring-white/10"
        }`}>
          {message.replyTo && (
            <div className={`mb-2 border-l-2 pl-2 text-xs ${
              isOwn ? "border-white/30 text-white/70 dark:border-ink-950/30 dark:text-ink-950/60" : "border-signal-400 text-slate-500 dark:text-slate-400"
            }`}>
              Replying to {message.replyTo.senderId?.fullName ?? "a message"}:{" "}
              {message.replyTo.deleted ? "deleted message" : message.replyTo.content.slice(0, 80)}
            </div>
          )}
          {message.deleted ? (
            <p className="italic opacity-65">This message was deleted.</p>
          ) : (
            <>
              {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
              {message.attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.attachments.map((attachment) => (
                    <a
                      key={attachment.key}
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
                        isOwn ? "bg-white/10 dark:bg-ink-950/10" : "bg-slate-100 dark:bg-white/[0.06]"
                      }`}
                    >
                      <FileText size={15} />
                      <span className="truncate">{attachment.originalName}</span>
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {!message.deleted && (
          <div className={`mt-1 flex gap-1 opacity-0 transition group-hover:opacity-100 ${isOwn ? "justify-end" : ""}`}>
            <button className="icon-button size-8" type="button" onClick={() => onReply(message)} aria-label="Reply">
              <Reply size={14} />
            </button>
            {isOwn && (
              <button className="icon-button size-8" type="button" onClick={() => onEdit(message)} aria-label="Edit">
                <Pencil size={14} />
              </button>
            )}
            {canDelete && (
              <button className="icon-button size-8 hover:text-red-600 dark:hover:text-red-400" type="button" onClick={() => onDelete(message)} aria-label="Delete">
                <Trash2 size={14} />
              </button>
            )}
            {!isOwn && <MoreHorizontal size={14} className="mt-2 text-slate-300" />}
          </div>
        )}
      </div>
    </article>
  );
}
