import type { User } from "./auth";

export type MessageType = "TEXT" | "IMAGE" | "PDF" | "DOCUMENT" | "AUDIO";

export interface DirectMessageAttachment {
  key: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
  waveform?: number[];
}

export interface DirectMessageReaction {
  emoji: string;
  count?: number;
  users: string[];
  category?: "STANDARD" | "CAMPUS_CUSTOM";
}

export interface DirectMessageReply {
  _id: string;
  content: string;
  deleted: boolean;
  isDeletedForEveryone?: boolean;
  messageType?: MessageType;
  senderId?: Pick<User, "_id" | "fullName">;
}

export interface DirectMessage {
  _id: string;
  conversationId: string;
  senderId: Pick<User, "_id" | "fullName" | "rollNumber" | "profilePicture">;
  content: string;
  messageType: MessageType;
  attachments: DirectMessageAttachment[];
  replyTo?: DirectMessageReply;
  reactions?: DirectMessageReaction[];
  clientMessageId?: string;
  delivered?: boolean;
  deliveredAt?: string;
  status?: "SENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";
  deletedFor?: string[];
  isDeletedForEveryone?: boolean;
  deletedBy?: string | { _id: string; fullName: string };
  deletedAt?: string;
  edited: boolean;
  editedAt?: string;
  read: boolean;
  readAt?: string;
  deleted: boolean;
  isStarred?: boolean;
  starredBy?: string[];
  isPinned?: boolean;
  pinnedAt?: string;
  pinnedBy?: string | Pick<User, "_id" | "fullName">;
  isForwarded?: boolean;
  forwardedFrom?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationLastMessage {
  content: string;
  senderId: string;
  createdAt: string;
}

export interface Conversation {
  _id: string;
  participants: Pick<User, "_id" | "fullName" | "rollNumber" | "profilePicture" | "department">[];
  lastMessage: ConversationLastMessage | null;
  lastMessageAt: string | null;
  isLocked?: boolean;
  lockedBy?: string | { _id: string; fullName: string };
  lockedReason?: string;
  lockedAt?: string;
  unreadCount?: number;
  isPinned?: boolean;
  isMuted?: boolean;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedConversations {
  items: Conversation[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface PaginatedDirectMessages {
  items: DirectMessage[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  order: "latest" | "oldest";
}
