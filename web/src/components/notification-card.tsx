import { Bell, Check, MessageCircle, MessagesSquare, Plus, ShieldAlert, Trash2, UserPlus, Heart, Smile, Calendar, Megaphone, Terminal } from "lucide-react";
import type { Notification, NotificationType } from "../types/notification";

interface NotificationCardProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NotificationCard({ notification, onMarkRead, onDelete }: NotificationCardProps) {
  const Icon = iconFor(notification.type);
  const theme = themeFor(notification.type);
  const time = formatRelativeTime(notification.createdAt);

  return (
    <div
      onClick={() => {
        if (!notification.isRead) onMarkRead(notification._id);
      }}
      className={`group flex items-start gap-4 rounded-2xl border p-4 transition-all duration-200 cursor-pointer ${
        notification.isRead
          ? "border-slate-100 bg-white/50 hover:bg-slate-50/50 dark:border-white/5 dark:bg-ink-900/50 dark:hover:bg-ink-900/80"
          : `${theme.border} ${theme.bg} shadow-sm`
      }`}
    >
      {/* Icon Badge */}
      <div
        className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl transition-transform group-hover:scale-102 ${
          notification.isRead
            ? "bg-slate-150 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400"
            : theme.badge
        }`}
      >
        <Icon size={16} />
      </div>

      {/* Main Text Content */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`text-xs tracking-tight ${notification.isRead ? "text-slate-700 dark:text-slate-300" : "font-extrabold text-slate-900 dark:text-white"}`}>
            {notification.title}
          </p>
          {!notification.isRead && (
            <span className="size-1.5 rounded-full bg-[#1E90FF] shadow-xs shadow-[#1E90FF] shrink-0" />
          )}
        </div>
        <p className="text-[11px] leading-relaxed text-slate-500 line-clamp-2 dark:text-slate-400">{notification.message}</p>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pt-0.5">{time}</p>
      </div>

      {/* Action Buttons */}
      <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
        {!notification.isRead && (
          <button
            type="button"
            className="icon-button size-7 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"
            onClick={() => onMarkRead(notification._id)}
            title="Mark as read"
          >
            <Check size={13} className="text-slate-550" />
          </button>
        )}
        <button
          type="button"
          className="icon-button size-7 rounded-lg hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
          onClick={() => onDelete(notification._id)}
          title="Delete notification"
        >
          <Trash2 size={13} className="text-slate-500 hover:text-current" />
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
      return Calendar;
    case "MENTION":
      return Smile;
    case "ADMIN_ALERT":
      return ShieldAlert;
    case "SYSTEM":
      return Megaphone;
    default:
      return Bell;
  }
}

function themeFor(type: NotificationType) {
  switch (type) {
    case "ADMIN_ALERT":
    case "SYSTEM":
      return {
        bg: "bg-amber-50/50 dark:bg-amber-950/15",
        border: "border-amber-250 dark:border-amber-900/30",
        badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
      };
    case "NEW_MESSAGE":
    case "DIRECT_MESSAGE":
      return {
        bg: "bg-[#1E90FF]/5 dark:bg-[#1E90FF]/10",
        border: "border-[#1E90FF]/25 dark:border-[#1E90FF]/30",
        badge: "bg-[#1E90FF]/15 text-[#1E90FF]"
      };
    case "COMMUNITY_JOIN":
    case "COMMUNITY_INVITE":
    case "COMMUNITY_UPDATE":
      return {
        bg: "bg-emerald-50/40 dark:bg-emerald-950/15",
        border: "border-emerald-250 dark:border-emerald-900/30",
        badge: "bg-emerald-100 text-emerald-750 dark:bg-emerald-900/30 dark:text-emerald-400"
      };
    case "RESOURCE_UPLOAD":
      return {
        bg: "bg-teal-50/40 dark:bg-teal-950/15",
        border: "border-teal-250 dark:border-teal-900/30",
        badge: "bg-teal-100 text-teal-750 dark:bg-teal-900/30 dark:text-teal-400"
      };
    case "MENTION":
      return {
        bg: "bg-rose-50/40 dark:bg-rose-950/15",
        border: "border-rose-250 dark:border-rose-900/30",
        badge: "bg-rose-100 text-rose-750 dark:bg-rose-900/30 dark:text-rose-450"
      };
    default:
      return {
        bg: "bg-slate-50/40 dark:bg-white/[0.01]",
        border: "border-slate-200 dark:border-white/5",
        badge: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300"
      };
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
