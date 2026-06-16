import { apiClient } from "./client";
import type { ApiResponse } from "../types/auth";
import type { AdminDashboardStats, PaginatedUsers, PaginatedAdminCommunities, PaginatedResources, PaginatedReports, ReportStatus } from "../types/admin";

export interface AdminListParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
}

export const adminApi = {
  dashboard: async () =>
    (await apiClient.get<ApiResponse<AdminDashboardStats>>("/api/admin/dashboard")).data.data,

  listUsers: async (params: AdminListParams = {}) =>
    (await apiClient.get<ApiResponse<PaginatedUsers>>("/api/admin/users", { params })).data.data,

  getUser: async (userId: string) =>
    (await apiClient.get<ApiResponse<Record<string, unknown>>>(`/api/admin/users/${userId}`)).data.data,

  banUser: async (userId: string) =>
    (await apiClient.patch<ApiResponse<Record<string, unknown>>>(`/api/admin/users/${userId}/ban`)).data.data,

  unbanUser: async (userId: string) =>
    (await apiClient.patch<ApiResponse<Record<string, unknown>>>(`/api/admin/users/${userId}/unban`)).data.data,

  suspendUser: async (userId: string) =>
    (await apiClient.patch<ApiResponse<Record<string, unknown>>>(`/api/admin/users/${userId}/suspend`)).data.data,

  activateUser: async (userId: string) =>
    (await apiClient.patch<ApiResponse<Record<string, unknown>>>(`/api/admin/users/${userId}/activate`)).data.data,

  deleteUser: async (userId: string) =>
    (await apiClient.delete<ApiResponse<null>>(`/api/admin/users/${userId}`)).data.data,

  listCommunities: async (params: AdminListParams = {}) =>
    (await apiClient.get<ApiResponse<PaginatedAdminCommunities>>("/api/admin/communities", { params })).data.data,

  deleteCommunity: async (communityId: string) =>
    (await apiClient.delete<ApiResponse<null>>(`/api/admin/communities/${communityId}`)).data.data,

  listResources: async (params: AdminListParams = {}) =>
    (await apiClient.get<ApiResponse<PaginatedResources>>("/api/admin/resources", { params })).data.data,

  deleteResource: async (resourceId: string) =>
    (await apiClient.delete<ApiResponse<null>>(`/api/admin/resources/${resourceId}`)).data.data,

  listReports: async (params: AdminListParams = {}) =>
    (await apiClient.get<ApiResponse<PaginatedReports>>("/api/admin/reports", { params })).data.data,

  reviewReport: async (reportId: string, status: ReportStatus) =>
    (await apiClient.patch<ApiResponse<Record<string, unknown>>>(`/api/admin/reports/${reportId}`, { status })).data.data
};
