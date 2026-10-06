import { apiClient } from "./client";
import type { ApiResponse } from "../types/auth";

export interface StreamTokenResponse {
  token: string;
  apiKey: string;
  user: {
    id: string;
    name: string;
    image?: string;
    department?: string;
    rollNumber?: string;
    role?: string;
  };
}

export interface StreamDmResponse {
  channelId: string;
  channelCid: string;
  targetUser: {
    id: string;
    studyConnectId: string;
    name: string;
    rollNumber?: string;
    department?: string;
    image?: string;
  };
}

export interface StreamCommunityChannelSummary {
  id: string;
  cid: string;
  name: string;
  studyConnectType: "community";
  communityId: string;
  channelTier: "announcements" | "focus" | "watercooler" | "stages";
  topic?: string;
  memberCount?: number;
}

export interface CreateCommunityChannelPayload {
  name: string;
  category: "announcements" | "focus" | "watercooler" | "stages";
  topic?: string;
  isPrivate?: boolean;
}

export const streamApi = {
  getStreamToken: async (): Promise<StreamTokenResponse> => {
    const res = await apiClient.get<ApiResponse<StreamTokenResponse>>("/api/stream/token");
    return res.data.data;
  },

  getOrCreateDm: async (targetUserId: string): Promise<StreamDmResponse> => {
    const res = await apiClient.post<ApiResponse<StreamDmResponse>>("/api/stream/dms", {
      targetUserId
    });
    return res.data.data;
  },

  getCommunityChannels: async (communityId: string): Promise<StreamCommunityChannelSummary[]> => {
    const res = await apiClient.get<ApiResponse<StreamCommunityChannelSummary[]>>(
      `/api/stream/communities/${communityId}/channels`
    );
    return res.data.data;
  },

  createCommunityChannel: async (
    communityId: string,
    payload: CreateCommunityChannelPayload
  ): Promise<StreamCommunityChannelSummary> => {
    const res = await apiClient.post<ApiResponse<StreamCommunityChannelSummary>>(
      `/api/stream/communities/${communityId}/channels`,
      payload
    );
    return res.data.data;
  }
};
