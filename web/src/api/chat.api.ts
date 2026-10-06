import type { ChatMessage, PaginatedMessages } from "../types/chat";

export interface MessageListParams {
  page?: number;
  limit?: number;
  order?: "latest" | "oldest";
  channelId?: string;
}

export interface CreateMessagePayload {
  content: string;
  channelId?: string;
  replyTo?: string;
  attachments?: File[];
  duration?: number;
  waveform?: number[];
  messageType?: string;
  payload?: any;
  onUploadProgress?: (progressEvent: { loaded: number; total?: number }) => void;
  signal?: AbortSignal;
}

/**
 * Stream Chat is now the primary chat infrastructure for StudyConnect.
 * Legacy message persistence endpoints are deprecated/removed.
 * These stubs preserve backward compatibility with remaining UI components.
 */
export const chatApi = {
  history: async (_communityId: string, _params?: MessageListParams): Promise<PaginatedMessages> => ({
    items: [],
    total: 0,
    page: 1,
    pages: 0,
    limit: 30,
    order: "latest"
  }),
  create: async (_communityId: string, _payload: CreateMessagePayload): Promise<ChatMessage> => {
    throw new Error("Custom message creation deprecated. Use Stream Chat SDK.");
  },
  editMessage: async (_communityId: string, _messageId: string, _content: string): Promise<ChatMessage> => {
    throw new Error("Custom message edit deprecated. Use Stream Chat SDK.");
  },
  deleteMessage: async (_communityId: string, _messageId: string): Promise<ChatMessage> => {
    throw new Error("Custom message deletion deprecated. Use Stream Chat SDK.");
  },
  deleteForMe: async (_communityId: string, messageId: string) => ({
    success: true,
    messageId
  }),
  toggleReaction: async (_communityId: string, _messageId: string, _emoji: string) => ({
    reactions: []
  }),
  toggleStar: async (_communityId: string, _messageId: string) => ({
    isStarred: false
  }),
  togglePin: async (_communityId: string, _messageId: string) => ({
    isPinned: false
  }),
  listStarred: async (_communityId: string, _channelId?: string): Promise<ChatMessage[]> => [],
  listPinned: async (_communityId: string, _channelId?: string): Promise<ChatMessage[]> => [],
  forward: async (_communityId: string, _payload: any): Promise<ChatMessage[]> => [],
  bulkDeleteForMe: async (_communityId: string, messageIds: string[]) => ({ count: messageIds.length }),
  bulkDeleteForEveryone: async (_communityId: string, messageIds: string[]) => ({ deletedIds: messageIds }),
  bulkStar: async (_communityId: string, messageIds: string[], _star = true) => ({ count: messageIds.length }),
  search: async (_params: any): Promise<PaginatedMessages> => ({
    items: [],
    total: 0,
    page: 1,
    pages: 0,
    limit: 30,
    order: "latest"
  }),
  lockChannel: async (_communityId: string, channelId: string, _reason?: string) => ({
    locked: true,
    channelId
  }),
  unlockChannel: async (_communityId: string, channelId: string) => ({
    locked: false,
    channelId
  })
};
