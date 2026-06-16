import { create } from "zustand";
import type { Conversation } from "../types/direct-message";

interface DirectMessageState {
  conversations: Conversation[];
  unreadCount: number;
  activeConversationId: string | null;
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (conversationId: string, updates: Partial<Conversation>) => void;
  removeConversation: (conversationId: string) => void;
  setUnreadCount: (count: number) => void;
  setActiveConversationId: (id: string | null) => void;
}

export const useDirectMessageStore = create<DirectMessageState>((set) => ({
  conversations: [],
  unreadCount: 0,
  activeConversationId: null,
  setConversations: (conversations) => set({ conversations }),
  addConversation: (conversation) =>
    set((state) => {
      const exists = state.conversations.some((c) => c._id === conversation._id);
      if (exists) {
        return {
          conversations: state.conversations.map((c) =>
            c._id === conversation._id ? conversation : c
          )
        };
      }
      return { conversations: [conversation, ...state.conversations] };
    }),
  updateConversation: (conversationId, updates) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c._id === conversationId ? { ...c, ...updates } : c
      )
    })),
  removeConversation: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c._id !== conversationId)
    })),
  setUnreadCount: (count) => set({ unreadCount: count }),
  setActiveConversationId: (id) => set({ activeConversationId: id })
}));
