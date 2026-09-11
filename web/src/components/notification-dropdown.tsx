import React, { useState } from "react";
import { NotificationList } from "./notification-list";
import { useMarkAsRead, useMarkAllAsRead, useDeleteNotification, useNotifications } from "../hooks/use-notification";
import { Bell, CheckCheck, X } from "lucide-react";
import { useToastStore } from "../store/toast.store";

interface NotificationDropdownProps {
  onClose: () => void;
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const [activeFilter, setActiveFilter] = useState<"all" | "unread">("all");
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useNotifications({
    limit: 15,
    unreadOnly: activeFilter === "unread" ? true : undefined
  });
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();
  const { addToast } = useToastStore();

  const notifications = data?.pages.flatMap((p) => p.items) ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = () => {
    markAllAsRead.mutate();
    addToast("All notifications marked as read.", "success");
  };

  return (
    <div className="absolute right-0 top-full z-50 mt-3 w-[min(92vw,420px)] animate-fade-up rounded-3xl border border-slate-200/80 dark:border-white/[0.08] bg-white/95 dark:bg-[#0c1322]/95 backdrop-blur-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] overflow-hidden text-slate-800 dark:text-slate-200 select-none">
      {/* Top glowing accent line */}
      <div className="h-1 w-full bg-gradient-to-r from-[#2563EB] via-[#38BDF8] to-emerald-400 opacity-80" />

      {/* Header */}
      <div className="p-4 pb-3 border-b border-slate-200/70 dark:border-white/[0.06]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-[#2563EB] to-[#38BDF8] text-white shadow-sm shadow-sky-500/30">
              <Bell size={14} />
            </div>
            <div>
              <h3 className="text-xs font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                Notifications
                {unreadCount > 0 && (
                  <span className="text-[9px] tabular-nums font-bold px-1.5 py-0.2 rounded-full bg-sky-500/15 text-[#0284C7] dark:text-[#38BDF8] border border-sky-500/20">
                    {unreadCount} new
                  </span>
                )}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                type="button"
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 transition-colors cursor-pointer"
                onClick={handleMarkAllRead}
                title="Mark all as read"
              >
                <CheckCheck size={12} />
                <span>Mark all read</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 mt-3">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
              activeFilter === "all"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-white/[0.06]"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("unread")}
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
              activeFilter === "unread"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-white/[0.06]"
            }`}
          >
            Unread only
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-[380px] overflow-y-auto no-scrollbar p-3 space-y-2">
        <NotificationList
          notifications={notifications}
          onMarkRead={(id) => markAsRead.mutate(id)}
          onDelete={(id) => deleteNotification.mutate(id)}
        />
        {hasNextPage && (
          <button
            type="button"
            className="mt-3 w-full py-2 text-center text-xs font-bold text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading more..." : "Load older notifications"}
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 bg-slate-50/60 dark:bg-black/20 border-t border-slate-200/60 dark:border-white/[0.05] flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span>Real-time Active</span>
        </div>
      </div>
    </div>
  );
}

export default NotificationDropdown;
