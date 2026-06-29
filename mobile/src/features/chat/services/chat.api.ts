import { apiClient } from "../../../api/client";
import type { ApiResponse } from "../../../types/auth";
import type { ChatMessage, PaginatedMessages } from "../types";

export interface MessageListParams {
  page?: number;
  limit?: number;
  order?: "latest" | "oldest";
}

export interface ConversationListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface MobileAttachment {
  uri: string;
  name: string;
  type: string;
}

export interface CreateMessagePayload {
  content: string;
  replyTo?: string;
  attachments?: MobileAttachment[];
}

export const chatApi = {
  history: async (communityId: string, params: MessageListParams): Promise<PaginatedMessages> => {
    const response = await apiClient.get<ApiResponse<PaginatedMessages>>(
      `/api/communities/${communityId}/messages`,
      { params }
    );
    return response.data.data;
  },

  create: async (communityId: string, payload: CreateMessagePayload): Promise<ChatMessage> => {
    const form = new FormData();
    form.append("content", payload.content);
    if (payload.replyTo) {
      form.append("replyTo", payload.replyTo);
    }
    payload.attachments?.forEach((file) => {
      form.append("attachments", file as any);
    });

    const response = await apiClient.post<ApiResponse<ChatMessage>>(
      `/api/communities/${communityId}/messages`,
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data.data;
  },
};
