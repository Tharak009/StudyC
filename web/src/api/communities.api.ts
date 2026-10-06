import { apiClient } from "./client";
import type { ApiResponse } from "../types/auth";
import type {
  Community,
  CommunityCategory,
  CommunityJoinPolicy,
  CommunityMember,
  CommunityStatus,
  CommunityType,
  CommunityVisibility,
  PaginatedCommunities
} from "../types/community";

export interface CommunityListParams {
  search?: string;
  category?: string;
  type?: CommunityType;
  status?: CommunityStatus;
  page?: number;
  limit?: number;
}

export interface CommunityFormPayload {
  name: string;
  description: string;
  category: CommunityCategory;
  type?: CommunityType;
  tags: string[];
  visibility: CommunityVisibility;
  joinPolicy?: CommunityJoinPolicy;
  icon?: string;
  bannerImage?: File;
}

const formFrom = (payload: CommunityFormPayload) => {
  const form = new FormData();
  form.append("name", payload.name);
  form.append("description", payload.description);
  form.append("category", payload.category);
  if (payload.type) form.append("type", payload.type);
  payload.tags.forEach((tag) => form.append("tags", tag));
  form.append("visibility", payload.visibility);
  if (payload.joinPolicy) form.append("joinPolicy", payload.joinPolicy);
  if (payload.icon) form.append("icon", payload.icon);
  if (payload.bannerImage) form.append("bannerImage", payload.bannerImage);
  return form;
};

export const communitiesApi = {
  list: async (params?: CommunityListParams) =>
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
  archive: async (id: string) =>
    (await apiClient.post<ApiResponse<Community>>(`/api/communities/${id}/archive`)).data.data,
  restore: async (id: string) =>
    (await apiClient.post<ApiResponse<Community>>(`/api/communities/${id}/restore`)).data.data,
  delete: async (id: string) =>
    (await apiClient.delete<ApiResponse<null>>(`/api/communities/${id}`)).data.data,
  join: async (id: string) =>
    (await apiClient.post<ApiResponse<Community>>(`/api/communities/${id}/join`)).data.data,
  requestJoin: async (id: string, note?: string) =>
    (await apiClient.post<ApiResponse<Community>>(`/api/communities/${id}/join-request`, { note })).data.data,
  cancelJoinRequest: async (id: string) =>
    (await apiClient.delete<ApiResponse<Community>>(`/api/communities/${id}/join-request`)).data.data,
  getMembership: async (id: string) =>
    (await apiClient.get<ApiResponse<CommunityMember | null>>(`/api/communities/${id}/membership`)).data.data,
  leave: async (id: string) =>
    (await apiClient.post<ApiResponse<null>>(`/api/communities/${id}/leave`)).data.data,
  members: async (id: string, params?: { status?: string; page?: number; limit?: number }) =>
    (await apiClient.get<ApiResponse<CommunityMember[]>>(`/api/communities/${id}/members`, { params })).data.data,
  listJoinRequests: async (id: string, params?: { page?: number; limit?: number }) =>
    (await apiClient.get<ApiResponse<CommunityMember[]>>(`/api/communities/${id}/join-requests`, { params })).data.data,
  approveJoinRequest: async (id: string, userId: string) =>
    (await apiClient.post<ApiResponse<{ message: string }>>(`/api/communities/${id}/join-requests/${userId}/approve`)).data.data,
  rejectJoinRequest: async (id: string, userId: string) =>
    (await apiClient.post<ApiResponse<{ message: string }>>(`/api/communities/${id}/join-requests/${userId}/reject`)).data.data,
  banMember: async (id: string, userId: string, reason?: string) =>
    (await apiClient.post<ApiResponse<{ message: string }>>(`/api/communities/${id}/members/${userId}/ban`, { reason })).data.data,
  unbanMember: async (id: string, userId: string) =>
    (await apiClient.post<ApiResponse<{ message: string }>>(`/api/communities/${id}/members/${userId}/unban`)).data.data,
  suspendMember: async (id: string, userId: string, durationHours: number = 24, reason?: string) =>
    (await apiClient.post<ApiResponse<{ message: string; suspendedUntil: string }>>(`/api/communities/${id}/members/${userId}/suspend`, { durationHours, reason })).data.data,
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
