import { apiClient } from "./client";
import type { PaginatedCallHistory, CallHistoryItem } from "../types/call.types";

export interface CallHistoryParams {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
}

export const callHistoryApi = {
  getHistory: async (params?: CallHistoryParams): Promise<PaginatedCallHistory> => {
    const { data } = await apiClient.get<{ success: boolean; data: PaginatedCallHistory }>(
      "/api/calls/history",
      { params }
    );
    return data.data;
  },

  getCallDetails: async (callId: string): Promise<CallHistoryItem> => {
    const { data } = await apiClient.get<{ success: boolean; data: { call: CallHistoryItem } }>(
      `/api/calls/history/${callId}`
    );
    return data.data.call;
  }
};
