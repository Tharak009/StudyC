export type NotificationType =
  | "COMMUNITY_JOIN"
  | "COMMUNITY_INVITE"
  | "COMMUNITY_UPDATE"
  | "NEW_MESSAGE"
  | "DIRECT_MESSAGE"
  | "RESOURCE_UPLOAD"
  | "MENTION"
  | "ADMIN_ALERT"
  | "SYSTEM";

export interface Notification {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedNotifications {
  items: Notification[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
