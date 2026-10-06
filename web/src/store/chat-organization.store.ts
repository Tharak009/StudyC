import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StreamChat, Channel as StreamChannel, LocalMessage } from "stream-chat";

export interface StarredMessageRecord {
  messageId: string;
  channelId: string;
  channelCid: string;
  channelName: string;
  communityId?: string;
  communityName?: string;
  isDM: boolean;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderRoll?: string;
  text: string;
  createdAt: string;
  hasAttachments?: boolean;
  attachmentType?: "image" | "file" | "voice";
}

export interface ChatNotificationPreferences {
  directMessages: boolean;
  communityMessages: boolean;
  mentions: boolean;
  threadReplies: boolean;
  sound: boolean;
  desktopNotifications: boolean;
}

interface ChatOrganizationState {
  pinnedConversationIds: string[];
  archivedConversationIds: string[];
  starredMessagesByUser: Record<string, StarredMessageRecord[]>;
  starredMessages: StarredMessageRecord[];
  notificationPreferences: ChatNotificationPreferences;

  // Pinning
  pinConversation: (channelId: string) => void;
  unpinConversation: (channelId: string) => void;
  togglePinConversation: (channelId: string) => void;
  isConversationPinned: (channelId: string) => boolean;

  // Archiving
  archiveConversation: (channelId: string) => void;
  unarchiveConversation: (channelId: string) => void;
  toggleArchiveConversation: (channelId: string) => void;
  isConversationArchived: (channelId: string) => boolean;

  // Starred Messages (user-specific)
  getStarredMessages: (userId?: string) => StarredMessageRecord[];
  starMessage: (
    record: StarredMessageRecord,
    channel?: StreamChannel | null,
    userId?: string
  ) => Promise<void>;
  unstarMessage: (
    messageId: string,
    channel?: StreamChannel | null,
    userId?: string
  ) => Promise<void>;
  isMessageStarred: (messageId: string, userId?: string) => boolean;

  // Notification Preferences
  updateNotificationPreferences: (
    prefs: Partial<ChatNotificationPreferences>
  ) => void;
}

export const useChatOrganizationStore = create<ChatOrganizationState>()(
  persist(
    (set, get) => ({
      pinnedConversationIds: [],
      archivedConversationIds: [],
      starredMessagesByUser: {},
      starredMessages: [],

      notificationPreferences: {
        directMessages: true,
        communityMessages: true,
        mentions: true,
        threadReplies: true,
        sound: true,
        desktopNotifications: false
      },

      pinConversation: (channelId: string) => {
        set((state) => {
          if (state.pinnedConversationIds.includes(channelId)) return state;
          return {
            pinnedConversationIds: [channelId, ...state.pinnedConversationIds]
          };
        });
      },

      unpinConversation: (channelId: string) => {
        set((state) => ({
          pinnedConversationIds: state.pinnedConversationIds.filter(
            (id) => id !== channelId
          )
        }));
      },

      togglePinConversation: (channelId: string) => {
        const isPinned = get().pinnedConversationIds.includes(channelId);
        if (isPinned) {
          get().unpinConversation(channelId);
        } else {
          get().pinConversation(channelId);
        }
      },

      isConversationPinned: (channelId: string) => {
        return get().pinnedConversationIds.includes(channelId);
      },

      archiveConversation: (channelId: string) => {
        set((state) => {
          if (state.archivedConversationIds.includes(channelId)) return state;
          // Unpin if archived
          return {
            archivedConversationIds: [channelId, ...state.archivedConversationIds],
            pinnedConversationIds: state.pinnedConversationIds.filter(
              (id) => id !== channelId
            )
          };
        });
      },

      unarchiveConversation: (channelId: string) => {
        set((state) => ({
          archivedConversationIds: state.archivedConversationIds.filter(
            (id) => id !== channelId
          )
        }));
      },

      toggleArchiveConversation: (channelId: string) => {
        const isArchived = get().archivedConversationIds.includes(channelId);
        if (isArchived) {
          get().unarchiveConversation(channelId);
        } else {
          get().archiveConversation(channelId);
        }
      },

      isConversationArchived: (channelId: string) => {
        return get().archivedConversationIds.includes(channelId);
      },

      getStarredMessages: (userId?: string) => {
        const uid = userId || "default";
        return get().starredMessagesByUser[uid] || get().starredMessages || [];
      },

      starMessage: async (
        record: StarredMessageRecord,
        channel?: StreamChannel | null,
        userId?: string
      ) => {
        const uid = userId || channel?.client?.userID || "default";
        set((state) => {
          const userList = state.starredMessagesByUser[uid] || [];
          if (userList.some((m) => m.messageId === record.messageId)) {
            return state;
          }
          const updatedUserList = [record, ...userList];
          return {
            starredMessagesByUser: {
              ...state.starredMessagesByUser,
              [uid]: updatedUserList
            },
            starredMessages: updatedUserList
          };
        });

        // Clean up any stale star reactions from Stream if present
        if (channel && record.messageId) {
          try {
            await channel.deleteReaction(record.messageId, "star");
          } catch {
            // Silently ignore
          }
        }
      },

      unstarMessage: async (
        messageId: string,
        channel?: StreamChannel | null,
        userId?: string
      ) => {
        const uid = userId || channel?.client?.userID || "default";
        set((state) => {
          const userList = state.starredMessagesByUser[uid] || state.starredMessages || [];
          const updatedUserList = userList.filter((m) => m.messageId !== messageId);
          return {
            starredMessagesByUser: {
              ...state.starredMessagesByUser,
              [uid]: updatedUserList
            },
            starredMessages: updatedUserList
          };
        });

        if (channel && messageId) {
          try {
            await channel.deleteReaction(messageId, "star");
          } catch {
            // Silently ignore
          }
        }
      },

      isMessageStarred: (messageId: string, userId?: string) => {
        const uid = userId || "default";
        const userList = get().starredMessagesByUser[uid] || get().starredMessages;
        return userList.some((m) => m.messageId === messageId);
      },


      updateNotificationPreferences: (prefs: Partial<ChatNotificationPreferences>) => {
        set((state) => ({
          notificationPreferences: {
            ...state.notificationPreferences,
            ...prefs
          }
        }));
      }
    }),
    {
      name: "studyconnect_chat_organization"
    }
  )
);
