import { apiClient } from "./client";
import type { ApiResponse } from "../types/auth";
import type {
  Community,
  CommunityCategory,
  CommunityMember,
  PaginatedCommunities,
} from "../types/community";

export interface CommunityListParams {
  search?: string;
  category?: CommunityCategory | "";
  page?: number;
  limit?: number;
}

export interface CommunityFormPayload {
  name: string;
  description: string;
  category: CommunityCategory;
  tags: string[];
  visibility: "public" | "private";
  bannerImageUri?: string;
}

const formFrom = (payload: CommunityFormPayload) => {
  const form = new FormData();
  form.append("name", payload.name);
  form.append("description", payload.description);
  form.append("category", payload.category);
  payload.tags.forEach((tag) => form.append("tags", tag));
  form.append("visibility", payload.visibility);
  
  if (payload.bannerImageUri) {
    const filename = payload.bannerImageUri.split("/").pop() || "banner.jpg";
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : "image/jpeg";
    form.append("bannerImage", {
      uri: payload.bannerImageUri,
      name: filename,
      type,
    } as any);
  }
  return form;
};

export const communityApi = {
  list: async (params: CommunityListParams): Promise<PaginatedCommunities> => {
    const response = await apiClient.get<ApiResponse<PaginatedCommunities>>("/api/communities", { params });
    return response.data.data;
  },

  details: async (id: string): Promise<Community> => {
    const response = await apiClient.get<ApiResponse<Community>>(`/api/communities/${id}`);
    return response.data.data;
  },

  create: async (payload: CommunityFormPayload): Promise<Community> => {
    const response = await apiClient.post<ApiResponse<Community>>("/api/communities", formFrom(payload), {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.data;
  },

  update: async (id: string, payload: CommunityFormPayload): Promise<Community> => {
    const response = await apiClient.put<ApiResponse<Community>>(`/api/communities/${id}`, formFrom(payload), {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.data;
  },

  delete: async (id: string): Promise<null> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/api/communities/${id}`);
    return response.data.data;
  },

  join: async (id: string): Promise<Community> => {
    const response = await apiClient.post<ApiResponse<Community>>(`/api/communities/${id}/join`);
    return response.data.data;
  },

  leave: async (id: string): Promise<null> => {
    const response = await apiClient.post<ApiResponse<null>>(`/api/communities/${id}/leave`);
    return response.data.data;
  },

  members: async (id: string): Promise<CommunityMember[]> => {
    const response = await apiClient.get<ApiResponse<CommunityMember[]>>(`/api/communities/${id}/members`);
    return response.data.data;
  },

  addModerator: async (id: string, userId: string): Promise<CommunityMember[]> => {
    const response = await apiClient.post<ApiResponse<CommunityMember[]>>(`/api/communities/${id}/moderators`, {
      userId,
    });
    return response.data.data;
  },

  removeModerator: async (id: string, userId: string): Promise<CommunityMember[]> => {
    const response = await apiClient.delete<ApiResponse<CommunityMember[]>>(`/api/communities/${id}/moderators/${userId}`);
    return response.data.data;
  },

  removeMember: async (id: string, userId: string): Promise<CommunityMember[]> => {
    const response = await apiClient.delete<ApiResponse<CommunityMember[]>>(`/api/communities/${id}/members/${userId}`);
    return response.data.data;
  },
};
