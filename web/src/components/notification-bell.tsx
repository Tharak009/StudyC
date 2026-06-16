import { Bell } from "lucide-react";
import { useNotificationStore } from "../store/notification.store";

interface NotificationBellProps {
  onClick: () => void;
  hasNotifications?: boolean;
}

export function NotificationBell({ onClick, hasNotifications }: NotificationBellProps) {
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const showBadge = hasNotifications ?? unreadCount > 0;

  return (
    <button
      type="button"
      className="icon-button relative"
      onClick={onClick}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
    >
      <Bell size={18} />
      {showBadge && (
        <span className="absolute right-1.5 top-1.5 grid min-w-[16px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-4 text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}
