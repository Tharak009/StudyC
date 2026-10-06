import { create } from "zustand";
import type { Conversation, DirectMessage } from "../types/direct-message";

const DRAFTS_KEY = "studyconnect_dm_drafts";

const loadInitialDrafts = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveDraftsToStorage = (drafts: Record<string, string>) => {
  try {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  } catch {}
};

const sortMessagesChronologically = (msgs: DirectMessage[]): DirectMessage[] => {
  return [...msgs].sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return (a._id || a.clientMessageId || "").localeCompare(b._id || b.clientMessageId || "");
  });
};

const sortConversations = (convs: Conversation[]): Conversation[] => {
  return [...convs].sort((a, b) => {
    const aPinned = a.isPinned ? 1 : 0;
    const bPinned = b.isPinned ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return timeB - timeA;
  });
};

export interface DirectMessageState {
  conversations: Conversation[];
  unreadCount: number;
  activeConversationId: string | null;
  messages: Record<string, DirectMessage[]>;
  drafts: Record<string, string>;
  typingPeers: Record<string, boolean>;
  connectionStatus: "connected" | "connecting" | "offline";

  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (conversationId: string, updates: Partial<Conversation>) => void;
  removeConversation: (conversationId: string) => void;
  setUnreadCount: (count: number) => void;
  setActiveConversationId: (id: string | null) => void;

  // Messages & Reliability Actions
  setMessages: (conversationId: string, messages: DirectMessage[]) => void;
  addOptimisticMessage: (conversationId: string, message: DirectMessage) => void;
  reconcileMessage: (conversationId: string, clientMessageId: string, serverMessage: DirectMessage) => void;
  markMessageFailed: (conversationId: string, clientMessageId: string) => void;
  retryMessage: (conversationId: string, clientMessageId: string) => void;
  updateMessageDelivery: (conversationId: string, messageId: string, status: "DELIVERED" | "READ") => void;
  markConversationMessagesRead: (conversationId: string) => void;

  // Real-time Conversation Ordering
  updateConversationOrder: (
    conversationId: string,
    lastMessage: { content: string; senderId: string; createdAt: string },
    incrementUnread?: boolean
  ) => void;

  // Drafts Persistence
  setDraft: (conversationId: string, text: string) => void;
  clearDraft: (conversationId: string) => void;

  // Typing & Connection
  setTyping: (conversationId: string, isTyping: boolean) => void;
  setConnectionStatus: (status: "connected" | "connecting" | "offline") => void;

  // Quick State Toggles
  togglePin: (conversationId: string) => void;
  toggleMute: (conversationId: string) => void;
  toggleArchive: (conversationId: string) => void;
  markAsUnread: (conversationId: string) => void;

  // Message Interaction Actions
  editMessageInStore: (conversationId: string, messageId: string, content: string, editedAt?: string) => void;
  toggleStarInStore: (conversationId: string, messageId: string, isStarred: boolean) => void;
  togglePinInStore: (conversationId: string, messageId: string, isPinned: boolean, pinnedBy?: any) => void;
  updateReactionInStore: (conversationId: string, messageId: string, reactions: DirectMessage["reactions"]) => void;
  deleteMessageForMeInStore: (conversationId: string, messageId: string) => void;
  purgeMessageForEveryoneInStore: (conversationId: string, messageId: string, purgeData?: Partial<DirectMessage>) => void;
  removeMessageFromStore: (conversationId: string, messageId: string) => void;
  bulkDeleteForMeInStore: (conversationId: string, messageIds: string[]) => void;
  bulkStarInStore: (conversationId: string, messageIds: string[], isStarred: boolean) => void;
}

export const useDirectMessageStore = create<DirectMessageState>((set) => ({
  conversations: [],
  unreadCount: 0,
  activeConversationId: null,
  messages: {},
  drafts: loadInitialDrafts(),
  typingPeers: {},
  connectionStatus: "connected",

  setConversations: (conversations) =>
    set({ conversations: sortConversations(conversations) }),

  addConversation: (conversation) =>
    set((state) => {
      const exists = state.conversations.some((c) => c._id === conversation._id);
      const updated = exists
        ? state.conversations.map((c) => (c._id === conversation._id ? conversation : c))
        : [conversation, ...state.conversations];
      return { conversations: sortConversations(updated) };
    }),

  updateConversation: (conversationId, updates) =>
    set((state) => {
      const updated = state.conversations.map((c) =>
        c._id === conversationId ? { ...c, ...updates } : c
      );
      return { conversations: sortConversations(updated) };
    }),

  removeConversation: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c._id !== conversationId)
    })),

  setUnreadCount: (count) => set({ unreadCount: count }),
  setActiveConversationId: (id) => set({ activeConversationId: id }),

  setMessages: (conversationId, messages) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: messages
      }
    })),

  addOptimisticMessage: (conversationId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] || []), message]
      }
    })),

  reconcileMessage: () => {},
  markMessageFailed: () => {},
  retryMessage: () => {},
  updateMessageDelivery: () => {},
  markConversationMessagesRead: () => {},

  updateConversationOrder: (conversationId, lastMessage, incrementUnread = false) =>
    set((state) => {
      const existing = state.conversations.find((c) => c._id === conversationId);
      if (!existing) return state;

      const newUnread = incrementUnread
        ? (existing.unreadCount || 0) + 1
        : existing.unreadCount || 0;

      const updatedConv: Conversation = {
        ...existing,
        lastMessage: {
          content: lastMessage.content,
          senderId: lastMessage.senderId,
          createdAt: lastMessage.createdAt
        },
        lastMessageAt: lastMessage.createdAt,
        unreadCount: newUnread
      };

      const remaining = state.conversations.filter((c) => c._id !== conversationId);
      const reordered = sortConversations([updatedConv, ...remaining]);
      const totalUnread = reordered.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

      return {
        conversations: reordered,
        unreadCount: totalUnread
      };
    }),

  setDraft: (conversationId, text) =>
    set((state) => {
      const updated = { ...state.drafts, [conversationId]: text };
      saveDraftsToStorage(updated);
      return { drafts: updated };
    }),

  clearDraft: (conversationId) =>
    set((state) => {
      const updated = { ...state.drafts };
      delete updated[conversationId];
      saveDraftsToStorage(updated);
      return { drafts: updated };
    }),

  setTyping: (conversationId, isTyping) =>
    set((state) => ({
      typingPeers: {
        ...state.typingPeers,
        [conversationId]: isTyping
      }
    })),

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

  togglePin: (conversationId) =>
    set((state) => {
      const updated = state.conversations.map((c) =>
        c._id === conversationId ? { ...c, isPinned: !c.isPinned } : c
      );
      return { conversations: sortConversations(updated) };
    }),

  toggleMute: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c._id === conversationId ? { ...c, isMuted: !c.isMuted } : c
      )
    })),

  toggleArchive: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c._id === conversationId ? { ...c, isArchived: !c.isArchived } : c
      )
    })),

  markAsUnread: (conversationId) =>
    set((state) => {
      const updated = state.conversations.map((c) =>
        c._id === conversationId ? { ...c, unreadCount: Math.max(1, c.unreadCount || 0) } : c
      );
      const totalUnread = updated.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
      return {
        conversations: updated,
        unreadCount: totalUnread
      };
    }),

  editMessageInStore: () => {},
  toggleStarInStore: () => {},
  togglePinInStore: () => {},
  updateReactionInStore: () => {},
  deleteMessageForMeInStore: () => {},
  purgeMessageForEveryoneInStore: () => {},
  removeMessageFromStore: () => {},
  bulkDeleteForMeInStore: () => {},
  bulkStarInStore: () => {}
}));
