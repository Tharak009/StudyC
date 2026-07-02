import { useState, useMemo } from "react";
import { Search, CheckCheck, Inbox, Megaphone, Mail, Users, Calendar, Smile, AlertCircle } from "lucide-react";
import { NotificationList } from "../components/notification-list";
import { useDeleteNotification, useMarkAllAsRead, useMarkAsRead, useNotifications } from "../hooks/use-notification";

export function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "read">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useNotifications({
    limit: 50 // Fetch a larger chunk to allow instantaneous local filtering
  });

  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();

  const notifications = data?.pages.flatMap((p) => p.items) ?? [];

  // Filter notifications locally
  const filteredNotifications = useMemo(() => {
    let list = [...notifications];

    // Tab Filter (All vs Unread vs Read)
    if (activeTab === "unread") {
      list = list.filter((n) => !n.isRead);
    } else if (activeTab === "read") {
      list = list.filter((n) => n.isRead);
    }

    // Category Filter
    if (categoryFilter !== "all") {
      list = list.filter((n) => {
        if (categoryFilter === "announcements") return n.type === "ADMIN_ALERT" || n.type === "SYSTEM";
        if (categoryFilter === "messages") return n.type === "NEW_MESSAGE" || n.type === "DIRECT_MESSAGE";
        if (categoryFilter === "community") return n.type === "COMMUNITY_JOIN" || n.type === "COMMUNITY_INVITE" || n.type === "COMMUNITY_UPDATE";
        if (categoryFilter === "events") return n.type === "RESOURCE_UPLOAD";
        if (categoryFilter === "mentions") return n.type === "MENTION";
        return true;
      });
    }

    // Search Query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (n) => n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q)
      );
    }

    return list;
  }, [notifications, activeTab, categoryFilter, searchQuery]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  return (
    <div className="animate-fade-up space-y-8">
      {/* Header Panel */}
      <header className="flex flex-col justify-between gap-5 pb-5 md:flex-row md:items-end border-b border-slate-200 dark:border-white/5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
            Student Workspace
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-slate-900 dark:text-white sm:text-5xl">
            Notifications inbox.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Keep track of direct messages, community activities, grade alerts, and campus announcements.
          </p>
        </div>

        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              className="primary-button text-xs py-2 px-4 shadow-sm"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          )}
        </div>
      </header>

      {/* Tabs list (All, Unread, Read) */}
      <div className="flex border-b border-slate-200 dark:border-white/5 pb-px">
        <button
          onClick={() => setActiveTab("all")}
          className={`flex items-center justify-center gap-2 border-b-2 px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            activeTab === "all"
              ? "border-indigo-600 text-indigo-750 dark:border-indigo-500 dark:text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-655"
          }`}
        >
          <Inbox size={14} />
          All ({notifications.length})
        </button>
        <button
          onClick={() => setActiveTab("unread")}
          className={`flex items-center justify-center gap-2 border-b-2 px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            activeTab === "unread"
              ? "border-indigo-600 text-indigo-750 dark:border-indigo-500 dark:text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-655"
          }`}
        >
          <AlertCircle size={14} />
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setActiveTab("read")}
          className={`flex items-center justify-center gap-2 border-b-2 px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            activeTab === "read"
              ? "border-indigo-600 text-indigo-750 dark:border-indigo-500 dark:text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-655"
          }`}
        >
          <CheckCheck size={14} />
          Read ({notifications.length - unreadCount})
        </button>
      </div>

      {/* Search Input & Category Filters */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="field pl-9 text-xs py-2 bg-white dark:bg-ink-900 border-slate-200 dark:border-white/5"
            placeholder="Search notifications by title or message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Categories Chips */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: "All Categories", icon: Inbox },
            { id: "announcements", label: "Announcements", icon: Megaphone },
            { id: "messages", label: "Messages", icon: Mail },
            { id: "community", label: "Community Activity", icon: Users },
            { id: "events", label: "Event Updates", icon: Calendar },
            { id: "mentions", label: "Mentions", icon: Smile }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setCategoryFilter(id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all duration-200 border cursor-pointer ${
                categoryFilter === id
                  ? "bg-slate-950 border-slate-950 text-white dark:bg-white dark:border-white dark:text-ink-950"
                  : "bg-white border-slate-250 text-slate-550 hover:bg-slate-50 hover:border-slate-350 dark:bg-ink-900 dark:border-white/5 dark:text-slate-400 dark:hover:bg-white/[0.02]"
              }`}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        <NotificationList
          notifications={filteredNotifications}
          onMarkRead={(id) => markAsRead.mutate(id)}
          onDelete={(id) => deleteNotification.mutate(id)}
        />
      </div>

      {/* Pagination load more */}
      {hasNextPage && (
        <div className="mt-8 text-center">
          <button
            type="button"
            className="secondary-button mx-auto text-xs py-2 px-6"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading more..." : "Load older notifications"}
          </button>
        </div>
      )}
    </div>
  );
}
