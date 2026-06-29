import { apiClient } from "./client";
import type { ApiResponse } from "../types/auth";
import type { Notification, PaginatedNotifications } from "../types/notification";

export interface NotificationListParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export const notificationApi = {
  list: async (params: NotificationListParams = {}): Promise<PaginatedNotifications> => {
    const response = await apiClient.get<ApiResponse<PaginatedNotifications>>("/api/notifications", { params });
    return response.data.data;
  },

  unreadCount: async (): Promise<{ count: number }> => {
    const response = await apiClient.get<ApiResponse<{ count: number }>>("/api/notifications/unread-count");
    return response.data.data;
  },

  markAsRead: async (notificationId: string): Promise<Notification> => {
    const response = await apiClient.patch<ApiResponse<Notification>>(`/api/notifications/${notificationId}/read`);
    return response.data.data;
  },

  markAllAsRead: async (): Promise<{ count: number }> => {
    const response = await apiClient.patch<ApiResponse<{ count: number }>>("/api/notifications/read-all");
    return response.data.data;
  },

  delete: async (notificationId: string): Promise<null> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/api/notifications/${notificationId}`);
    return response.data.data;
  },

  clearAll: async (): Promise<{ count: number }> => {
    const response = await apiClient.delete<ApiResponse<{ count: number }>>("/api/notifications");
    return response.data.data;
  },
};
