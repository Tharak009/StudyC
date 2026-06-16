import { apiClient } from "./client";
import type { ApiResponse } from "../types/auth";
import type {
  Community,
  CommunityCategory,
  CommunityMember,
  CommunityVisibility,
  PaginatedCommunities
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
  visibility: CommunityVisibility;
  bannerImage?: File;
}

const formFrom = (payload: CommunityFormPayload) => {
  const form = new FormData();
  form.append("name", payload.name);
  form.append("description", payload.description);
  form.append("category", payload.category);
  payload.tags.forEach((tag) => form.append("tags", tag));
  form.append("visibility", payload.visibility);
  if (payload.bannerImage) form.append("bannerImage", payload.bannerImage);
  return form;
};

export const communitiesApi = {
  list: async (params: CommunityListParams) =>
    (await apiClient.get<ApiResponse<PaginatedCommunities>>("/api/communities", { params })).data.data,
  details: async (id: string) =>
    (await apiClient.get<ApiResponse<Community>>(`/api/communities/${id}`)).data.data,
  create: async (payload: CommunityFormPayload) =>
    (
      await apiClient.post<ApiResponse<Community>>("/api/communities", formFrom(payload), {
        headers: { "Content-Type": "multipart/form-data" }
      })
    ).data.data,
  update: async (id: string, payload: CommunityFormPayload) =>
    (
      await apiClient.put<ApiResponse<Community>>(`/api/communities/${id}`, formFrom(payload), {
        headers: { "Content-Type": "multipart/form-data" }
      })
    ).data.data,
  delete: async (id: string) =>
    (await apiClient.delete<ApiResponse<null>>(`/api/communities/${id}`)).data.data,
  join: async (id: string) =>
    (await apiClient.post<ApiResponse<Community>>(`/api/communities/${id}/join`)).data.data,
  leave: async (id: string) =>
    (await apiClient.post<ApiResponse<null>>(`/api/communities/${id}/leave`)).data.data,
  members: async (id: string) =>
    (await apiClient.get<ApiResponse<CommunityMember[]>>(`/api/communities/${id}/members`)).data.data,
  addModerator: async (id: string, userId: string) =>
    (
      await apiClient.post<ApiResponse<CommunityMember[]>>(`/api/communities/${id}/moderators`, {
        userId
      })
    ).data.data,
  removeModerator: async (id: string, userId: string) =>
    (await apiClient.delete<ApiResponse<CommunityMember[]>>(`/api/communities/${id}/moderators/${userId}`))
      .data.data,
  removeMember: async (id: string, userId: string) =>
    (await apiClient.delete<ApiResponse<CommunityMember[]>>(`/api/communities/${id}/members/${userId}`))
      .data.data
};
