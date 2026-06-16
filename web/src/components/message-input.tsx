import { FileUp, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface MessageContext {
  _id: string;
  content: string;
  senderId: { fullName: string };
}

interface MessageInputProps {
  disabled?: boolean;
  replyTo: MessageContext | null;
  editing: MessageContext | null;
  placeholder?: string;
  onCancelContext: () => void;
  onSend: (content: string, files: File[]) => void;
  onEdit: (content: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
}

export function MessageInput({
  disabled,
  replyTo,
  editing,
  placeholder = "Message",
  onCancelContext,
  onSend,
  onEdit,
  onTypingStart,
  onTypingStop
}: MessageInputProps) {
  const [content, setContent] = useState(editing?.content ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setContent(editing?.content ?? "");
  }, [editing]);

  const submit = () => {
    const next = content.trim();
    if (editing) {
      if (next) onEdit(next);
    } else if (next || files.length > 0) {
      onSend(next, files);
    }
    setContent("");
    setFiles([]);
    onTypingStop();
  };

  return (
    <div className="border-t border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-ink-950">
      {(replyTo || editing) && (
        <div className="mb-2 flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs text-slate-500 ring-1 ring-slate-200 dark:bg-white/[0.05] dark:text-slate-400 dark:ring-white/10">
          <span>
            {editing ? "Editing message" : `Replying to ${replyTo?.senderId.fullName}`}
          </span>
          <button className="icon-button size-7" type="button" onClick={onCancelContext} aria-label="Cancel">
            <X size={14} />
          </button>
        </div>
      )}
      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map((file) => (
            <span key={file.name} className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium dark:bg-white/10">
              {file.name}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <button
          className="icon-button"
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={disabled || Boolean(editing)}
          aria-label="Attach files"
        >
          <FileUp size={18} />
        </button>
        <textarea
          className="field max-h-36 min-h-11 resize-none"
          placeholder={editing ? "Edit your message" : placeholder}
          value={content}
          disabled={disabled}
          onChange={(event) => setContent(event.target.value)}
          onFocus={onTypingStart}
          onBlur={onTypingStop}
          rows={1}
          maxLength={2000}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <button className="primary-button min-h-11 px-4" type="button" onClick={submit} disabled={disabled}>
          <Send size={17} />
        </button>
        <input
          ref={fileInput}
          className="sr-only"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
        />
      </div>
    </div>
  );
}
