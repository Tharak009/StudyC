import { apiClient } from "./client";
import type { ApiResponse } from "../types/auth";
import type { PollPayload } from "../types/chat";

export interface CreatePollRequest {
  question: string;
  description?: string;
  options: string[];
  allowMultiple?: boolean;
  allowChange?: boolean;
  isAnonymous?: boolean;
  expiresInSeconds?: number;
  communityId?: string;
  channelId?: string;
  conversationId?: string;
}

export const pollsApi = {
  create: async (data: CreatePollRequest) =>
    (
      await apiClient.post<ApiResponse<{ poll: any; message: any }>>(
        "/api/polls",
        data
      )
    ).data.data,

  vote: async (pollId: string, optionIds: string[]) =>
    (
      await apiClient.post<ApiResponse<PollPayload>>(
        `/api/polls/${pollId}/vote`,
        { optionIds }
      )
    ).data.data,

  close: async (pollId: string) =>
    (
      await apiClient.post<ApiResponse<PollPayload>>(
        `/api/polls/${pollId}/close`
      )
    ).data.data,

  get: async (pollId: string) =>
    (
      await apiClient.get<ApiResponse<PollPayload>>(
        `/api/polls/${pollId}`
      )
    ).data.data
};
