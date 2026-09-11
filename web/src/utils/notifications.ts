export interface CampusNotificationItem {
  id: string;
  type: "MENTION" | "RESOURCE_UPLOAD" | "NEW_MESSAGE" | "DIRECT_MESSAGE" | "ADMIN_ALERT" | "COMMUNITY_UPDATE" | "SYSTEM";
  title: string;
  message: string;
  categoryTag?: string;
  time: string;
  createdAt: number;
  isRead: boolean;
  href?: string;
  senderName?: string;
}

export const NOTIFICATIONS_STORAGE_KEY = "studyconnect_notifications";
export const ARCHIVE_STORAGE_KEY = "studyconnect_archived_notif_ids";
export const DELETED_NOTIF_STORAGE_KEY = "studyconnect_deleted_notif_ids";

/**
 * Format timestamp into human-readable relative string.
 */
export function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diffSec = Math.floor(Math.max(0, now - timestamp) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Load set of deleted notification IDs to prevent duplicates/re-appearances.
 */
export function getDeletedNotificationIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_NOTIF_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

/**
 * Record a deleted notification ID.
 */
export function addDeletedNotificationId(id: string): void {
  try {
    const set = getDeletedNotificationIds();
    set.add(id);
    localStorage.setItem(DELETED_NOTIF_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch (err) {
    console.warn("Failed to record deleted notification ID", err);
  }
}

/**
 * Load saved notifications from localStorage (clean initial slate, zero mock records).
 */
export function loadSavedCampusNotifications(): CampusNotificationItem[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) return [];
    const list: CampusNotificationItem[] = JSON.parse(raw);
    const deletedIds = getDeletedNotificationIds();
    // Exclude deleted items and update relative time
    return list
      .filter((item) => !deletedIds.has(item.id))
      .map((item) => ({
        ...item,
        time: formatTimeAgo(item.createdAt)
      }));
  } catch {
    return [];
  }
}

/**
 * Save notification array to localStorage and notify all subscribers.
 */
export function saveCampusNotifications(items: CampusNotificationItem[]): void {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("studyconnect:notifications-updated"));
  } catch (err) {
    console.warn("Failed to save notifications", err);
  }
}

/**
 * Dispatch a new live notification with automatic deduplication.
 */
export function dispatchCampusNotification(data: {
  type: CampusNotificationItem["type"];
  title: string;
  message: string;
  categoryTag?: string;
  href?: string;
  senderName?: string;
}): CampusNotificationItem | null {
  try {
    const list = loadSavedCampusNotifications();
    const deletedIds = getDeletedNotificationIds();

    // Deduplicate identical title + message within 10 seconds
    const isRecentDuplicate = list.some(
      (n) => n.title === data.title && n.message === data.message && Date.now() - n.createdAt < 10000
    );
    if (isRecentDuplicate) return null;

    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    if (deletedIds.has(id)) return null;

    const newItem: CampusNotificationItem = {
      id,
      type: data.type,
      title: data.title,
      message: data.message,
      categoryTag: data.categoryTag,
      href: data.href,
      senderName: data.senderName,
      createdAt: Date.now(),
      time: "Just now",
      isRead: false
    };

    const updated = [newItem, ...list];
    saveCampusNotifications(updated);
    return newItem;
  } catch (err) {
    console.warn("Failed to dispatch campus notification", err);
    return null;
  }
}

/**
 * Mark a specific notification as read in localStorage.
 */
export function markCampusNotificationAsRead(id: string): void {
  const list = loadSavedCampusNotifications();
  const updated = list.map((item) => (item.id === id ? { ...item, isRead: true } : item));
  saveCampusNotifications(updated);
}

/**
 * Mark all stored notifications as read.
 */
export function markAllCampusNotificationsAsRead(): void {
  const list = loadSavedCampusNotifications();
  const updated = list.map((item) => ({ ...item, isRead: true }));
  saveCampusNotifications(updated);
}

/**
 * Delete a notification permanently from local store.
 */
export function deleteCampusNotification(id: string): void {
  addDeletedNotificationId(id);
  const list = loadSavedCampusNotifications();
  const updated = list.filter((item) => item.id !== id);
  saveCampusNotifications(updated);
}

/**
 * Clear all notifications completely.
 */
export function clearAllCampusNotifications(): void {
  const list = loadSavedCampusNotifications();
  list.forEach((item) => addDeletedNotificationId(item.id));
  saveCampusNotifications([]);
}
