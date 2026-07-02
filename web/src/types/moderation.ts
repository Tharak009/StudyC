export type ModeratedContentType = "POST" | "COMMENT" | "IMAGE" | "FILE";

export type VisibilityStatus = "VISIBLE" | "HIDDEN" | "DELETED";

export type ModerationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ContentReport {
  id: string;
  reporter: string;
  reason: string;
  date: string;
}

export interface ModerationHistoryItem {
  moderator: string;
  actionTaken: string;
  reason: string;
  timestamp: string;
}

export interface ModeratedContent {
  _id: string;
  title?: string; // Only for posts
  content: string; // The post body or comment text
  contentType: ModeratedContentType;
  author: {
    _id: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
    department: string;
    status: "ACTIVE" | "WARNED" | "SUSPENDED";
  };
  community: {
    _id: string;
    name: string;
  };
  createdAt: string;
  reportsCount: number;
  reports: ContentReport[];
  visibilityStatus: VisibilityStatus;
  moderationStatus: ModerationStatus;
  pinned?: boolean; // Only for posts
  commentsLocked?: boolean; // Only for posts
  attachments?: Array<{
    name: string;
    type: "image" | "file";
    url: string;
    size?: string;
  }>;
  moderationHistory: ModerationHistoryItem[];
}
