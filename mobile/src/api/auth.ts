import { apiClient } from "./client";
import type { ApiResponse, AuthResult } from "../types/auth";

export interface RegisterInput {
  fullName: string;
  rollNumber: string;
  department: string;
  academicYear: number;
  email: string;
  password?: string;
}

export interface LoginInput {
  email: string;
  password?: string;
}

export const authApi = {
  async register(data: RegisterInput): Promise<ApiResponse<AuthResult>> {
    const response = await apiClient.post("/api/auth/register", data);
    return response.data;
  },

  async login(data: LoginInput): Promise<ApiResponse<AuthResult>> {
    const response = await apiClient.post("/api/auth/login", data);
    return response.data;
  },

  async logout(refreshToken?: string): Promise<ApiResponse<null>> {
    const response = await apiClient.post("/api/auth/logout", { refreshToken });
    return response.data;
  },

  async forgotPassword(email: string): Promise<ApiResponse<null>> {
    const response = await apiClient.post("/api/auth/forgot-password", { email });
    return response.data;
  },
};
