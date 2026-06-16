import { apiClient } from "./client";
import type { ApiResponse } from "../types/auth";
import type { ChatMessage, PaginatedMessages } from "../types/chat";

export interface MessageListParams {
  page?: number;
  limit?: number;
  order?: "latest" | "oldest";
}

export interface CreateMessagePayload {
  content: string;
  replyTo?: string;
  attachments?: File[];
}

export const chatApi = {
  history: async (communityId: string, params: MessageListParams) =>
    (
      await apiClient.get<ApiResponse<PaginatedMessages>>(
        `/api/communities/${communityId}/messages`,
        { params }
      )
    ).data.data,
  create: async (communityId: string, payload: CreateMessagePayload) => {
    const form = new FormData();
    form.append("content", payload.content);
    if (payload.replyTo) form.append("replyTo", payload.replyTo);
    payload.attachments?.forEach((file) => form.append("attachments", file));
    return (
      await apiClient.post<ApiResponse<ChatMessage>>(
        `/api/communities/${communityId}/messages`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      )
    ).data.data;
  }
};
