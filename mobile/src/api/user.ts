import { apiClient } from "./client";
import type { ApiResponse, User } from "../types/auth";

export interface UpdateProfilePayload {
  fullName?: string;
  department?: string;
  academicYear?: number;
  bio?: string;
  interests?: string[];
}

export const userApi = {
  profile: async (): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>("/api/users/profile");
    return response.data.data;
  },

  updateProfile: async (payload: UpdateProfilePayload): Promise<User> => {
    const response = await apiClient.put<ApiResponse<User>>("/api/users/profile", payload);
    return response.data.data;
  },

  uploadProfilePicture: async (uri: string): Promise<User> => {
    const form = new FormData();
    const filename = uri.split("/").pop() || "photo.jpg";
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : "image/jpeg";
    
    // React Native FormData expects an object with uri, name, and type for files
    form.append("profilePicture", {
      uri,
      name: filename,
      type,
    } as any);

    const response = await apiClient.post<ApiResponse<User>>("/api/users/profile-picture", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.data;
  },

  search: async (query: string): Promise<User[]> => {
    const response = await apiClient.get<ApiResponse<User[]>>("/api/users/search", {
      params: { q: query },
    });
    return response.data.data;
  },
};
