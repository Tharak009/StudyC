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

export const resourcesApi = {
  listByCommunity: async (communityId: string, params: ResourceListParams) =>
    (
      await apiClient.get<ApiResponse<PaginatedResources>>(
        `/api/communities/${communityId}/resources`,
        { params }
      )
    ).data.data,

  list: async (params: ResourceListParams) =>
    (
      await apiClient.get<ApiResponse<PaginatedResources>>("/api/resources", { params })
    ).data.data,

  details: async (resourceId: string) =>
    (
      await apiClient.get<ApiResponse<Resource>>(`/api/resources/${resourceId}`)
    ).data.data,

  create: async (communityId: string, data: ResourceFormData, file: File) => {
    const form = new FormData();
    form.append("file", file);
    form.append("title", data.title);
    form.append("description", data.description);
    form.append("category", data.category);
    form.append("visibility", data.visibility);
    data.tags.forEach((tag) => form.append("tags", tag));
    return (
      await apiClient.post<ApiResponse<Resource>>(
        `/api/communities/${communityId}/resources`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      )
    ).data.data;
  },

  update: async (resourceId: string, data: Partial<ResourceFormData>, file?: File) => {
    const form = new FormData();
    if (file) form.append("file", file);
    if (data.title !== undefined) form.append("title", data.title);
    if (data.description !== undefined) form.append("description", data.description);
    if (data.category !== undefined) form.append("category", data.category);
    if (data.visibility !== undefined) form.append("visibility", data.visibility);
    if (data.tags) data.tags.forEach((tag) => form.append("tags", tag));
    return (
      await apiClient.put<ApiResponse<Resource>>(
        `/api/resources/${resourceId}`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      )
    ).data.data;
  },

  delete: async (resourceId: string) =>
    (
      await apiClient.delete<ApiResponse<null>>(`/api/resources/${resourceId}`)
    ).data.data,

  download: async (resourceId: string) =>
    (
      await apiClient.post<ApiResponse<Resource>>(`/api/resources/${resourceId}/download`)
    ).data.data
};
