import { useState, useMemo, useEffect } from "react";
import {
  Search,
  CheckCheck,
  Inbox,
  Megaphone,
  Mail,
  Users,
  Calendar,
  Smile,
  AlertCircle,
  Trash2,
  Sparkles,
  Bell
} from "lucide-react";
import { DashboardSidebar } from "../components/layout/dashboard-sidebar";
import { NotificationList } from "../components/notification-list";
import {
  useDeleteNotification,
  useMarkAllAsRead,
  useMarkAsRead,
  useNotifications
} from "../hooks/use-notification";
import {
  type CampusNotificationItem,
  loadSavedCampusNotifications,
  getDeletedNotificationIds,
  markCampusNotificationAsRead,
  markAllCampusNotificationsAsRead,
  deleteCampusNotification,
  clearAllCampusNotifications
} from "../utils/notifications";
import type { Notification, NotificationType } from "../types/notification";
import { useToastStore } from "../store/toast.store";

export function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "read">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { addToast } = useToastStore();

  const [localItems, setLocalItems] = useState<CampusNotificationItem[]>(loadSavedCampusNotifications);

  // Synchronize local items when notifications update across windows or tabs
  useEffect(() => {
    const handleUpdate = () => {
      setLocalItems(loadSavedCampusNotifications());
    };
    window.addEventListener("studyconnect:notifications-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("studyconnect:notifications-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useNotifications({
    limit: 50
  });

  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();

  // Combine server & persistent local notifications with strict ID deduplication
  const allNotifications = useMemo<Notification[]>(() => {
    const deletedIds = getDeletedNotificationIds();
    const serverItems = data?.pages.flatMap((p) => p.items) ?? [];

    const seenIds = new Set<string>();
    const combined: Notification[] = [];

    // 1. Add server notifications first (excluding deleted)
    for (const item of serverItems) {
      if (!deletedIds.has(item._id) && !seenIds.has(item._id)) {
        seenIds.add(item._id);
        combined.push(item);
      }
    }

    // 2. Add local storage notifications
    for (const local of localItems) {
      if (!deletedIds.has(local.id) && !seenIds.has(local.id)) {
        seenIds.add(local.id);
        combined.push({
          _id: local.id,
          userId: "u-me",
          type: local.type as NotificationType,
          title: local.title,
          message: local.message,
          entityType: local.categoryTag || "Campus",
          entityId: null,
          isRead: local.isRead,
          readAt: local.isRead ? new Date().toISOString() : null,
          createdAt: new Date(local.createdAt).toISOString(),
          updatedAt: new Date(local.createdAt).toISOString()
        });
      }
    }

    return combined.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [data, localItems]);

  // Filter notifications locally
  const filteredNotifications = useMemo(() => {
    let list = [...allNotifications];

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
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (n) => n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q)
      );
    }

    return list;
  }, [allNotifications, activeTab, categoryFilter, searchQuery]);

  const unreadCount = useMemo(() => {
    return allNotifications.filter((n) => !n.isRead).length;
  }, [allNotifications]);

  const handleMarkRead = (id: string) => {
    markCampusNotificationAsRead(id);
    setLocalItems(loadSavedCampusNotifications());
    try {
      markAsRead.mutate(id);
    } catch {}
  };

  const handleMarkAllRead = () => {
    markAllCampusNotificationsAsRead();
    setLocalItems(loadSavedCampusNotifications());
    try {
      markAllAsRead.mutate();
    } catch {}
    addToast("All notifications marked as read.", "success");
  };

  const handleDelete = (id: string) => {
    deleteCampusNotification(id);
    setLocalItems(loadSavedCampusNotifications());
    try {
      deleteNotification.mutate(id);
    } catch {}
    addToast("Notification removed.", "info");
  };

  const handleClearAll = () => {
    clearAllCampusNotifications();
    setLocalItems([]);
    addToast("Notification inbox cleared.", "info");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-50 font-sans antialiased transition-colors duration-300">
      {/* ── 1. App Navigation Sidebar ───────────────────────────────────── */}
      <DashboardSidebar currentNav="/notifications" />

      {/* ── 2. Main Scrollable Inbox Stream ────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          
          {/* Header Panel */}
          <header className="flex flex-col justify-between gap-5 pb-6 md:flex-row md:items-end border-b border-slate-200 dark:border-white/10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1E90FF]/10 text-[#1E90FF] border border-[#1E90FF]/25 text-[10px] font-extrabold uppercase tracking-widest mb-3">
                <Bell size={12} />
                <span>Student Workspace</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                Notifications Inbox
                {unreadCount > 0 && (
                  <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-[#1E90FF]/15 text-[#1E90FF] border border-[#1E90FF]/30 tabular-nums">
                    {unreadCount} unread
                  </span>
                )}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Track direct messages, community updates, resource uploads, and campus announcements in real time.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1E90FF] text-white hover:bg-[#187bcd] text-xs font-bold transition-all shadow-sm shadow-[#1E90FF]/25 cursor-pointer"
                  onClick={handleMarkAllRead}
                  disabled={markAllAsRead.isPending}
                >
                  <CheckCheck size={14} />
                  <span>Mark all read</span>
                </button>
              )}

              {allNotifications.length > 0 && (
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 hover:border-rose-500/30 text-slate-600 dark:text-slate-300 hover:text-rose-500 hover:bg-rose-500/10 text-xs font-bold transition-colors cursor-pointer"
                  onClick={handleClearAll}
                  title="Clear all notifications"
                >
                  <Trash2 size={13} />
                  <span>Clear inbox</span>
                </button>
              )}
            </div>
          </header>

          {/* Tabs list (All, Unread, Read) */}
          <div className="flex border-b border-slate-200 dark:border-white/10 pb-px gap-2">
            <button
              onClick={() => setActiveTab("all")}
              className={`flex items-center justify-center gap-2 border-b-2 px-5 py-3 text-xs font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                activeTab === "all"
                  ? "border-[#1E90FF] text-[#1E90FF]"
                  : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              <Inbox size={14} />
              <span>All ({allNotifications.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("unread")}
              className={`flex items-center justify-center gap-2 border-b-2 px-5 py-3 text-xs font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                activeTab === "unread"
                  ? "border-[#1E90FF] text-[#1E90FF]"
                  : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              <AlertCircle size={14} />
              <span>Unread ({unreadCount})</span>
            </button>
            <button
              onClick={() => setActiveTab("read")}
              className={`flex items-center justify-center gap-2 border-b-2 px-5 py-3 text-xs font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                activeTab === "read"
                  ? "border-[#1E90FF] text-[#1E90FF]"
                  : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              <CheckCheck size={14} />
              <span>Read ({allNotifications.length - unreadCount})</span>
            </button>
          </div>

          {/* Search Input & Category Filters */}
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1E90FF] transition-colors shadow-xs"
                placeholder="Search notifications by title, subject, or message..."
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
                { id: "events", label: "Event & Vault", icon: Calendar },
                { id: "mentions", label: "Mentions", icon: Smile }
              ].map(({ id, label, icon: Icon }) => {
                const isSelected = categoryFilter === id;
                return (
                  <button
                    key={id}
                    onClick={() => setCategoryFilter(id)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all duration-200 border cursor-pointer ${
                      isSelected
                        ? "bg-[#1E90FF] border-[#1E90FF] text-white shadow-sm shadow-[#1E90FF]/30"
                        : "bg-white dark:bg-[#0c1424] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-[#1E90FF]/40 hover:text-[#1E90FF]"
                    }`}
                  >
                    <Icon size={12} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notifications List */}
          <div className="space-y-3">
            {filteredNotifications.length === 0 ? (
              <div className="py-20 text-center rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white/50 dark:bg-white/[0.02] p-8">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.15)] mb-4">
                  <Sparkles size={28} />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {searchQuery ? "No matching notifications found" : "Inbox Zero Reached ✨"}
                </h3>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  {searchQuery
                    ? "Try adjusting your search terms or selecting a different category filter."
                    : "You are all caught up! New alerts, direct messages, and course updates will appear here."}
                </p>
              </div>
            ) : (
              <NotificationList
                notifications={filteredNotifications}
                onMarkRead={handleMarkRead}
                onDelete={handleDelete}
              />
            )}
          </div>

          {/* Pagination load more */}
          {hasNextPage && (
            <div className="mt-8 text-center">
              <button
                type="button"
                className="mx-auto px-6 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-[#1E90FF] hover:text-[#1E90FF] transition-colors cursor-pointer"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? "Loading more..." : "Load older notifications"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

