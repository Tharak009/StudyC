import { apiClient } from "./client";
import type { ApiResponse } from "../types/auth";

export interface CreateReportPayload {
  targetType: "USER" | "COMMUNITY" | "MESSAGE" | "RESOURCE";
  targetId: string;
  reason: string;
  description?: string;
}

export const reportsApi = {
  createReport: async (payload: CreateReportPayload) =>
    (await apiClient.post<ApiResponse<any>>("/api/reports", payload)).data.data
};
