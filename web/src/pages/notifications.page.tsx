import { useState } from "react";
import { NotificationList } from "../components/notification-list";
import { useDeleteNotification, useMarkAllAsRead, useMarkAsRead, useNotifications } from "../hooks/use-notification";

export function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useNotifications({
    limit: 20,
    unreadOnly: unreadOnly || undefined
  });
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();

  const notifications = data?.pages.flatMap((p) => p.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  return (
    <div className="animate-fade-up">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {total} notification{total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
              unreadOnly
                ? "bg-signal-50 text-signal-600 dark:bg-signal-500/10 dark:text-signal-300"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/[0.06] dark:text-slate-400 dark:hover:bg-white/[0.1]"
            }`}
            onClick={() => setUnreadOnly(!unreadOnly)}
          >
            Unread only
          </button>
          <button
            type="button"
            className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200 dark:bg-white/[0.06] dark:text-slate-400 dark:hover:bg-white/[0.1]"
            onClick={() => markAllAsRead.mutate()}
          >
            Mark all read
          </button>
        </div>
      </div>

      <NotificationList
        notifications={notifications}
        onMarkRead={(id) => markAsRead.mutate(id)}
        onDelete={(id) => deleteNotification.mutate(id)}
      />

      {hasNextPage && (
        <div className="mt-6 text-center">
          <button
            type="button"
            className="primary-button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
