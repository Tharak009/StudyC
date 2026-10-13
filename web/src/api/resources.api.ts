import { apiClient } from "./client";
import type { ApiResponse } from "../types/auth";
import type { PaginatedResources, Resource, ResourceFormData } from "../types/resource";
import type { UploadInitiateResponse, PartUrlInfo } from "../services/upload-engine.service";

export interface ResourceListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  department?: string;
  dept?: string;
  semester?: string;
  format?: string;
  tag?: string;
  sort?: "recent" | "downloads" | "rating" | "name";
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
    if (data.department) form.append("department", data.department);
    if (data.semester) form.append("semester", data.semester);
    if (data.subjectCode) form.append("subjectCode", data.subjectCode);
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
    ).data.data,

  rate: async (resourceId: string, rating: number, reviewText?: string) =>
    (
      await apiClient.post<ApiResponse<Resource>>(`/api/resources/${resourceId}/rate`, { rating, reviewText })
    ).data.data,

  // ── Smart Cloud Upload Engine Direct Endpoints ─────────────────────────────

  initiateUpload: async (communityId: string, payload: {
    fileName: string;
    fileSize: number;
    mimeType: string;
    totalParts: number;
    title: string;
    description: string;
    category: string;
    department?: string;
    semester?: string;
    subjectCode?: string;
    visibility: string;
    tags: string[];
  }): Promise<UploadInitiateResponse> =>
    (
      await apiClient.post<ApiResponse<UploadInitiateResponse>>(
        `/api/communities/${communityId}/resources/upload/initiate`,
        payload
      )
    ).data.data,

  getPartUrls: async (sessionId: string, partNumbers: number[]): Promise<PartUrlInfo[]> =>
    (
      await apiClient.get<ApiResponse<PartUrlInfo[]>>(
        `/api/resources/upload/${sessionId}/part-urls`,
        { params: { parts: partNumbers.join(",") } }
      )
    ).data.data,

  completeUpload: async (sessionId: string, completedParts: Array<{ partNumber: number; etag: string }>): Promise<Resource> =>
    (
      await apiClient.post<ApiResponse<Resource>>(
        `/api/resources/upload/${sessionId}/complete`,
        { completedParts }
      )
    ).data.data,

  abortUpload: async (sessionId: string): Promise<void> => {
    await apiClient.delete(`/api/resources/upload/${sessionId}/abort`);
  },

  getDownloadUrl: async (resourceId: string): Promise<{ downloadUrl: string; expiresAtSeconds: number }> =>
    (
      await apiClient.get<ApiResponse<{ downloadUrl: string; expiresAtSeconds: number }>>(
        `/api/resources/${resourceId}/download-url`
      )
    ).data.data,

  getPreviewUrl: async (resourceId: string): Promise<{ previewUrl: string; isConvertedPdf: boolean; originalFileUrl: string }> =>
    (
      await apiClient.get<ApiResponse<{ previewUrl: string; isConvertedPdf: boolean; originalFileUrl: string }>>(
        `/api/resources/${resourceId}/preview-url`
      )
    ).data.data
};
