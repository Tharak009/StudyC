import { apiClient } from "./client";
import type { ApiResponse } from "../types/auth";
import type { ChatMessage, PaginatedMessages } from "../types/chat";

export interface MessageListParams {
  page?: number;
  limit?: number;
  order?: "latest" | "oldest";
  channelId?: string;
}

export interface CreateMessagePayload {
  content: string;
  channelId?: string;
  replyTo?: string;
  attachments?: File[];
  duration?: number;
  waveform?: number[];
  onUploadProgress?: (progressEvent: { loaded: number; total?: number }) => void;
  signal?: AbortSignal;
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
    if (payload.channelId) form.append("channelId", payload.channelId);
    if (payload.replyTo) form.append("replyTo", payload.replyTo);
    if (payload.duration !== undefined) form.append("duration", String(payload.duration));
    if (payload.waveform) form.append("waveform", JSON.stringify(payload.waveform));
    payload.attachments?.forEach((file) => form.append("attachments", file));
    return (
      await apiClient.post<ApiResponse<ChatMessage>>(
        `/api/communities/${communityId}/messages`,
        form,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: payload.onUploadProgress,
          signal: payload.signal
        }
      )
    ).data.data;
  },

  editMessage: async (communityId: string, messageId: string, content: string) =>
    (
      await apiClient.put<ApiResponse<ChatMessage>>(
        `/api/communities/${communityId}/messages/${messageId}`,
        { content }
      )
    ).data.data,

  deleteMessage: async (communityId: string, messageId: string) =>
    (
      await apiClient.delete<ApiResponse<ChatMessage>>(
        `/api/communities/${communityId}/messages/${messageId}`
      )
    ).data.data,

  deleteForMe: async (communityId: string, messageId: string) =>
    (
      await apiClient.post<ApiResponse<{ success: boolean; messageId: string }>>(
        `/api/communities/${communityId}/messages/${messageId}/delete-for-me`
      )
    ).data.data,

  toggleReaction: async (communityId: string, messageId: string, emoji: string) =>
    (
      await apiClient.post<ApiResponse<{ reactions: ChatMessage["reactions"] }>>(
        `/api/communities/${communityId}/messages/${messageId}/reaction`,
        { emoji }
      )
    ).data.data,

  toggleStar: async (communityId: string, messageId: string) =>
    (
      await apiClient.post<ApiResponse<{ isStarred: boolean }>>(
        `/api/communities/${communityId}/messages/${messageId}/star`
      )
    ).data.data,

  togglePin: async (communityId: string, messageId: string) =>
    (
      await apiClient.post<ApiResponse<{ isPinned: boolean }>>(
        `/api/communities/${communityId}/messages/${messageId}/pin`
      )
    ).data.data,

  listStarred: async (communityId: string, channelId?: string) =>
    (
      await apiClient.get<ApiResponse<ChatMessage[]>>(
        `/api/communities/${communityId}/starred`,
        { params: { channelId } }
      )
    ).data.data,

  listPinned: async (communityId: string, channelId?: string) =>
    (
      await apiClient.get<ApiResponse<ChatMessage[]>>(
        `/api/communities/${communityId}/pinned`,
        { params: { channelId } }
      )
    ).data.data,

  forward: async (communityId: string, payload: { messageIds: string[]; targetCommunityId: string; targetChannelId?: string }) =>
    (
      await apiClient.post<ApiResponse<ChatMessage[]>>(
        `/api/communities/${communityId}/messages/forward`,
        payload
      )
    ).data.data,

  bulkDeleteForMe: async (communityId: string, messageIds: string[]) =>
    (
      await apiClient.post<ApiResponse<{ count: number }>>(
        `/api/communities/${communityId}/messages/bulk-delete-for-me`,
        { messageIds }
      )
    ).data.data,

  bulkDeleteForEveryone: async (communityId: string, messageIds: string[]) =>
    (
      await apiClient.post<ApiResponse<{ deletedIds: string[] }>>(
        `/api/communities/${communityId}/messages/bulk-delete-for-everyone`,
        { messageIds }
      )
    ).data.data,

  bulkStar: async (communityId: string, messageIds: string[], star = true) =>
    (
      await apiClient.post<ApiResponse<{ count: number }>>(
        `/api/communities/${communityId}/messages/bulk-star`,
        { messageIds, star }
      )
    ).data.data
};
