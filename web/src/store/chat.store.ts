import { create } from "zustand";
import type { Channel, ChatMessage, SprintSession } from "../types/chat";

export interface ChatStoreState {
  selectedCommunityId: string | null;
  selectedChannelId: string | null;
  activeChannel: Channel | null;
  channels: Channel[];
  messages: ChatMessage[];
  pinnedMessages: ChatMessage[];
  threadParentMessage: ChatMessage | null;
  threadReplies: ChatMessage[];
  inspectorMode: "closed" | "thread" | "vault" | "roster";
  activeSprint: SprintSession | null;
  typingUsers: Array<{ userId: string; name: string }>;
  rejectionNotice: {
    reason: string;
    strikes: number;
    timeoutSeconds?: number;
    remainingSeconds?: number;
    matchedKeywords?: string[];
  } | null;

  // Actions
  setSelectedCommunityId: (id: string | null) => void;
  setSelectedChannel: (channel: Channel | null) => void;
  setChannels: (channels: Channel[]) => void;
  setMessages: (messages: ChatMessage[]) => void;
  prependMessages: (olderMessages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (message: ChatMessage) => void;
  removeMessage: (messageId: string) => void;
  setPinnedMessages: (messages: ChatMessage[]) => void;
  updateMessagePin: (messageId: string, isPinned: boolean) => void;
  markMessageAccepted: (messageId: string, karmaAwarded?: number) => void;
  openThread: (parent: ChatMessage) => void;
  closeThread: () => void;
  setThreadReplies: (replies: ChatMessage[]) => void;
  addThreadReply: (reply: ChatMessage) => void;
  setInspectorMode: (mode: "closed" | "thread" | "vault" | "roster") => void;
  setActiveSprint: (sprint: SprintSession | null) => void;
  updateSprintParticipants: (participants: string[]) => void;
  setUserTyping: (user: { userId: string; name: string }, isTyping: boolean) => void;
  setRejectionNotice: (notice: ChatStoreState["rejectionNotice"]) => void;
  clearRejectionNotice: () => void;
  resetChat: () => void;

  // Message Interaction Actions
  editMessageInStore: (messageId: string, content: string, editedAt?: string) => void;
  toggleStarInStore: (messageId: string, isStarred: boolean) => void;
  togglePinInStore: (messageId: string, isPinned: boolean) => void;
  updateReactionInStore: (messageId: string, reactions: ChatMessage["reactions"]) => void;
  deleteMessageForMeInStore: (messageId: string) => void;
  purgeMessageForEveryoneInStore: (messageId: string, purgeData?: Partial<ChatMessage>) => void;
  bulkDeleteForMeInStore: (messageIds: string[]) => void;
  bulkStarInStore: (messageIds: string[], isStarred: boolean) => void;
}

export const useChatStore = create<ChatStoreState>((set) => ({
  selectedCommunityId: null,
  selectedChannelId: null,
  activeChannel: null,
  channels: [],
  messages: [],
  pinnedMessages: [],
  threadParentMessage: null,
  threadReplies: [],
  inspectorMode: "closed",
  activeSprint: null,
  typingUsers: [],
  rejectionNotice: null,

  setSelectedCommunityId: (id) =>
    set({
      selectedCommunityId: id,
      messages: [],
      pinnedMessages: [],
      threadParentMessage: null,
      threadReplies: [],
      inspectorMode: "closed",
      typingUsers: [],
      rejectionNotice: null
    }),

  setSelectedChannel: (channel) =>
    set({
      selectedChannelId: channel?._id || channel?.name || null,
      activeChannel: channel,
      threadParentMessage: null,
      threadReplies: [],
      rejectionNotice: null,
      typingUsers: []
    }),

  setChannels: (channels) => set({ channels }),

  setMessages: (messages) => set({ messages }),
  prependMessages: (older) => set((s) => ({ messages: [...older, ...s.messages] })),
  addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  updateMessage: (m) => set((s) => ({ messages: s.messages.map((x) => (x._id === m._id ? m : x)) })),
  removeMessage: (id) => set((s) => ({ messages: s.messages.filter((x) => x._id !== id) })),
  setPinnedMessages: (pinnedMessages) => set({ pinnedMessages }),
  updateMessagePin: (id, isPinned) =>
    set((s) => ({
      messages: s.messages.map((m) => (m._id === id ? { ...m, isPinned } : m))
    })),
  markMessageAccepted: () => {},

  openThread: (parent) => set({ threadParentMessage: parent, inspectorMode: "thread" }),
  closeThread: () => set({ threadParentMessage: null, inspectorMode: "closed" }),
  setThreadReplies: (threadReplies) => set({ threadReplies }),
  addThreadReply: (reply) => set((s) => ({ threadReplies: [...s.threadReplies, reply] })),

  setInspectorMode: (mode) => set({ inspectorMode: mode }),

  setActiveSprint: (sprint) => set({ activeSprint: sprint }),

  updateSprintParticipants: (participants) =>
    set((state) => ({
      activeSprint: state.activeSprint
        ? { ...state.activeSprint, participants }
        : null
    })),

  setUserTyping: (user, isTyping) =>
    set((state) => {
      const filtered = state.typingUsers.filter((u) => u.userId !== user.userId);
      return {
        typingUsers: isTyping ? [...filtered, user] : filtered
      };
    }),

  setRejectionNotice: (notice) => set({ rejectionNotice: notice }),
  clearRejectionNotice: () => set({ rejectionNotice: null }),

  resetChat: () =>
    set({
      selectedCommunityId: null,
      selectedChannelId: null,
      activeChannel: null,
      channels: [],
      messages: [],
      pinnedMessages: [],
      threadParentMessage: null,
      threadReplies: [],
      inspectorMode: "closed",
      activeSprint: null,
      typingUsers: [],
      rejectionNotice: null
    }),

  editMessageInStore: () => {},
  toggleStarInStore: () => {},
  togglePinInStore: () => {},
  updateReactionInStore: () => {},
  deleteMessageForMeInStore: () => {},
  purgeMessageForEveryoneInStore: () => {},
  bulkDeleteForMeInStore: () => {},
  bulkStarInStore: () => {}
}));
