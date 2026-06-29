import { apiClient } from "./client";
import type { ApiResponse } from "../types/auth";
import type { PaginatedResources, Resource, ResourceFormData } from "../types/resource";

export interface ResourceListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  tag?: string;
  sort?: "recent" | "downloads" | "name";
}

export interface MobileFile {
  uri: string;
  name: string;
  type: string;
}

export const resourceApi = {
  listByCommunity: async (communityId: string, params: ResourceListParams): Promise<PaginatedResources> => {
    const response = await apiClient.get<ApiResponse<PaginatedResources>>(
      `/api/communities/${communityId}/resources`,
      { params }
    );
    return response.data.data;
  },

  list: async (params: ResourceListParams): Promise<PaginatedResources> => {
    const response = await apiClient.get<ApiResponse<PaginatedResources>>("/api/resources", { params });
    return response.data.data;
  },

  details: async (resourceId: string): Promise<Resource> => {
    const response = await apiClient.get<ApiResponse<Resource>>(`/api/resources/${resourceId}`);
    return response.data.data;
  },

  create: async (communityId: string, data: ResourceFormData, file: MobileFile): Promise<Resource> => {
    const form = new FormData();
    form.append("file", file as any);
    form.append("title", data.title);
    form.append("description", data.description);
    form.append("category", data.category);
    form.append("visibility", data.visibility);
    data.tags.forEach((tag) => form.append("tags", tag));

    const response = await apiClient.post<ApiResponse<Resource>>(
      `/api/communities/${communityId}/resources`,
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data.data;
  },

  update: async (resourceId: string, data: Partial<ResourceFormData>, file?: MobileFile): Promise<Resource> => {
    const form = new FormData();
    if (file) {
      form.append("file", file as any);
    }
    if (data.title !== undefined) form.append("title", data.title);
    if (data.description !== undefined) form.append("description", data.description);
    if (data.category !== undefined) form.append("category", data.category);
    if (data.visibility !== undefined) form.append("visibility", data.visibility);
    if (data.tags) {
      data.tags.forEach((tag) => form.append("tags", tag));
    }

    const response = await apiClient.put<ApiResponse<Resource>>(
      `/api/resources/${resourceId}`,
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data.data;
  },

  delete: async (resourceId: string): Promise<null> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/api/resources/${resourceId}`);
    return response.data.data;
  },

  download: async (resourceId: string): Promise<Resource> => {
    const response = await apiClient.post<ApiResponse<Resource>>(`/api/resources/${resourceId}/download`);
    return response.data.data;
  },
};
