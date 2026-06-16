import { Check, CheckCheck } from "lucide-react";

interface ReadReceiptIndicatorProps {
  read: boolean;
  isOwn: boolean;
  createdAt: string;
  readAt?: string | null;
}

export function ReadReceiptIndicator({ read, isOwn, createdAt, readAt }: ReadReceiptIndicatorProps) {
  if (!isOwn) return null;

  const time = new Date(readAt || createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <span className="inline-flex items-center gap-0.5 text-xs" title={time}>
      {read ? (
        <CheckCheck size={14} className="text-signal-500" />
      ) : (
        <Check size={14} className="text-slate-400" />
      )}
    </span>
  );
}
