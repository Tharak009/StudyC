export type ReportPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ReportStatus = "PENDING" | "UNDER_INVESTIGATION" | "RESOLVED" | "REJECTED";

export type ReportType = "USER" | "POST" | "COMMENT" | "COMMUNITY" | "EVENT";

export interface TimelineEvent {
  status: string;
  label: string;
  date: string;
  moderator?: string;
  details?: string;
}

export interface AdminNote {
  id: string;
  author: string;
  content: string;
  date: string;
}

export interface ModeratedReport {
  _id: string;
  reportType: ReportType;
  reason: string;
  description: string;
  priority: ReportPriority;
  status: ReportStatus;
  reporter: {
    _id: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
    department: string;
  };
  reportedUser?: {
    _id: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
    department: string;
    status: "ACTIVE" | "WARNED" | "SUSPENDED";
  };
  linkedContent?: {
    title?: string;
    body: string;
    communityName?: string;
    eventName?: string;
    postId?: string;
    commentId?: string;
    attachments?: Array<{
      name: string;
      url: string;
    }>;
  };
  assignedModerator?: string;
  createdAt: string;
  updatedAt: string;
  timeline: TimelineEvent[];
  internalNotes: AdminNote[];
  resolutionNotes?: string;
  moderatorComments?: string;
}
