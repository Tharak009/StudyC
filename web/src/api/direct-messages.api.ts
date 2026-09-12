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
  clientMessageId?: string;
  attachments?: File[];
  duration?: number;
  waveform?: number[];
  onUploadProgress?: (progressEvent: { loaded: number; total?: number }) => void;
  signal?: AbortSignal;
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
    if (payload.clientMessageId) form.append("clientMessageId", payload.clientMessageId);
    if (payload.duration !== undefined) form.append("duration", String(payload.duration));
    if (payload.waveform) form.append("waveform", JSON.stringify(payload.waveform));
    payload.attachments?.forEach((file) => form.append("attachments", file));
    return (
      await apiClient.post<ApiResponse<DirectMessage>>(
        `/api/direct-messages/conversations/${conversationId}/messages`,
        form,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: payload.onUploadProgress,
          signal: payload.signal
        }
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

  markAsUnread: async (conversationId: string) =>
    (
      await apiClient.post<ApiResponse<null>>(`/api/direct-messages/conversations/${conversationId}/unread`)
    ).data.data,

  markAsDelivered: async (conversationId: string) =>
    (
      await apiClient.post<ApiResponse<null>>(`/api/direct-messages/conversations/${conversationId}/delivered`)
    ).data.data,

  togglePin: async (conversationId: string) =>
    (
      await apiClient.patch<ApiResponse<{ isPinned: boolean }>>(`/api/direct-messages/conversations/${conversationId}/pin`)
    ).data.data,

  toggleMute: async (conversationId: string) =>
    (
      await apiClient.patch<ApiResponse<{ isMuted: boolean }>>(`/api/direct-messages/conversations/${conversationId}/mute`)
    ).data.data,

  toggleArchive: async (conversationId: string) =>
    (
      await apiClient.patch<ApiResponse<{ isArchived: boolean }>>(`/api/direct-messages/conversations/${conversationId}/archive`)
    ).data.data,

  unreadCount: async () =>
    (
      await apiClient.get<ApiResponse<{ count: number }>>("/api/direct-messages/conversations/unread")
    ).data.data,

  deleteForMe: async (messageId: string) =>
    (
      await apiClient.post<ApiResponse<{ success: boolean; messageId: string }>>(
        `/api/direct-messages/messages/${messageId}/delete-for-me`
      )
    ).data.data,

  deleteForEveryone: async (messageId: string) =>
    (
      await apiClient.post<ApiResponse<DirectMessage>>(
        `/api/direct-messages/messages/${messageId}/delete-for-everyone`
      )
    ).data.data,

  toggleReaction: async (messageId: string, emoji: string, category: "STANDARD" | "CAMPUS_CUSTOM" = "STANDARD") =>
    (
      await apiClient.post<ApiResponse<{ reactions: DirectMessage["reactions"] }>>(
        `/api/direct-messages/messages/${messageId}/reaction`,
        { emoji, category }
      )
    ).data.data,

  toggleStar: async (messageId: string) =>
    (
      await apiClient.post<ApiResponse<{ isStarred: boolean }>>(
        `/api/direct-messages/messages/${messageId}/star`
      )
    ).data.data,

  togglePinMessage: async (messageId: string) =>
    (
      await apiClient.post<ApiResponse<{ isPinned: boolean }>>(
        `/api/direct-messages/messages/${messageId}/pin`
      )
    ).data.data,

  getStarredMessages: async (conversationId: string) =>
    (
      await apiClient.get<ApiResponse<DirectMessage[]>>(
        `/api/direct-messages/conversations/${conversationId}/starred`
      )
    ).data.data,

  getPinnedMessages: async (conversationId: string) =>
    (
      await apiClient.get<ApiResponse<DirectMessage[]>>(
        `/api/direct-messages/conversations/${conversationId}/pinned`
      )
    ).data.data,

  forwardMessages: async (conversationId: string, messageIds: string[], targetConversationIds: string[]) =>
    (
      await apiClient.post<ApiResponse<DirectMessage[]>>(
        `/api/direct-messages/conversations/${conversationId}/messages/forward`,
        { messageIds, targetConversationIds }
      )
    ).data.data,

  bulkDeleteForMe: async (conversationId: string, messageIds: string[]) =>
    (
      await apiClient.post<ApiResponse<{ count: number }>>(
        `/api/direct-messages/conversations/${conversationId}/messages/bulk-delete-for-me`,
        { messageIds }
      )
    ).data.data,

  bulkDeleteForEveryone: async (conversationId: string, messageIds: string[]) =>
    (
      await apiClient.post<ApiResponse<{ deletedIds: string[] }>>(
        `/api/direct-messages/conversations/${conversationId}/messages/bulk-delete-for-everyone`,
        { messageIds }
      )
    ).data.data,

  bulkStar: async (conversationId: string, messageIds: string[], star = true) =>
    (
      await apiClient.post<ApiResponse<{ count: number }>>(
        `/api/direct-messages/conversations/${conversationId}/messages/bulk-star`,
        { messageIds, star }
      )
    ).data.data
};
