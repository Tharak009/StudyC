import { apiClient } from "./client";
import type { ApiResponse } from "../types/auth";
import type { LinkPreviewPayload } from "../types/chat";

const previewCache = new Map<string, LinkPreviewPayload | null>();

export const linkPreviewApi = {
  fetchPreview: async (url: string): Promise<LinkPreviewPayload | null> => {
    const trimmed = url.trim();
    if (previewCache.has(trimmed)) {
      return previewCache.get(trimmed) || null;
    }

    try {
      const response = await apiClient.post<ApiResponse<LinkPreviewPayload>>(
        "/api/stream/link-preview",
        { url: trimmed }
      );
      const data = response.data.data || null;
      previewCache.set(trimmed, data);
      return data;
    } catch {
      previewCache.set(trimmed, null);
      return null;
    }
  },
  getPreview: async (url: string): Promise<LinkPreviewPayload | null> => {
    return linkPreviewApi.fetchPreview(url);
  }
};

