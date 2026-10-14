import { apiClient } from "./client";

export interface StudyMeetingParticipant {
  userId: string;
  name: string;
  avatar?: string;
  role: "HOST" | "PARTICIPANT";
  state: "JOINED" | "LEFT";
  joinedAt: string;
  leftAt?: string | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
  connectionState: "CONNECTING" | "CONNECTED" | "RECONNECTING" | "DISCONNECTED";
}

export interface StudyMeeting {
  _id: string;
  title: string;
  subject: string;
  organizerName?: string;
  description: string;
  createdBy: string;
  access: "PUBLIC" | "PRIVATE" | "INVITE_ONLY";
  waitingRoomEnabled: boolean;
  status: "WAITING" | "ACTIVE" | "ENDED" | "CANCELLED";
  startedAt: string | null;
  scheduledStartAt?: string | null;
  expectedDurationMinutes?: number | null;
  endedAt?: string | null;
  cancelledAt?: string | null;
  updatedAt: string;
  providerCleanupStatus?: "NOT_REQUIRED" | "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
  mediaType: "voice" | "video";
  capacity: number;
  streamChannelId: string;
  inviteCode?: string;
  participants: StudyMeetingParticipant[];
}

export interface StudyMeetingPage<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface StudyMeetingHistoryItem {
  meeting: StudyMeeting;
  isOrganizer: boolean;
  attended: boolean;
  attendancePeriods: { joinedAt: string | null; leftAt: string | null; endReason: string | null }[];
  durationSeconds: number;
}

export interface StudyMeetingMediaCredentials {
  url: string;
  token: string;
  identity: string;
  role: "host" | "participant" | "moderator" | "listener";
  canPublish: boolean;
  maxParticipants: number;
  expiresInSeconds: number;
}

export interface StudyMeetingAdmissionRequest {
  userId: string;
  name: string;
  avatar?: string;
  requestedAt: string;
}

export type StudyMeetingJoinResult = { meeting: StudyMeeting; media: StudyMeetingMediaCredentials } | { admissionRequired: true; status: "PENDING" };

export const studyMeetingsApi = {
  async list(params: { status?: StudyMeeting["status"]; scope?: "all" | "organized" | "attending"; search?: string; page?: number; limit?: number } = {}): Promise<StudyMeetingPage<StudyMeeting>> {
    const { data } = await apiClient.get<{ data: StudyMeetingPage<StudyMeeting> }>("/api/study-meetings", { params });
    return data.data;
  },
  async history(params: { page?: number; limit?: number; search?: string } = {}): Promise<StudyMeetingPage<StudyMeetingHistoryItem>> {
    const { data } = await apiClient.get<{ data: StudyMeetingPage<StudyMeetingHistoryItem> }>("/api/study-meetings/history", { params });
    return data.data;
  },
  async get(id: string, inviteCode?: string): Promise<StudyMeeting> {
    const { data } = await apiClient.get<{ data: StudyMeeting }>(`/api/study-meetings/${id}`, {
      params: inviteCode ? { inviteCode } : undefined
    });
    return data.data;
  },
  async create(input: {
    title: string; subject?: string; description?: string; access: StudyMeeting["access"]; mediaType: StudyMeeting["mediaType"]; capacity: number; scheduledStartAt?: string | null; expectedDurationMinutes?: number | null; waitingRoomEnabled?: boolean; requestId?: string;
  }): Promise<{ meeting: StudyMeeting; inviteCode?: string }> {
    const { data } = await apiClient.post<{ data: { meeting: StudyMeeting; inviteCode?: string } }>("/api/study-meetings", input);
    return data.data;
  },
  async update(id: string, input: { title?: string; subject?: string; description?: string; access?: StudyMeeting["access"]; capacity?: number; scheduledStartAt?: string; expectedDurationMinutes?: number | null; waitingRoomEnabled?: boolean; expectedUpdatedAt: string }): Promise<StudyMeeting> {
    const { data } = await apiClient.patch<{ data: StudyMeeting }>(`/api/study-meetings/${id}`, input);
    return data.data;
  },
  async cancel(id: string): Promise<StudyMeeting> {
    const { data } = await apiClient.post<{ data: StudyMeeting }>(`/api/study-meetings/${id}/cancel`);
    return data.data;
  },
  async join(id: string, inviteCode?: string): Promise<StudyMeetingJoinResult> {
    const { data } = await apiClient.post<{ data: StudyMeetingJoinResult }>(
      `/api/study-meetings/${id}/join`, { inviteCode }
    );
    return data.data;
  },
  async resolveInvitation(code: string): Promise<{ meetingId: string }> {
    const { data } = await apiClient.post<{ data: { meetingId: string } }>("/api/study-meetings/resolve-invitation", { code });
    return data.data;
  },
  async admissionRequests(id: string): Promise<StudyMeetingAdmissionRequest[]> {
    const { data } = await apiClient.get<{ data: StudyMeetingAdmissionRequest[] }>(`/api/study-meetings/${id}/admission-requests`);
    return data.data;
  },
  async admissionStatus(id: string): Promise<{ status: "NONE" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "EXPIRED" | "INVALIDATED" }> {
    const { data } = await apiClient.get<{ data: { status: "NONE" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "EXPIRED" | "INVALIDATED" } }>(`/api/study-meetings/${id}/admission-status`);
    return data.data;
  },
  async decideAdmission(id: string, userId: string, decision: "APPROVED" | "REJECTED"): Promise<{ status: string }> {
    const { data } = await apiClient.post<{ data: { status: string } }>(`/api/study-meetings/${id}/admission-requests/${userId}/decision`, { decision });
    return data.data;
  },
  async cancelAdmissionRequest(id: string): Promise<{ status: string }> {
    const { data } = await apiClient.post<{ data: { status: string } }>(`/api/study-meetings/${id}/admission-request/cancel`);
    return data.data;
  },
  async connected(id: string): Promise<StudyMeeting> {
    const { data } = await apiClient.post<{ data: StudyMeeting }>(`/api/study-meetings/${id}/connected`);
    return data.data;
  },
  async connectionState(id: string, state: "CONNECTED" | "RECONNECTING"): Promise<StudyMeeting> {
    const { data } = await apiClient.patch<{ data: StudyMeeting }>(`/api/study-meetings/${id}/connection-state`, { state });
    return data.data;
  },
  async heartbeat(id: string): Promise<void> {
    await apiClient.post(`/api/study-meetings/${id}/heartbeat`, {});
  },
  async updateMediaState(id: string, state: { audioEnabled: boolean; videoEnabled: boolean }): Promise<StudyMeeting> {
    const { data } = await apiClient.patch<{ data: StudyMeeting }>(`/api/study-meetings/${id}/media-state`, state);
    return data.data;
  },
  async leave(id: string): Promise<void> {
    await apiClient.post(`/api/study-meetings/${id}/leave`);
  },
  async removeParticipant(id: string, userId: string): Promise<StudyMeeting> {
    const { data } = await apiClient.post<{ data: StudyMeeting }>(`/api/study-meetings/${id}/participants/remove`, { userId });
    return data.data;
  },
  async end(id: string): Promise<StudyMeeting> {
    const { data } = await apiClient.post<{ data: StudyMeeting }>(`/api/study-meetings/${id}/end`);
    return data.data;
  }
};
