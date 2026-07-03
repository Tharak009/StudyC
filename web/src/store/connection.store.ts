import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Connection {
  userId: string;
  fullName: string;
  department: string;
  academicYear: number;
  profilePicture?: string;
  status: "PENDING_SENT" | "PENDING_RECEIVED" | "CONNECTED";
}

interface ConnectionState {
  connections: Connection[];
  savedPostIds: string[];
  savedEventIds: string[];
  savedCommunityIds: string[];
  bookmarkedResourceIds: string[];
  downloadedResourceIds: string[];

  sendConnectionRequest: (user: Omit<Connection, "status">) => void;
  acceptConnectionRequest: (userId: string) => void;
  rejectConnectionRequest: (userId: string) => void;
  removeConnection: (userId: string) => void;

  toggleSavePost: (postId: string) => void;
  toggleSaveEvent: (eventId: string) => void;
  toggleSaveCommunity: (communityId: string) => void;
  toggleBookmarkResource: (resourceId: string) => void;
  addDownloadResource: (resourceId: string) => void;
}

// Initial pre-seeded connection requests for high-fidelity demonstration
const INITIAL_CONNECTIONS: Connection[] = [
  { userId: "user-seed-1", fullName: "Kabir Mehta", department: "Mechanical Engineering", academicYear: 3, status: "PENDING_RECEIVED" },
  { userId: "user-seed-2", fullName: "Dia Reddy", department: "Electronics Engineering", academicYear: 2, status: "CONNECTED" },
  { userId: "user-seed-3", fullName: "Aryan Goel", department: "Computer Science", academicYear: 3, status: "PENDING_SENT" }
];

export const useConnectionStore = create<ConnectionState>()(
  persist(
    (set) => ({
      connections: INITIAL_CONNECTIONS,
      savedPostIds: [],
      savedEventIds: [],
      savedCommunityIds: [],
      bookmarkedResourceIds: [],
      downloadedResourceIds: [],

      sendConnectionRequest: (user) =>
        set((state) => {
          if (state.connections.some((c) => c.userId === user.userId)) return state;
          return {
            connections: [...state.connections, { ...user, status: "PENDING_SENT" }]
          };
        }),

      acceptConnectionRequest: (userId) =>
        set((state) => ({
          connections: state.connections.map((c) =>
            c.userId === userId ? { ...c, status: "CONNECTED" as const } : c
          )
        })),

      rejectConnectionRequest: (userId) =>
        set((state) => ({
          connections: state.connections.filter((c) => c.userId !== userId)
        })),

      removeConnection: (userId) =>
        set((state) => ({
          connections: state.connections.filter((c) => c.userId !== userId)
        })),

      toggleSavePost: (postId) =>
        set((state) => {
          const exists = state.savedPostIds.includes(postId);
          return {
            savedPostIds: exists
              ? state.savedPostIds.filter((id) => id !== postId)
              : [...state.savedPostIds, postId]
          };
        }),

      toggleSaveEvent: (eventId) =>
        set((state) => {
          const exists = state.savedEventIds.includes(eventId);
          return {
            savedEventIds: exists
              ? state.savedEventIds.filter((id) => id !== eventId)
              : [...state.savedEventIds, eventId]
          };
        }),

      toggleSaveCommunity: (communityId) =>
        set((state) => {
          const exists = state.savedCommunityIds.includes(communityId);
          return {
            savedCommunityIds: exists
              ? state.savedCommunityIds.filter((id) => id !== communityId)
              : [...state.savedCommunityIds, communityId]
          };
        }),

      toggleBookmarkResource: (resourceId) =>
        set((state) => {
          const exists = state.bookmarkedResourceIds.includes(resourceId);
          return {
            bookmarkedResourceIds: exists
              ? state.bookmarkedResourceIds.filter((id) => id !== resourceId)
              : [...state.bookmarkedResourceIds, resourceId]
          };
        }),

      addDownloadResource: (resourceId) =>
        set((state) => {
          if (state.downloadedResourceIds.includes(resourceId)) return state;
          return {
            downloadedResourceIds: [...state.downloadedResourceIds, resourceId]
          };
        })
    }),
    {
      name: "studyconnect-connections-store"
    }
  )
);
