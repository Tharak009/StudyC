import { apiClient } from "./client";
import type { ApiResponse, User } from "../types/auth";

export interface FriendUser extends User {
  lastLogin?: string;
}

export interface FriendRecord {
  friendshipId: string;
  connectedAt: string;
  user: FriendUser;
}

export interface FriendRequestsResult {
  sent: Array<{
    _id: string;
    requester: string;
    recipient: FriendUser;
    status: string;
    createdAt: string;
  }>;
  received: Array<{
    _id: string;
    requester: FriendUser;
    recipient: string;
    status: string;
    createdAt: string;
  }>;
}

export interface FriendshipStatusResult {
  status: "NONE" | "PENDING_SENT" | "PENDING_RECEIVED" | "FRIENDS" | "SELF";
  friendshipId?: string;
}

export const friendsApi = {
  getFriends: async () =>
    (await apiClient.get<ApiResponse<FriendRecord[]>>("/api/friends")).data.data,

  getRequests: async () =>
    (await apiClient.get<ApiResponse<FriendRequestsResult>>("/api/friends/requests")).data.data,

  getStatus: async (userId: string) =>
    (await apiClient.get<ApiResponse<FriendshipStatusResult>>(`/api/friends/status/${userId}`)).data.data,

  sendRequest: async (userId: string) =>
    (await apiClient.post<ApiResponse<{ friendship: any; status: string }>>(`/api/friends/request/${userId}`)).data.data,

  cancelRequest: async (userId: string) =>
    (await apiClient.delete<ApiResponse<{ success: boolean; message: string }>>(`/api/friends/request/${userId}`)).data.data,

  acceptRequest: async (userId: string) =>
    (await apiClient.post<ApiResponse<{ friendship: any; status: string }>>(`/api/friends/accept/${userId}`)).data.data,

  declineRequest: async (userId: string) =>
    (await apiClient.post<ApiResponse<{ success: boolean; message: string }>>(`/api/friends/decline/${userId}`)).data.data,

  removeFriend: async (userId: string) =>
    (await apiClient.delete<ApiResponse<{ success: boolean; message: string }>>(`/api/friends/${userId}`)).data.data
};
