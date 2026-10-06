import { create } from "zustand";
import { persist } from "zustand/middleware";
import { usersApi } from "../api/users.api";
import { fromStreamUserId, toStreamUserId } from "../utils/stream-id";

interface ChatPrivacyState {
  // Persisted state
  lockedConversationIds: string[];
  chatLockPinHash: string | null;
  disappearingDurations: Record<string, number>; // channelId -> seconds (e.g. 86400 for 24h)

  // Session-only in-memory state (resets on refresh / tab close)
  unlockedInSessionIds: string[];
  blockedUserIds: string[];

  // PIN Management
  setPin: (pin: string) => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  hasPin: () => boolean;
  clearPin: () => void;

  // Lock Management
  toggleLock: (channelId: string) => void;
  lockConversation: (channelId: string) => void;
  removeConversationLock: (channelId: string) => void;
  unlockForSession: (channelId: string, pin: string) => Promise<boolean>;
  lockForSession: (channelId: string) => void;
  isLocked: (channelId: string) => boolean;
  isUnlockedInSession: (channelId: string) => boolean;

  // Disappearing Messages
  setDisappearingDuration: (channelId: string, durationSeconds: number) => void;
  getDisappearingDuration: (channelId: string) => number;

  // Blocked Users Management
  fetchBlockedUsers: () => Promise<void>;
  isUserBlocked: (userId?: string | null) => boolean;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
}


// Fast browser-native SHA-256 hash with salt
async function hashPin(pin: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`studyconnect_salt_${pin}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const useChatPrivacyStore = create<ChatPrivacyState>()(
  persist(
    (set, get) => ({
      lockedConversationIds: [],
      chatLockPinHash: null,
      disappearingDurations: {},
      unlockedInSessionIds: [],

      setPin: async (pin: string) => {
        const hash = await hashPin(pin.trim());
        set({ chatLockPinHash: hash });
      },

      verifyPin: async (pin: string) => {
        const currentHash = get().chatLockPinHash;
        if (!currentHash) return false;
        const testHash = await hashPin(pin.trim());
        return testHash === currentHash;
      },

      hasPin: () => {
        return Boolean(get().chatLockPinHash);
      },

      clearPin: () => {
        set({
          chatLockPinHash: null,
          lockedConversationIds: [],
          unlockedInSessionIds: []
        });
      },

      toggleLock: (channelId: string) => {
        const isCurrentlyLocked = get().lockedConversationIds.includes(channelId);
        if (isCurrentlyLocked) {
          get().removeConversationLock(channelId);
        } else {
          get().lockConversation(channelId);
        }
      },

      lockConversation: (channelId: string) => {
        set((state) => {
          if (state.lockedConversationIds.includes(channelId)) return state;
          return {
            lockedConversationIds: [...state.lockedConversationIds, channelId],
            // Remove from session unlock if previously unlocked
            unlockedInSessionIds: state.unlockedInSessionIds.filter((id) => id !== channelId)
          };
        });
      },

      removeConversationLock: (channelId: string) => {
        set((state) => ({
          lockedConversationIds: state.lockedConversationIds.filter((id) => id !== channelId),
          unlockedInSessionIds: state.unlockedInSessionIds.filter((id) => id !== channelId)
        }));
      },

      unlockForSession: async (channelId: string, pin: string) => {
        const isValid = await get().verifyPin(pin);
        if (!isValid) return false;

        set((state) => {
          if (state.unlockedInSessionIds.includes(channelId)) return state;
          return {
            unlockedInSessionIds: [...state.unlockedInSessionIds, channelId]
          };
        });
        return true;
      },

      lockForSession: (channelId: string) => {
        set((state) => ({
          unlockedInSessionIds: state.unlockedInSessionIds.filter((id) => id !== channelId)
        }));
      },

      isLocked: (channelId: string) => {
        return get().lockedConversationIds.includes(channelId);
      },

      isUnlockedInSession: (channelId: string) => {
        // If not locked at all, it's considered unlocked
        if (!get().lockedConversationIds.includes(channelId)) return true;
        return get().unlockedInSessionIds.includes(channelId);
      },

      setDisappearingDuration: (channelId: string, durationSeconds: number) => {
        set((state) => ({
          disappearingDurations: {
            ...state.disappearingDurations,
            [channelId]: durationSeconds
          }
        }));
      },

      getDisappearingDuration: (channelId: string) => {
        return get().disappearingDurations[channelId] || 0;
      },

      blockedUserIds: [],

      fetchBlockedUsers: async () => {
        try {
          const list = await usersApi.listBlocked();
          if (Array.isArray(list)) {
            const ids = list
              .map((b: any) => String(b.user?._id || b.user?.id || b.user || ""))
              .filter(Boolean);
            set({ blockedUserIds: ids });
          }
        } catch {}
      },

      isUserBlocked: (userId?: string | null) => {
        if (!userId) return false;
        const rawId = fromStreamUserId(userId);
        const streamId = toStreamUserId(userId);
        const list = get().blockedUserIds;
        return list.includes(userId) || list.includes(rawId) || list.includes(streamId);
      },

      blockUser: async (userId: string) => {
        const rawId = fromStreamUserId(userId);
        await usersApi.blockUser(rawId);
        set((state) => ({
          blockedUserIds: Array.from(new Set([...state.blockedUserIds, rawId]))
        }));
      },

      unblockUser: async (userId: string) => {
        const rawId = fromStreamUserId(userId);
        await usersApi.unblockUser(rawId);
        set((state) => ({
          blockedUserIds: state.blockedUserIds.filter(
            (id) => id !== rawId && id !== userId
          )
        }));
      }
    }),

    {
      name: "studyconnect_chat_privacy",
      // Only persist lockedConversationIds, chatLockPinHash, and disappearingDurations
      // unlockedInSessionIds is intentionally omitted so session resets on refresh
      partialize: (state) => ({
        lockedConversationIds: state.lockedConversationIds,
        chatLockPinHash: state.chatLockPinHash,
        disappearingDurations: state.disappearingDurations
      })
    }
  )
);
