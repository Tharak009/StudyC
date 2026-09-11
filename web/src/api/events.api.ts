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
}

export const eventsApi = {
  list: async (params?: { category?: string; search?: string; limit?: number }): Promise<BackendEvent[]> => {
    const { data } = await apiClient.get<ApiResponse<BackendEvent[]>>("/api/events", { params });
    return data.data;
  },

  details: async (id: string): Promise<BackendEvent> => {
    const { data } = await apiClient.get<ApiResponse<BackendEvent>>(`/api/events/${id}`);
    return data.data;
  },

  create: async (payload: CreateEventPayload): Promise<BackendEvent> => {
    const { data } = await apiClient.post<ApiResponse<BackendEvent>>("/api/events", payload);
    return data.data;
  },

  update: async (id: string, payload: Partial<CreateEventPayload>): Promise<BackendEvent> => {
    const { data } = await apiClient.patch<ApiResponse<BackendEvent>>(`/api/events/${id}`, payload);
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
