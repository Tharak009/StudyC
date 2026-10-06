import { apiClient } from "./client";
import type { ApiResponse } from "../types/auth";
import type { ScheduledMessage, MessageType, MessagePayload } from "../types/chat";

export interface ScheduleMessageRequest {
  targetType: "COMMUNITY" | "DIRECT_MESSAGE";
  targetId: string;
  channelId?: string;
  content: string;
  messageType?: MessageType;
  payload?: MessagePayload;
  scheduledFor: string;
}

export const scheduleApi = {
  schedule: async (data: ScheduleMessageRequest) =>
    (
      await apiClient.post<ApiResponse<ScheduledMessage>>(
        "/api/schedule",
        data
      )
    ).data.data,

  list: async () =>
    (
      await apiClient.get<ApiResponse<ScheduledMessage[]>>(
        "/api/schedule"
      )
    ).data.data,

  cancel: async (id: string) =>
    (
      await apiClient.delete<ApiResponse<ScheduledMessage>>(
        `/api/schedule/${id}`
      )
    ).data.data
};
