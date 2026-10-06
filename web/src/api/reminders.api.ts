import { apiClient } from "./client";
import type { ApiResponse } from "../types/auth";
import type { MessageReminder } from "../types/chat";

export interface CreateReminderRequest {
  sourceType: "COMMUNITY" | "DIRECT_MESSAGE";
  sourceId: string;
  messageId: string;
  channelId?: string;
  remindAt: string;
}

export const remindersApi = {
  create: async (data: CreateReminderRequest) =>
    (
      await apiClient.post<ApiResponse<MessageReminder>>(
        "/api/reminders",
        data
      )
    ).data.data,

  list: async () =>
    (
      await apiClient.get<ApiResponse<MessageReminder[]>>(
        "/api/reminders"
      )
    ).data.data,

  cancel: async (id: string) =>
    (
      await apiClient.delete<ApiResponse<MessageReminder>>(
        `/api/reminders/${id}`
      )
    ).data.data
};
