import React from "react";
import { Bell } from "lucide-react";
import { useNotificationStore } from "../store/notification.store";

interface NotificationBellProps {
  onClick: () => void;
  hasNotifications?: boolean;
  className?: string;
}

export function NotificationBell({ onClick, hasNotifications, className = "" }: NotificationBellProps) {
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const showBadge = hasNotifications ?? unreadCount > 0;

  return (
    <button
      type="button"
      className={`relative h-9 w-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#080D1A] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer ${className}`}
      onClick={onClick}
      title={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
    >
      <Bell size={16} className={`transition-transform ${showBadge ? "hover:rotate-12" : ""}`} />
      {showBadge && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
          <span className="relative inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-gradient-to-r from-[#2563EB] to-[#38BDF8] text-[9px] tabular-nums font-black text-white shadow-sm shadow-sky-500/40">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        </span>
      )}
    </button>
  );
}

export default NotificationBell;
