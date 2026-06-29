import { apiClient } from "../../../api/client";
import type { ApiResponse } from "../../../types/auth";
import type {
  Conversation,
  DirectMessage,
  PaginatedConversations,
  PaginatedDirectMessages,
} from "../types";
import type { MessageListParams, ConversationListParams, CreateMessagePayload } from "./chat.api";

export const directMessagesApi = {
  startConversation: async (receiverId: string): Promise<Conversation> => {
    const response = await apiClient.post<ApiResponse<Conversation>>("/api/direct-messages/conversations", { receiverId });
    return response.data.data;
  },

  listConversations: async (params: ConversationListParams): Promise<PaginatedConversations> => {
    const response = await apiClient.get<ApiResponse<PaginatedConversations>>("/api/direct-messages/conversations", { params });
    return response.data.data;
  },

  getConversation: async (conversationId: string): Promise<Conversation> => {
    const response = await apiClient.get<ApiResponse<Conversation>>(`/api/direct-messages/conversations/${conversationId}`);
    return response.data.data;
  },

  getMessages: async (conversationId: string, params: MessageListParams): Promise<PaginatedDirectMessages> => {
    const response = await apiClient.get<ApiResponse<PaginatedDirectMessages>>(
      `/api/direct-messages/conversations/${conversationId}/messages`,
      { params }
    );
    return response.data.data;
  },

  sendMessage: async (conversationId: string, payload: CreateMessagePayload): Promise<DirectMessage> => {
    const form = new FormData();
    form.append("content", payload.content);
    if (payload.replyTo) {
      form.append("replyTo", payload.replyTo);
    }
    payload.attachments?.forEach((file) => {
      form.append("attachments", file as any);
    });

    const response = await apiClient.post<ApiResponse<DirectMessage>>(
      `/api/direct-messages/conversations/${conversationId}/messages`,
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data.data;
  },

  editMessage: async (messageId: string, content: string): Promise<DirectMessage> => {
    const response = await apiClient.put<ApiResponse<DirectMessage>>(`/api/direct-messages/messages/${messageId}`, { content });
    return response.data.data;
  },

  deleteMessage: async (messageId: string): Promise<DirectMessage> => {
    const response = await apiClient.delete<ApiResponse<DirectMessage>>(`/api/direct-messages/messages/${messageId}`);
    return response.data.data;
  },

  markAsRead: async (conversationId: string): Promise<null> => {
    const response = await apiClient.post<ApiResponse<null>>("/api/direct-messages/messages/read", { conversationId });
    return response.data.data;
  },

  unreadCount: async (): Promise<{ count: number }> => {
    const response = await apiClient.get<ApiResponse<{ count: number }>>("/api/direct-messages/conversations/unread");
    return response.data.data;
  },
};
