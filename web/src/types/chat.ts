import type { User } from "./auth";

export type MessageType = "TEXT" | "IMAGE" | "PDF" | "DOCUMENT";

export interface MessageAttachment {
  key: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
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
  replyTo?: ChatReply;
  edited: boolean;
  editedAt?: string;
  deleted: boolean;
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
