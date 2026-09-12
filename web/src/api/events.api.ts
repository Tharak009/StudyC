import { apiClient } from "./client";
import type { ApiResponse } from "../types/auth";

export interface BackendEvent {
  _id: string;
  title: string;
  description: string;
  category: "hackathons" | "deadlines" | "workshops" | "reviews";
  department: string;
  organizer: string;
  venue: string;
  dateStr: string;
  timeStr: string;
  isVirtual: boolean;
  tags: string[];
  eventImage?: {
    key: string;
    url: string;
    originalName: string;
    mimeType: string;
    size: number;
  } | null;
  attendeesCount: number;
  attendees: string[] | { _id: string; fullName: string; profilePicture?: string }[];
  createdBy: {
    _id: string;
    fullName: string;
    rollNumber?: string;
    department?: string;
    profilePicture?: string;
    role: string;
  } | string;
  approvalStatus?: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventPayload {
  title: string;
  description: string;
  category: "hackathons" | "deadlines" | "workshops" | "reviews";
  department: string;
  organizer: string;
  venue: string;
  dateStr: string;
  timeStr: string;
  isVirtual?: boolean;
  tags?: string[];
  eventImage?: File | null;
  removeImage?: boolean;
}

export const eventsApi = {
  list: async (params?: { category?: string; search?: string; limit?: number; approvalStatus?: string }): Promise<BackendEvent[]> => {
    const { data } = await apiClient.get<ApiResponse<BackendEvent[]>>("/api/events", { params });
    return data.data;
  },

  details: async (id: string): Promise<BackendEvent> => {
    const { data } = await apiClient.get<ApiResponse<BackendEvent>>(`/api/events/${id}`);
    return data.data;
  },

  create: async (payload: CreateEventPayload): Promise<BackendEvent> => {
    if (payload.eventImage instanceof File) {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (key === "eventImage") {
          if (value instanceof File) formData.append("eventImage", value);
        } else if (key === "tags" && Array.isArray(value)) {
          formData.append("tags", JSON.stringify(value));
        } else if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      const { data } = await apiClient.post<ApiResponse<BackendEvent>>("/api/events", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      return data.data;
    }
    const { data } = await apiClient.post<ApiResponse<BackendEvent>>("/api/events", payload);
    return data.data;
  },

  update: async (id: string, payload: Partial<CreateEventPayload>): Promise<BackendEvent> => {
    if (payload.eventImage instanceof File || payload.removeImage) {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (key === "eventImage") {
          if (value instanceof File) formData.append("eventImage", value);
        } else if (key === "tags" && Array.isArray(value)) {
          formData.append("tags", JSON.stringify(value));
        } else if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      const { data } = await apiClient.patch<ApiResponse<BackendEvent>>(`/api/events/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      return data.data;
    }
    const { data } = await apiClient.patch<ApiResponse<BackendEvent>>(`/api/events/${id}`, payload);
    return data.data;
  },

  approve: async (id: string): Promise<BackendEvent> => {
    const { data } = await apiClient.patch<ApiResponse<BackendEvent>>(`/api/events/${id}/approve`);
    return data.data;
  },

  reject: async (id: string): Promise<BackendEvent> => {
    const { data } = await apiClient.patch<ApiResponse<BackendEvent>>(`/api/events/${id}/reject`);
    return data.data;
  },

  delete: async (id: string): Promise<{ success: boolean }> => {
    const { data } = await apiClient.delete<ApiResponse<{ success: boolean }>>(`/api/events/${id}`);
    return data.data;
  },

  toggleRsvp: async (id: string): Promise<{ event: BackendEvent; isRegistered: boolean }> => {
    const { data } = await apiClient.post<ApiResponse<{ event: BackendEvent; isRegistered: boolean }>>(
      `/api/events/${id}/rsvp`
    );
    return data.data;
  }
};
