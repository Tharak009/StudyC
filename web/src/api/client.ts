import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { ApiResponse } from "../types/auth";
import { tokenService } from "../services/token.service";

const baseURL = import.meta.env.VITE_API_URL ?? "";

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" }
});

apiClient.interceptors.request.use((config) => {
  const token = tokenService.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let refreshRequest: Promise<string> | null = null;

const refreshAccessToken = (): Promise<string> => {
  if (!refreshRequest) {
    refreshRequest = axios
      .post<ApiResponse<{ accessToken: string }>>(
        `${baseURL}/api/auth/refresh-token`,
        {},
        { withCredentials: true }
      )
      .then(({ data }) => {
        tokenService.set(data.data.accessToken);
        return data.data.accessToken;
      })
      .finally(() => {
        refreshRequest = null;
      });
  }
  return refreshRequest;
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    const isAuthRoute = original?.url?.includes("/api/auth/");

    if (error.response?.status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true;
      try {
        const token = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      } catch {
        tokenService.set(null);
        tokenService.notifyFailure();
      }
    }

    return Promise.reject(error);
  }
);
