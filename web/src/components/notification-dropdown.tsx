import { useState } from "react";
import { useNavigate } from "react-router";
import { NotificationList } from "./notification-list";
import { useMarkAsRead, useMarkAllAsRead, useDeleteNotification, useNotifications } from "../hooks/use-notification";

interface NotificationDropdownProps {
  onClose: () => void;
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const navigate = useNavigate();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useNotifications({
    limit: 10,
    unreadOnly: unreadOnly || undefined
  });
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();

  const notifications = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-[min(90vw,400px)] animate-fade-up rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-ink-900">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-white/10">
        <h3 className="text-sm font-semibold">Notifications</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`text-xs font-medium transition-colors ${
              unreadOnly ? "text-signal-600 dark:text-signal-300" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
            }`}
            onClick={() => setUnreadOnly(!unreadOnly)}
          >
            Unread only
          </button>
          <button
            type="button"
            className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
            onClick={() => markAllAsRead.mutate()}
          >
            Mark all read
          </button>
        </div>
      </div>

      <div className="max-h-[60vh] overflow-y-auto px-4 py-3">
        <NotificationList
          notifications={notifications}
          onMarkRead={(id) => markAsRead.mutate(id)}
          onDelete={(id) => deleteNotification.mutate(id)}
        />
        {hasNextPage && (
          <button
            type="button"
            className="mt-3 w-full py-2 text-center text-xs font-medium text-signal-600 hover:text-signal-500 dark:text-signal-300 dark:hover:text-signal-200"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading..." : "Load more"}
          </button>
        )}
      </div>

      <div className="border-t border-slate-200 px-4 py-3 dark:border-white/10">
        <button
          type="button"
          className="w-full text-center text-xs font-medium text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
          onClick={() => {
            navigate("/notifications");
            onClose();
          }}
        >
          View all notifications
        </button>
      </div>
    </div>
  );
}
