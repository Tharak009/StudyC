import type { Conversation, DirectMessage, PaginatedConversations, PaginatedDirectMessages } from "../types/direct-message";

export interface MessageListParams {
  page?: number;
  limit?: number;
  order?: "latest" | "oldest";
  search?: string;
}

export interface ConversationListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CreateMessagePayload {
  content: string;
  replyTo?: string;
  clientMessageId?: string;
  attachments?: File[];
  duration?: number;
  waveform?: number[];
  messageType?: string;
  payload?: any;
  onUploadProgress?: (progressEvent: { loaded: number; total?: number }) => void;
  signal?: AbortSignal;
}

/**
 * Stream Chat is now the primary direct messaging infrastructure for StudyConnect.
 * Legacy message persistence endpoints are deprecated/removed.
 * These stubs preserve backward compatibility with remaining UI components.
 */
export const directMessagesApi = {
  startConversation: async (_receiverId: string): Promise<Conversation> => {
    throw new Error("Direct message creation deprecated. Use streamApi.getOrCreateDm.");
  },
  listConversations: async (_params?: ConversationListParams): Promise<PaginatedConversations> => ({
    items: [],
    total: 0,
    page: 1,
    pages: 0,
    limit: 30
  }),
  getConversation: async (_conversationId: string): Promise<Conversation> => {
    throw new Error("Conversation fetch deprecated. Use Stream Chat channel.");
  },
  getMessages: async (_conversationId: string, _params?: MessageListParams): Promise<PaginatedDirectMessages> => ({
    items: [],
    total: 0,
    page: 1,
    pages: 0,
    limit: 30,
    order: "latest"
  }),
  sendMessage: async (_conversationId: string, _payload: CreateMessagePayload): Promise<DirectMessage> => {
    throw new Error("Direct message send deprecated. Use Stream Chat SDK.");
  },
  editMessage: async (_messageId: string, _content: string): Promise<DirectMessage> => {
    throw new Error("Direct message edit deprecated. Use Stream Chat SDK.");
  },
  deleteMessage: async (_messageId: string): Promise<DirectMessage> => {
    throw new Error("Direct message delete deprecated. Use Stream Chat SDK.");
  },
  markAsRead: async (_conversationId: string) => null,
  markAsUnread: async (_conversationId: string) => null,
  markAsDelivered: async (_conversationId: string) => null,
  togglePin: async (_conversationId: string) => ({ isPinned: false }),
  toggleMute: async (_conversationId: string) => ({ isMuted: false }),
  toggleArchive: async (_conversationId: string) => ({ isArchived: false }),
  unreadCount: async () => ({ count: 0 }),
  deleteForMe: async (messageId: string) => ({ success: true, messageId }),
  deleteForEveryone: async (_messageId: string): Promise<DirectMessage> => {
    throw new Error("Delete for everyone deprecated. Use Stream Chat SDK.");
  },
  toggleReaction: async (_messageId: string, _emoji: string, _category: "STANDARD" | "CAMPUS_CUSTOM" = "STANDARD") => ({
    reactions: []
  }),
  toggleStar: async (_messageId: string) => ({ isStarred: false }),
  togglePinMessage: async (_messageId: string) => ({ isPinned: false }),
  getStarredMessages: async (_conversationId: string): Promise<DirectMessage[]> => [],
  getPinnedMessages: async (_conversationId: string): Promise<DirectMessage[]> => [],
  forwardMessages: async (_conversationId: string, _messageIds: string[], _targetConversationIds: string[]): Promise<DirectMessage[]> => [],
  bulkDeleteForMe: async (_conversationId: string, messageIds: string[]) => ({ count: messageIds.length }),
  bulkDeleteForEveryone: async (_conversationId: string, messageIds: string[]) => ({ deletedIds: messageIds }),
  bulkStar: async (_conversationId: string, messageIds: string[], _star = true) => ({ count: messageIds.length }),
  clearChat: async (_conversationId: string) => ({ success: true, clearedCount: 0 }),
  deleteConversation: async (_conversationId: string) => ({ success: true }),
  search: async (_params: any): Promise<PaginatedDirectMessages> => ({
    items: [],
    total: 0,
    page: 1,
    pages: 0,
    limit: 30,
    order: "latest"
  }),
  lockConversation: async (_conversationId: string, _reason?: string): Promise<Conversation> => {
    throw new Error("Lock conversation deprecated.");
  },
  unlockConversation: async (_conversationId: string): Promise<Conversation> => {
    throw new Error("Unlock conversation deprecated.");
  },
  setDisappearing: async (_conversationId: string, _duration: string): Promise<Conversation> => {
    throw new Error("Set disappearing deprecated.");
  }
};
