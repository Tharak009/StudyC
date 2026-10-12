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
  connectionState: "CONNECTING" | "CONNECTED" | "RECONNECTING";
}

export interface StudyMeeting {
  _id: string;
  title: string;
  description: string;
  createdBy: string;
  access: "PUBLIC" | "PRIVATE" | "INVITE_ONLY";
  status: "WAITING" | "ACTIVE" | "ENDED";
  mediaType: "voice" | "video";
  capacity: number;
  streamChannelId: string;
  inviteCode?: string;
  participants: StudyMeetingParticipant[];
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

export const studyMeetingsApi = {
  async list(): Promise<StudyMeeting[]> {
    const { data } = await apiClient.get<{ data: StudyMeeting[] }>("/api/study-meetings");
    return data.data;
  },
  async get(id: string, inviteCode?: string): Promise<StudyMeeting> {
    const { data } = await apiClient.get<{ data: StudyMeeting }>(`/api/study-meetings/${id}`, {
      params: inviteCode ? { inviteCode } : undefined
    });
    return data.data;
  },
  async create(input: {
    title: string; description?: string; access: StudyMeeting["access"]; mediaType: StudyMeeting["mediaType"]; capacity: number;
  }): Promise<{ meeting: StudyMeeting; inviteCode?: string }> {
    const { data } = await apiClient.post<{ data: { meeting: StudyMeeting; inviteCode?: string } }>("/api/study-meetings", input);
    return data.data;
  },
  async join(id: string, inviteCode?: string): Promise<{ meeting: StudyMeeting; media: StudyMeetingMediaCredentials }> {
    const { data } = await apiClient.post<{ data: { meeting: StudyMeeting; media: StudyMeetingMediaCredentials } }>(
      `/api/study-meetings/${id}/join`, { inviteCode }
    );
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
