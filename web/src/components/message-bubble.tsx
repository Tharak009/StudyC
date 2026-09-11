import { FileText, Pencil, Reply, Trash2, Download } from "lucide-react";
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
    <article className={`group flex gap-3 py-3 ${isOwn ? "flex-row-reverse" : ""}`}>
      <Avatar
        name={message.senderId.fullName}
        src={message.senderId.profilePicture}
        className="mt-0.5 size-9 shrink-0 ring-2 ring-sky-400/20"
      />
      <div className={`min-w-0 max-w-[min(720px,85%)] ${isOwn ? "items-end" : ""}`}>
        <div className={`mb-1 flex items-center gap-2 ${isOwn ? "justify-end" : ""}`}>
          <span className="text-xs font-bold text-foreground">{message.senderId.fullName}</span>
          <span className="text-[10px] text-muted-foreground font-medium">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          {message.edited && !message.deleted && (
            <span className="text-[10px] text-muted-foreground/70 italic">(edited)</span>
          )}
        </div>

        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm transition-all ${
            isOwn
              ? "bg-gradient-to-r from-sky-500 to-violet-600 text-white font-medium rounded-tr-none"
              : "bg-card text-foreground border border-border rounded-tl-none"
          }`}
        >
          {message.replyTo && (
            <div
              className={`mb-2 border-l-2 pl-2.5 py-0.5 text-xs rounded-r ${
                isOwn
                  ? "border-white/40 bg-white/10 text-white/90"
                  : "border-sky-400 bg-sky-400/5 text-muted-foreground"
              }`}
            >
              <span className="font-bold">Replying to {message.replyTo.senderId?.fullName ?? "a message"}</span>:{" "}
              {message.replyTo.deleted ? "deleted message" : message.replyTo.content.slice(0, 80)}
            </div>
          )}

          {message.deleted ? (
            <p className="italic text-xs opacity-75">This message was deleted.</p>
          ) : (
            <>
              {message.content && (
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
              )}

              {/* Attachments Card Render */}
              {message.attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.attachments.map((attachment) => (
                    <a
                      key={attachment.key}
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex items-center justify-between gap-3 rounded-xl p-3 text-xs font-semibold border transition-all ${
                        isOwn
                          ? "bg-white/15 border-white/20 hover:bg-white/25 text-white"
                          : "bg-muted/50 border-border hover:bg-muted text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-2 rounded-lg ${isOwn ? "bg-white/20" : "bg-sky-400/10 text-sky-500"}`}>
                          <FileText size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-bold">{attachment.originalName}</p>
                          <p className="text-[10px] opacity-80">{attachment.mimeType || "Document"}</p>
                        </div>
                      </div>
                      <Download size={14} className="shrink-0 opacity-80 hover:opacity-100" />
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Message Actions */}
        {!message.deleted && (
          <div
            className={`mt-1 flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${
              isOwn ? "justify-end" : ""
            }`}
          >
            <button
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              type="button"
              onClick={() => onReply(message)}
              title="Reply"
            >
              <Reply size={13} />
            </button>
            {isOwn && (
              <button
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                type="button"
                onClick={() => onEdit(message)}
                title="Edit"
              >
                <Pencil size={13} />
              </button>
            )}
            {canDelete && (
              <button
                className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                type="button"
                onClick={() => onDelete(message)}
                title="Delete"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
