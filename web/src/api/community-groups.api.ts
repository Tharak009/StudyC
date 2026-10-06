import { apiClient } from "./client";
import type { ApiResponse } from "../types/auth";
import type {
  AttachGroupInput,
  CommunityGroup,
  CreateGroupInput
} from "../types/community-group";

export const communityGroupsApi = {
  list: async (communityId: string): Promise<CommunityGroup[]> => {
    const { data } = await apiClient.get<ApiResponse<CommunityGroup[]>>(
      `/communities/${communityId}/groups`
    );
    return data.data;
  },

  get: async (communityId: string, groupId: string): Promise<CommunityGroup> => {
    const { data } = await apiClient.get<ApiResponse<CommunityGroup>>(
      `/communities/${communityId}/groups/${groupId}`
    );
    return data.data;
  },

  create: async (
    communityId: string,
    payload: CreateGroupInput
  ): Promise<CommunityGroup> => {
    const { data } = await apiClient.post<ApiResponse<CommunityGroup>>(
      `/communities/${communityId}/groups`,
      payload
    );
    return data.data;
  },

  attach: async (
    communityId: string,
    payload: AttachGroupInput
  ): Promise<CommunityGroup> => {
    const { data } = await apiClient.post<ApiResponse<CommunityGroup>>(
      `/communities/${communityId}/groups/attach`,
      payload
    );
    return data.data;
  },

  update: async (
    communityId: string,
    groupId: string,
    payload: Partial<CreateGroupInput> & { status?: string; sortOrder?: number }
  ): Promise<CommunityGroup> => {
    const { data } = await apiClient.put<ApiResponse<CommunityGroup>>(
      `/communities/${communityId}/groups/${groupId}`,
      payload
    );
    return data.data;
  },

  archive: async (communityId: string, groupId: string): Promise<CommunityGroup> => {
    const { data } = await apiClient.post<ApiResponse<CommunityGroup>>(
      `/communities/${communityId}/groups/${groupId}/archive`
    );
    return data.data;
  },

  delete: async (communityId: string, groupId: string): Promise<void> => {
    await apiClient.delete(`/communities/${communityId}/groups/${groupId}`);
  }
};
