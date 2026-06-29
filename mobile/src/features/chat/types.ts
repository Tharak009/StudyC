import type { User } from "../../types/auth";

export type MessageType = "TEXT" | "IMAGE" | "PDF" | "DOCUMENT" | "VOICE" | "VIDEO";

export interface MessageAttachment {
  key: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
  duration?: number; // For voice notes
}

export interface MessageReaction {
  emoji: string;
  userId: string;
  fullName: string;
}

export interface ChatReply {
  _id: string;
  content: string;
  deleted: boolean;
  senderId?: Pick<User, "_id" | "fullName">;
}

export interface ChatMessage {
  _id: string;
  communityId: string;
  senderId: Pick<User, "_id" | "fullName" | "rollNumber" | "profilePicture">;
  content: string;
  messageType: MessageType;
  attachments: MessageAttachment[];
  reactions?: MessageReaction[]; // For future reactions support
  replyTo?: ChatReply;
  edited: boolean;
  editedAt?: string;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DirectMessage {
  _id: string;
  conversationId: string;
  senderId: Pick<User, "_id" | "fullName" | "rollNumber" | "profilePicture">;
  content: string;
  messageType: MessageType;
  attachments: MessageAttachment[];
  reactions?: MessageReaction[]; // For future reactions support
  replyTo?: DirectMessageReply;
  edited: boolean;
  editedAt?: string;
  read: boolean;
  readAt?: string;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DirectMessageReply {
  _id: string;
  content: string;
  deleted: boolean;
  senderId?: Pick<User, "_id" | "fullName">;
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
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedMessages {
  items: ChatMessage[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  order: "latest" | "oldest";
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
