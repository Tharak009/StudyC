import type { User } from "./auth";

export type MessageType = "TEXT" | "IMAGE" | "PDF" | "DOCUMENT";

export interface MessageAttachment {
  key: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface CodeSnippet {
  language: string;
  code: string;
  title?: string;
}

export interface MessageReaction {
  emoji: string;
  users: string[];
}

export interface ChatReply {
  _id: string;
  content: string;
  deleted: boolean;
  senderId?: Pick<User, "_id" | "fullName">;
  codeSnippet?: CodeSnippet;
  intent?: "chat" | "question" | "solution" | "code";
}

export interface ChatMessage {
  _id: string;
  communityId: string;
  channelId?: string;
  senderId: Pick<User, "_id" | "fullName" | "rollNumber" | "profilePicture"> & { karma?: number };
  senderName?: string;
  senderDepartment?: string;
  senderRoll?: string;
  content: string;
  messageType: MessageType;
  attachments: MessageAttachment[];
  replyTo?: ChatReply;
  intent?: "chat" | "question" | "solution" | "code";
  codeSnippet?: CodeSnippet;
  isAcceptedSolution?: boolean;
  karmaAwarded?: number;
  isPinned?: boolean;
  threadCount?: number;
  threadLastReplyAt?: string;
  reactions?: MessageReaction[];
  edited: boolean;
  editedAt?: string;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Channel {
  _id?: string;
  name: string;
  type: "text" | "voice" | "announcement";
  category?: "announcements" | "focus" | "watercooler" | "stages" | "text" | "voice";
  topic?: string;
  isPrivate?: boolean;
  isStrictStudyMode?: boolean;
  academicContextTags?: string[];
  strictnessThreshold?: number;
  allowCodeSnippetsOnly?: boolean;
  strikeLimitBeforeTimeout?: number;
  timeoutDurationMinutes?: number;
}

export interface SprintSession {
  communityId: string;
  channelId?: string;
  isActive: boolean;
  durationMinutes: number;
  startedAt: string;
  endsAt: string;
  topic: string;
  startedBy: string;
  startedByName?: string;
  participants: string[];
}

export interface VoicePeer {
  socketId: string;
  userId: string;
  name: string;
  isSpeaking: boolean;
  isMuted: boolean;
  isScreenSharing?: boolean;
}

export interface PaginatedMessages {
  items: ChatMessage[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  order: "latest" | "oldest";
}
