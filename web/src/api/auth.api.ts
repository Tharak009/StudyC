import { apiClient } from "./client";
import type { ApiResponse, AuthResult } from "../types/auth";

export interface RegisterPayload {
  fullName: string;
  rollNumber: string;
  department: string;
  academicYear: number;
  email: string;
  password: string;
}

export const authApi = {
  register: async (payload: RegisterPayload) =>
    (await apiClient.post<ApiResponse<AuthResult>>("/api/auth/register", payload)).data.data,
  login: async (payload: { email: string; password: string }) =>
    (await apiClient.post<ApiResponse<AuthResult>>("/api/auth/login", payload)).data.data,
  logout: async () => {
    await apiClient.post("/api/auth/logout", {});
  },
  refresh: async () =>
    (
      await apiClient.post<ApiResponse<{ accessToken: string }>>(
        "/api/auth/refresh-token",
        {}
      )
    ).data.data,
  changePassword: async (payload: { currentPassword: string; newPassword: string }) => {
    await apiClient.post("/api/auth/change-password", payload);
  }
};
