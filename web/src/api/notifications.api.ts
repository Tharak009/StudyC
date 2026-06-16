import { apiClient } from "./client";
import type { ApiResponse } from "../types/auth";
import type { Notification, PaginatedNotifications } from "../types/notification";

export interface NotificationListParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export const notificationsApi = {
  list: async (params: NotificationListParams = {}) =>
    (await apiClient.get<ApiResponse<PaginatedNotifications>>("/api/notifications", { params })).data.data,
  unreadCount: async () =>
    (await apiClient.get<ApiResponse<{ count: number }>>("/api/notifications/unread-count")).data.data,
  markAsRead: async (notificationId: string) =>
    (await apiClient.patch<ApiResponse<Notification>>(`/api/notifications/${notificationId}/read`)).data.data,
  markAllAsRead: async () =>
    (await apiClient.patch<ApiResponse<{ count: number }>>("/api/notifications/read-all")).data.data,
  delete: async (notificationId: string) =>
    (await apiClient.delete<ApiResponse<null>>(`/api/notifications/${notificationId}`)).data.data,
  clearAll: async () =>
    (await apiClient.delete<ApiResponse<{ count: number }>>("/api/notifications")).data.data
};
