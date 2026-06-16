import { apiClient } from "./client";
import type { ApiResponse, User } from "../types/auth";

export interface UpdateProfilePayload {
  fullName?: string;
  department?: string;
  academicYear?: number;
  bio?: string;
  interests?: string[];
}

export const usersApi = {
  profile: async () =>
    (await apiClient.get<ApiResponse<User>>("/api/users/profile")).data.data,
  updateProfile: async (payload: UpdateProfilePayload) =>
    (await apiClient.put<ApiResponse<User>>("/api/users/profile", payload)).data.data,
  uploadProfilePicture: async (file: File) => {
    const form = new FormData();
    form.append("profilePicture", file);
    return (
      await apiClient.post<ApiResponse<User>>("/api/users/profile-picture", form, {
        headers: { "Content-Type": "multipart/form-data" }
      })
    ).data.data;
  },
  search: async (query: string) =>
    (await apiClient.get<ApiResponse<User[]>>("/api/users/search", { params: { q: query } })).data.data
};
