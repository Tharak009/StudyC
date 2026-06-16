import { apiClient } from "./client";
import type { ApiResponse } from "../types/auth";
import type { Conversation, DirectMessage, PaginatedConversations, PaginatedDirectMessages } from "../types/direct-message";

export interface MessageListParams {
  page?: number;
  limit?: number;
  order?: "latest" | "oldest";
  search?: string;
}

export interface ConversationListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CreateMessagePayload {
  content: string;
  replyTo?: string;
  attachments?: File[];
}

export const directMessagesApi = {
  startConversation: async (receiverId: string) =>
    (
      await apiClient.post<ApiResponse<Conversation>>("/api/direct-messages/conversations", { receiverId })
    ).data.data,

  listConversations: async (params: ConversationListParams) =>
    (
      await apiClient.get<ApiResponse<PaginatedConversations>>("/api/direct-messages/conversations", { params })
    ).data.data,

  getConversation: async (conversationId: string) =>
    (
      await apiClient.get<ApiResponse<Conversation>>(`/api/direct-messages/conversations/${conversationId}`)
    ).data.data,

  getMessages: async (conversationId: string, params: MessageListParams) =>
    (
      await apiClient.get<ApiResponse<PaginatedDirectMessages>>(
        `/api/direct-messages/conversations/${conversationId}/messages`,
        { params }
      )
    ).data.data,

  sendMessage: async (conversationId: string, payload: CreateMessagePayload) => {
    const form = new FormData();
    form.append("content", payload.content);
    if (payload.replyTo) form.append("replyTo", payload.replyTo);
    payload.attachments?.forEach((file) => form.append("attachments", file));
    return (
      await apiClient.post<ApiResponse<DirectMessage>>(
        `/api/direct-messages/conversations/${conversationId}/messages`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      )
    ).data.data;
  },

  editMessage: async (messageId: string, content: string) =>
    (
      await apiClient.put<ApiResponse<DirectMessage>>(`/api/direct-messages/messages/${messageId}`, { content })
    ).data.data,

  deleteMessage: async (messageId: string) =>
    (
      await apiClient.delete<ApiResponse<DirectMessage>>(`/api/direct-messages/messages/${messageId}`)
    ).data.data,

  markAsRead: async (conversationId: string) =>
    (
      await apiClient.post<ApiResponse<null>>("/api/direct-messages/messages/read", { conversationId })
    ).data.data,

  unreadCount: async () =>
    (
      await apiClient.get<ApiResponse<{ count: number }>>("/api/direct-messages/conversations/unread")
    ).data.data
};
