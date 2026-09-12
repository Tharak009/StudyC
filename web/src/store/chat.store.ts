import { create } from "zustand";
import type { Channel, ChatMessage, SprintSession, VoicePeer } from "../types/chat";

export interface ActiveVoiceStageState {
  stageId: string;
  communityId?: string;
  channelName: string;
  isConnected: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  isScreenSharing: boolean;
  peers: VoicePeer[];
}

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
  activeVoiceStage: ActiveVoiceStageState | null;
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
  setActiveVoiceStage: (stage: ActiveVoiceStageState | null) => void;
  updateVoicePeers: (peers: VoicePeer[]) => void;
  setVoiceMuted: (isMuted: boolean) => void;
  setVoiceSpeaking: (isSpeaking: boolean) => void;
  setVoiceScreenSharing: (isSharing: boolean) => void;
  leaveVoiceStage: () => void;
  setUserTyping: (user: { userId: string; name: string }, isTyping: boolean) => void;
  setRejectionNotice: (notice: ChatStoreState["rejectionNotice"]) => void;
  clearRejectionNotice: () => void;
  resetChat: () => void;
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
  activeVoiceStage: null,
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

  setMessages: (messages) =>
    set({
      messages,
      pinnedMessages: messages.filter((m) => m.isPinned)
    }),

  prependMessages: (olderMessages) =>
    set((state) => ({
      messages: [...olderMessages, ...state.messages]
    })),

  addMessage: (message) =>
    set((state) => {
      // Avoid duplicates
      if (state.messages.some((m) => m._id === message._id)) return state;
      const updatedMessages = [...state.messages, message];
      const updatedPinned = message.isPinned
        ? [...state.pinnedMessages, message]
        : state.pinnedMessages;
      return {
        messages: updatedMessages,
        pinnedMessages: updatedPinned
      };
    }),

  updateMessage: (updated) =>
    set((state) => ({
      messages: state.messages.map((m) => (m._id === updated._id ? { ...m, ...updated } : m)),
      pinnedMessages: state.pinnedMessages.map((m) =>
        m._id === updated._id ? { ...m, ...updated } : m
      ),
      threadParentMessage:
        state.threadParentMessage?._id === updated._id
          ? { ...state.threadParentMessage, ...updated }
          : state.threadParentMessage
    })),

  removeMessage: (messageId) =>
    set((state) => ({
      messages: state.messages.filter((m) => m._id !== messageId),
      pinnedMessages: state.pinnedMessages.filter((m) => m._id !== messageId),
      threadParentMessage:
        state.threadParentMessage?._id === messageId ? null : state.threadParentMessage
    })),

  setPinnedMessages: (pinnedMessages) => set({ pinnedMessages }),

  updateMessagePin: (messageId, isPinned) =>
    set((state) => {
      const messages = state.messages.map((m) =>
        m._id === messageId ? { ...m, isPinned } : m
      );
      const pinnedMessages = isPinned
        ? [
            ...state.pinnedMessages.filter((m) => m._id !== messageId),
            messages.find((m) => m._id === messageId)!
          ].filter(Boolean)
        : state.pinnedMessages.filter((m) => m._id !== messageId);
      return { messages, pinnedMessages };
    }),

  markMessageAccepted: (messageId, karmaAwarded = 25) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m._id === messageId ? { ...m, isAcceptedSolution: true, karmaAwarded } : m
      ),
      pinnedMessages: state.pinnedMessages.map((m) =>
        m._id === messageId ? { ...m, isAcceptedSolution: true, karmaAwarded } : m
      ),
      threadParentMessage:
        state.threadParentMessage?._id === messageId
          ? { ...state.threadParentMessage, isAcceptedSolution: true, karmaAwarded }
          : state.threadParentMessage
    })),

  openThread: (parent) =>
    set({
      threadParentMessage: parent,
      inspectorMode: "thread",
      threadReplies: []
    }),

  closeThread: () =>
    set((state) => ({
      threadParentMessage: null,
      threadReplies: [],
      inspectorMode: state.inspectorMode === "thread" ? "closed" : state.inspectorMode
    })),

  setThreadReplies: (replies) => set({ threadReplies: replies }),

  addThreadReply: (reply) =>
    set((state) => {
      if (state.threadReplies.some((r) => r._id === reply._id)) return state;
      const updatedReplies = [...state.threadReplies, reply];
      const updatedMessages = state.messages.map((m) => {
        if (m._id === reply.replyTo?._id || m._id === (reply as any).parentMessageId) {
          return {
            ...m,
            threadCount: (m.threadCount || 0) + 1,
            threadLastReplyAt: reply.createdAt
          };
        }
        return m;
      });
      return {
        threadReplies: updatedReplies,
        messages: updatedMessages,
        threadParentMessage:
          state.threadParentMessage &&
          (state.threadParentMessage._id === reply.replyTo?._id ||
            state.threadParentMessage._id === (reply as any).parentMessageId)
            ? {
                ...state.threadParentMessage,
                threadCount: (state.threadParentMessage.threadCount || 0) + 1,
                threadLastReplyAt: reply.createdAt
              }
            : state.threadParentMessage
      };
    }),

  setInspectorMode: (mode) => set({ inspectorMode: mode }),

  setActiveSprint: (sprint) => set({ activeSprint: sprint }),

  updateSprintParticipants: (participants) =>
    set((state) => ({
      activeSprint: state.activeSprint
        ? { ...state.activeSprint, participants }
        : null
    })),

  setActiveVoiceStage: (stage) => set({ activeVoiceStage: stage }),

  updateVoicePeers: (peers) =>
    set((state) => ({
      activeVoiceStage: state.activeVoiceStage
        ? { ...state.activeVoiceStage, peers }
        : null
    })),

  setVoiceMuted: (isMuted) =>
    set((state) => ({
      activeVoiceStage: state.activeVoiceStage
        ? { ...state.activeVoiceStage, isMuted }
        : null
    })),

  setVoiceSpeaking: (isSpeaking) =>
    set((state) => ({
      activeVoiceStage: state.activeVoiceStage
        ? { ...state.activeVoiceStage, isSpeaking }
        : null
    })),

  setVoiceScreenSharing: (isScreenSharing) =>
    set((state) => ({
      activeVoiceStage: state.activeVoiceStage
        ? { ...state.activeVoiceStage, isScreenSharing }
        : null
    })),

  leaveVoiceStage: () => set({ activeVoiceStage: null }),

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
      activeVoiceStage: null,
      typingUsers: [],
      rejectionNotice: null
    })
}));
