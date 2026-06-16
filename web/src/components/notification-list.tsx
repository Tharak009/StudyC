import type { Notification } from "../types/notification";
import { NotificationCard } from "./notification-card";

interface NotificationListProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NotificationList({ notifications, onMarkRead, onDelete }: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">No notifications yet</p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Notifications will appear here when something happens.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {notifications.map((notification) => (
        <NotificationCard
          key={notification._id}
          notification={notification}
          onMarkRead={onMarkRead}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
