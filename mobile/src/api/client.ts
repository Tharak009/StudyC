import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { env } from "../config/env";
import { tokenService } from "../services/token.service";

export const apiClient = axios.create({
  baseURL: env.API_URL,
  headers: {
    "Content-Type": "application/json",
    "x-client-platform": "mobile",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = tokenService.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let refreshRequest: Promise<string> | null = null;

const refreshAccessToken = async (): Promise<string> => {
  if (!refreshRequest) {
    refreshRequest = (async () => {
      const storedRefreshToken = await tokenService.getRefreshToken();
      if (!storedRefreshToken) {
        throw new Error("No refresh token stored");
      }

      const response = await axios.post(
        `${env.API_URL}/api/auth/refresh-token`,
        { refreshToken: storedRefreshToken },
        {
          headers: {
            "Content-Type": "application/json",
            "x-client-platform": "mobile",
          },
        }
      );

      const { accessToken, refreshToken } = response.data?.data || {};
      if (!accessToken) {
        throw new Error("Invalid refresh response");
      }

      tokenService.setAccessToken(accessToken);
      if (refreshToken) {
        await tokenService.setRefreshToken(refreshToken);
      }
      return accessToken;
    })();
  }

  try {
    const token = await refreshRequest;
    return token;
  } finally {
    refreshRequest = null;
  }
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    const isAuthRoute = original?.url?.includes("/api/auth/");

    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !isAuthRoute
    ) {
      original._retry = true;
      try {
        const token = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      } catch (err) {
        tokenService.setAccessToken(null);
        await tokenService.setRefreshToken(null);
        tokenService.notifyFailure();
      }
    }

    return Promise.reject(error);
  }
);
