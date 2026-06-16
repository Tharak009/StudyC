import { Bell, Check, MessageCircle, MessagesSquare, Plus, ShieldAlert, Trash2, UserPlus } from "lucide-react";
import type { Notification, NotificationType } from "../types/notification";

interface NotificationCardProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NotificationCard({ notification, onMarkRead, onDelete }: NotificationCardProps) {
  const Icon = iconFor(notification.type);
  const time = formatRelativeTime(notification.createdAt);

  return (
    <div
      className={`group flex items-start gap-3 rounded-xl border p-3 transition-colors ${
        notification.isRead
          ? "border-transparent bg-transparent"
          : "border-signal-500/20 bg-signal-500/5 dark:border-signal-300/10 dark:bg-signal-300/5"
      }`}
    >
      <div
        className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg ${
          notification.isRead
            ? "bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400"
            : "bg-signal-50 text-signal-600 dark:bg-signal-500/10 dark:text-signal-300"
        }`}
      >
        <Icon size={16} />
      </div>

      <div className="min-w-0 flex-1">
        <p className={`text-sm ${notification.isRead ? "" : "font-semibold"}`}>{notification.title}</p>
        <p className="mt-0.5 text-xs text-slate-500 line-clamp-2 dark:text-slate-400">{notification.message}</p>
        <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">{time}</p>
      </div>

      <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {!notification.isRead && (
          <button
            type="button"
            className="icon-button size-7 rounded-lg text-slate-400 hover:bg-signal-50 hover:text-signal-600 dark:hover:bg-signal-500/10 dark:hover:text-signal-300"
            onClick={() => onMarkRead(notification._id)}
            aria-label="Mark as read"
          >
            <Check size={13} />
          </button>
        )}
        <button
          type="button"
          className="icon-button size-7 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          onClick={() => onDelete(notification._id)}
          aria-label="Delete notification"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function iconFor(type: NotificationType) {
  switch (type) {
    case "COMMUNITY_JOIN":
    case "COMMUNITY_INVITE":
      return UserPlus;
    case "COMMUNITY_UPDATE":
      return Plus;
    case "NEW_MESSAGE":
      return MessageCircle;
    case "DIRECT_MESSAGE":
      return MessagesSquare;
    case "RESOURCE_UPLOAD":
      return Bell;
    case "MENTION":
      return Bell;
    case "ADMIN_ALERT":
      return ShieldAlert;
    default:
      return Bell;
  }
}

function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateString).toLocaleDateString();
}
