import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Inbox,
  Bell,
  Archive,
  RotateCcw,
  CheckCheck,
  Check,
  Trash2,
  Search,
  X,
  Maximize2,
  Minimize2,
  Sparkles,
  BookOpen,
  ShieldAlert,
  Users,
  MessageSquare,
  AtSign,
  Filter,
  ExternalLink
} from "lucide-react";
import { useNavigate } from "react-router";
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useClearAllNotifications
} from "../hooks/use-notification";
import { useNotificationStore } from "../store/notification.store";
import { useToastStore } from "../store/toast.store";
import {
  type CampusNotificationItem,
  ARCHIVE_STORAGE_KEY,
  loadSavedCampusNotifications,
  getDeletedNotificationIds,
  markCampusNotificationAsRead,
  markAllCampusNotificationsAsRead,
  deleteCampusNotification,
  formatTimeAgo
} from "../utils/notifications";

export type { CampusNotificationItem };

export function ModernNotificationHub() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDrawerMode, setIsDrawerMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [inboxTab, setInboxTab] = useState<"inbox" | "archived" | "unread">("inbox");
  const [activeFilter, setActiveFilter] = useState<"all" | "mentions" | "vault" | "alerts" | "circles">("all");
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

  // Persistent archived notification IDs
  const [archivedIds, setArchivedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(ARCHIVE_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { addToast } = useToastStore();

  // Sync archive IDs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(archivedIds));
    } catch {
      // ignore storage error
    }
  }, [archivedIds]);

  // Lock body scroll when drawer mode is active
  useEffect(() => {
    if (isOpen && isDrawerMode) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen, isDrawerMode]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // API Hooks
  const { data: serverData } = useNotifications({ limit: 25 });
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
  const deleteNotificationMutation = useDeleteNotification();
  const clearAllNotificationsMutation = useClearAllNotifications();
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);

  // Merge server notifications with local notifications and deduplicate strictly
  const allNotifications = useMemo(() => {
    const deletedIds = getDeletedNotificationIds();
    const serverItems = serverData?.pages.flatMap((p) => p.items) ?? [];

    const mappedServer: CampusNotificationItem[] = serverItems
      .filter((n) => !deletedIds.has(n._id))
      .map((n) => ({
        id: n._id,
        type: n.type as CampusNotificationItem["type"],
        title: n.title,
        message: n.message,
        categoryTag: n.entityType || "Campus",
        time: formatTimeAgo(new Date(n.createdAt).getTime()),
        createdAt: new Date(n.createdAt).getTime(),
        isRead: n.isRead,
        href: n.type === "RESOURCE_UPLOAD" ? "/resources" : n.type === "MENTION" ? "/chat" : "/notifications"
      }));

    // Deduplicate strictly by ID
    const seenIds = new Set<string>();
    const combined: CampusNotificationItem[] = [];

    // Add server items first
    for (const item of mappedServer) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        combined.push(item);
      }
    }

    // Add local user-generated items if not already present or deleted
    for (const item of localItems) {
      if (!seenIds.has(item.id) && !deletedIds.has(item.id)) {
        seenIds.add(item.id);
        combined.push(item);
      }
    }

    return combined.sort((a, b) => b.createdAt - a.createdAt);
  }, [serverData, localItems]);

  // Active items in Inbox (not archived)
  const inboxItems = useMemo(() => {
    return allNotifications.filter((item) => !archivedIds.includes(item.id));
  }, [allNotifications, archivedIds]);

  // Archived items
  const archivedItems = useMemo(() => {
    return allNotifications.filter((item) => archivedIds.includes(item.id));
  }, [allNotifications, archivedIds]);

  // Unread items count (inbox only)
  const unreadCount = useMemo(() => {
    return inboxItems.filter((n) => !n.isRead).length;
  }, [inboxItems]);

  // Sync store unread count
  useEffect(() => {
    setUnreadCount(unreadCount);
  }, [unreadCount, setUnreadCount]);

  // Click outside to dismiss popover (only in compact popover mode)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!isDrawerMode && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen && !isDrawerMode) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, isDrawerMode]);

  // Filter items based on active inbox tab, search query, and category filter
  const displayedItems = useMemo(() => {
    let list: CampusNotificationItem[] = [];

    if (inboxTab === "inbox") {
      list = inboxItems;
    } else if (inboxTab === "archived") {
      list = archivedItems;
    } else if (inboxTab === "unread") {
      list = inboxItems.filter((item) => !item.isRead);
    }

    // Category filter
    if (activeFilter !== "all") {
      list = list.filter((item) => {
        if (activeFilter === "mentions") return item.type === "MENTION" || item.type === "DIRECT_MESSAGE";
        if (activeFilter === "vault") return item.type === "RESOURCE_UPLOAD";
        if (activeFilter === "alerts") return item.type === "ADMIN_ALERT" || item.type === "SYSTEM";
        if (activeFilter === "circles") return item.type === "COMMUNITY_UPDATE";
        return true;
      });
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.message.toLowerCase().includes(q) ||
          item.categoryTag?.toLowerCase().includes(q) ||
          item.senderName?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [inboxTab, inboxItems, archivedItems, activeFilter, searchQuery]);

  // Archive single item
  const handleArchive = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setArchivedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    handleMarkAsRead(id);
    addToast("Notification moved to archive.", "info");
  };

  // Unarchive item
  const handleUnarchive = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setArchivedIds((prev) => prev.filter((item) => item !== id));
    addToast("Notification restored to inbox.", "info");
  };

  // Archive all items in current inbox
  const handleArchiveAll = () => {
    const idsToArchive = inboxItems.map((item) => item.id);
    setArchivedIds((prev) => Array.from(new Set([...prev, ...idsToArchive])));
    markAllCampusNotificationsAsRead();
    setLocalItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
    try {
      markAllAsReadMutation.mutate();
    } catch {}
    addToast("All inbox notifications archived.", "success");
  };

  // Mark single as read
  const handleMarkAsRead = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    markCampusNotificationAsRead(id);
    setLocalItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRead: true } : item))
    );
    try {
      markAsReadMutation.mutate(id);
    } catch {}
  };

  // Delete / Dismiss
  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteCampusNotification(id);
    setLocalItems((prev) => prev.filter((item) => item.id !== id));
    setArchivedIds((prev) => prev.filter((archivedId) => archivedId !== id));
    try {
      deleteNotificationMutation.mutate(id);
    } catch {}
    addToast("Notification dismissed.", "info");
  };

  // Mark all read in current view
  const handleMarkAllRead = () => {
    markAllCampusNotificationsAsRead();
    setLocalItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
    try {
      markAllAsReadMutation.mutate();
    } catch {}
    addToast("All notifications marked as read.", "success");
  };

  // Clear all archive
  const handleClearArchive = () => {
    setArchivedIds([]);
    addToast("Archive cleared.", "info");
  };

  // Click notification card
  const handleCardClick = (item: CampusNotificationItem) => {
    if (!item.isRead) {
      handleMarkAsRead(item.id);
    }
    if (item.href) {
      navigate(item.href);
      setIsOpen(false);
    }
  };

  // Category Icon & Color Mapping
  const getCategoryMeta = (type: CampusNotificationItem["type"]) => {
    switch (type) {
      case "MENTION":
        return {
          icon: AtSign,
          gradient: "from-blue-600 to-indigo-500",
          border: "border-blue-500/30",
          tagBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
          accentGlow: "shadow-blue-500/20"
        };
      case "RESOURCE_UPLOAD":
        return {
          icon: BookOpen,
          gradient: "from-emerald-600 to-teal-400",
          border: "border-emerald-500/30",
          tagBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          accentGlow: "shadow-emerald-500/20"
        };
      case "ADMIN_ALERT":
        return {
          icon: ShieldAlert,
          gradient: "from-[#1E90FF] to-[#187bcd]",
          border: "border-rose-500/30",
          tagBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
          accentGlow: "shadow-rose-500/20"
        };
      case "COMMUNITY_UPDATE":
        return {
          icon: Users,
          gradient: "from-sky-500 to-cyan-400",
          border: "border-sky-500/30",
          tagBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
          accentGlow: "shadow-sky-500/20"
        };
      case "DIRECT_MESSAGE":
        return {
          icon: MessageSquare,
          gradient: "from-violet-600 to-purple-400",
          border: "border-violet-500/30",
          tagBg: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
          accentGlow: "shadow-violet-500/20"
        };
      default:
        return {
          icon: Sparkles,
          gradient: "from-[#2563EB] to-[#38BDF8]",
          border: "border-sky-500/30",
          tagBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
          accentGlow: "shadow-sky-500/20"
        };
    }
  };

  // Render the notification list content
  const renderNotificationList = () => {
    if (displayedItems.length === 0) {
      if (inboxTab === "inbox" && inboxItems.length === 0) {
        return (
          <div className="py-16 px-6 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
              <Sparkles size={26} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Inbox Zero Reached ✨
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed mt-1">
                You’ve triaged all campus alerts, mentions, and updates. Focus on your deep study session!
              </p>
            </div>
          </div>
        );
      }

      if (inboxTab === "archived") {
        return (
          <div className="py-14 px-6 text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-500/10 text-slate-400 border border-slate-500/20">
              <Archive size={22} />
            </div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Archive is Empty
            </h4>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
              When you archive notifications from your inbox, they will be kept here for reference.
            </p>
          </div>
        );
      }

      return (
        <div className="py-12 px-6 text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <Search size={22} />
          </div>
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            No matching notifications
          </h4>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
            Try adjusting your search query or switching filters.
          </p>
        </div>
      );
    }

    return (
      <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
        {displayedItems.map((item) => {
          const meta = getCategoryMeta(item.type);
          const CategoryIcon = meta.icon;
          const isArchived = archivedIds.includes(item.id);

          return (
            <div
              key={item.id}
              onClick={() => handleCardClick(item)}
              className={`group relative flex items-start gap-3 p-3.5 transition-all cursor-pointer ${
                item.isRead
                  ? "hover:bg-slate-100/60 dark:hover:bg-white/[0.03] opacity-85 hover:opacity-100"
                  : "bg-sky-500/[0.03] dark:bg-sky-500/[0.05] hover:bg-sky-500/[0.08]"
              }`}
            >
              {/* Left Category Icon Pill */}
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr ${meta.gradient} text-white shadow-sm ${meta.accentGlow}`}
              >
                <CategoryIcon size={14} />
              </div>

              {/* Middle Content */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  {item.categoryTag && (
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${meta.tagBg}`}
                    >
                      {item.categoryTag}
                    </span>
                  )}
                  <span className="text-[9px] text-slate-400 tabular-nums ml-auto">
                    {item.time}
                  </span>
                </div>

                <h4
                  className={`text-xs leading-snug line-clamp-1 ${
                    item.isRead
                      ? "font-medium text-slate-700 dark:text-slate-300"
                      : "font-bold text-slate-900 dark:text-slate-100"
                  }`}
                >
                  {item.title}
                </h4>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mt-0.5">
                  {item.message}
                </p>
              </div>

              {/* Right Action Icons on Hover & Unread Indicator */}
              <div className="flex flex-col items-end justify-between self-stretch shrink-0">
                {!item.isRead ? (
                  <span className="h-2 w-2 rounded-full bg-sky-500 shadow-sm shadow-sky-500" />
                ) : (
                  <span className="h-2 w-2" />
                )}

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-2">
                  {!isArchived ? (
                    <button
                      onClick={(e) => handleArchive(item.id, e)}
                      className="p-1 rounded-md text-slate-400 hover:text-sky-500 hover:bg-sky-500/10 transition-colors cursor-pointer"
                      title="Archive to clear inbox"
                    >
                      <Archive size={12} />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => handleUnarchive(item.id, e)}
                      className="p-1 rounded-md text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                      title="Restore to inbox"
                    >
                      <RotateCcw size={12} />
                    </button>
                  )}

                  {!item.isRead && (
                    <button
                      onClick={(e) => handleMarkAsRead(item.id, e)}
                      className="p-1 rounded-md text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                      title="Mark as read"
                    >
                      <Check size={12} />
                    </button>
                  )}

                  <button
                    onClick={(e) => handleDelete(item.id, e)}
                    className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Dismiss"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Reusable Inbox Interior Body
  const renderInboxContent = (isDrawer: boolean) => (
    <>
      {/* Top Glowing Ambient Edge */}
      <div className="h-1 w-full bg-gradient-to-r from-[#1E90FF] via-[#187bcd] to-emerald-400 opacity-90 shrink-0" />

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="p-4 pb-3 border-b border-slate-200/70 dark:border-white/[0.06] shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1E90FF] text-white shadow-sm shadow-[#1E90FF]/30">
              <Inbox size={14} />
            </div>
            <div>
              <h3 className="text-xs font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                Notification Inbox
                {unreadCount > 0 ? (
                  <span className="text-[9px] tabular-nums font-bold px-1.5 py-0.2 rounded-full bg-[#1E90FF]/15 text-[#1E90FF] border border-[#1E90FF]/20">
                    {unreadCount} new
                  </span>
                ) : (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    zero
                  </span>
                )}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Mark All Read / Archive All */}
            {inboxTab === "inbox" && inboxItems.length > 0 && (
              <button
                onClick={handleArchiveAll}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 transition-colors cursor-pointer"
                title="Archive all inbox items"
              >
                <Archive size={11} />
                <span>Archive all</span>
              </button>
            )}

            {inboxTab === "archived" && archivedItems.length > 0 && (
              <button
                onClick={handleClearArchive}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                title="Clear archived notifications"
              >
                <Trash2 size={11} />
                <span>Clear</span>
              </button>
            )}

            {/* Toggle Drawer / Popover Expand */}
            <button
              onClick={() => setIsDrawerMode(!isDrawerMode)}
              title={isDrawer ? "Collapse to dropdown" : "Expand to fullscreen slide-over"}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              {isDrawer ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>

            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              title="Close inbox"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── Segmented Inbox Modes (Inbox | Archived | Unread) ── */}
        <div className="grid grid-cols-3 gap-1 mt-3 p-1 rounded-xl bg-slate-100 dark:bg-black/30 border border-slate-200/60 dark:border-white/[0.05] text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setInboxTab("inbox")}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              inboxTab === "inbox"
                ? "bg-white dark:bg-[#162544] text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Inbox size={12} />
            <span>Inbox</span>
            {inboxItems.length > 0 && (
              <span className="text-[9px] tabular-nums font-bold px-1.5 rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-300">
                {inboxItems.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setInboxTab("unread")}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              inboxTab === "unread"
                ? "bg-white dark:bg-[#162544] text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <CheckCheck size={12} />
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className="text-[9px] tabular-nums font-bold px-1.5 rounded-full bg-blue-500 text-white">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setInboxTab("archived")}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              inboxTab === "archived"
                ? "bg-white dark:bg-[#162544] text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Archive size={12} />
            <span>Archived</span>
            {archivedItems.length > 0 && (
              <span className="text-[9px] tabular-nums font-bold px-1.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {archivedItems.length}
              </span>
            )}
          </button>
        </div>

        {/* ── Search Bar inside Inbox ───────────────────────────── */}
        <div className="relative mt-2.5">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filter inbox items, subjects, courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#080D1A]/70 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* ── Category Filter Pills ─────────────────────────────── */}
        <div className="flex items-center gap-1 mt-2.5 overflow-x-auto no-scrollbar pt-0.5">
          {[
            { id: "all", label: "All" },
            { id: "mentions", label: "Mentions" },
            { id: "vault", label: "Vault" },
            { id: "alerts", label: "Alerts" },
            { id: "circles", label: "Circles" }
          ].map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id as typeof activeFilter)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-white/[0.06]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Scrollable Notifications Feed ───────────────────────── */}
      <div
        className={`overflow-y-auto no-scrollbar ${
          isDrawer ? "flex-1" : "max-h-[380px]"
        }`}
      >
        {renderNotificationList()}
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="p-3 bg-slate-50/70 dark:bg-black/25 border-t border-slate-200/60 dark:border-white/[0.05] flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span>Live Campus Sync</span>
        </div>

        <div className="flex items-center gap-2">
          {inboxTab === "inbox" && unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-[#1E90FF] hover:bg-[#1E90FF]/10 transition-colors cursor-pointer"
            >
              <CheckCheck size={11} />
              <span>Mark all read</span>
            </button>
          )}

          <button
            onClick={() => {
              setIsOpen(false);
              navigate("/notifications");
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-[#1E90FF] dark:hover:text-[#1E90FF] hover:bg-[#1E90FF]/10 transition-colors cursor-pointer"
            title="Open full notifications inbox"
          >
            <span>Full Inbox</span>
            <ExternalLink size={10} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div ref={containerRef} className="relative select-none">
      {/* ── Trigger Inbox / Bell Button ─────────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={unreadCount > 0 ? `${unreadCount} unread in inbox` : "Notification Inbox"}
        aria-label={`Notification Inbox${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        className={`relative h-9 w-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
          isOpen
            ? "bg-[#1E90FF]/15 text-[#1E90FF] border border-[#1E90FF]/40 shadow-sm shadow-[#1E90FF]/20"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#080D1A] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
        }`}
      >
        <Bell size={16} className={`transition-transform ${unreadCount > 0 ? "hover:rotate-12" : ""}`} />

        {/* Dynamic Dual-State Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center pointer-events-none">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1E90FF] opacity-75" />
            <span className="relative inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-[#1E90FF] text-[9px] tabular-nums font-black text-white shadow-sm shadow-[#1E90FF]/40">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* ── Mode 1: Compact Popover (Anchored under bell button) ─────── */}
      <AnimatePresence>
        {isOpen && !isDrawerMode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 450, damping: 32 }}
            className="absolute right-0 mt-3 w-[min(94vw,440px)] rounded-3xl border border-slate-200/80 dark:border-white/[0.08] bg-white/95 dark:bg-[#0c1322]/95 backdrop-blur-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] z-50 overflow-hidden flex flex-col text-slate-800 dark:text-slate-200"
          >
            {renderInboxContent(false)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mode 2: Fullscreen Slide-Over Drawer (Portalled to document.body) ── */}
      {/* Portalling directly to body ensures the backdrop covers the entire screen, resolving any parent backdrop-filter trapping */}
      {typeof document !== "undefined" &&
        isOpen &&
        isDrawerMode &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex justify-end">
            {/* Fullscreen Clean Dimmed Backdrop (No Blur) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-950/40 dark:bg-slate-950/65"
            />

            {/* Slide-Over Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 420, damping: 35 }}
              className="relative z-10 h-screen w-[min(100vw,480px)] bg-white dark:bg-[#0c1322] border-l border-slate-200 dark:border-white/[0.08] shadow-[0_0_70px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden text-slate-800 dark:text-slate-200"
            >
              {renderInboxContent(true)}
            </motion.div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default ModernNotificationHub;
