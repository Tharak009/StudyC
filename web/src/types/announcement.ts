export type AnnouncementStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED" | "EXPIRED";

export type AnnouncementPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

export type AnnouncementCategory = "GENERAL" | "ACADEMIC" | "PLACEMENT" | "EVENTS" | "CLUBS" | "EMERGENCY";

export type AnnouncementAudience = "ENTIRE_COLLEGE" | "DEPARTMENT" | "ACADEMIC_YEAR" | "COMMUNITY";

export interface AnnouncementAttachment {
  name: string;
  url: string;
  size?: string;
}

export interface Announcement {
  _id: string;
  title: string;
  content: string; // Rich Text HTML Content
  bannerUrl?: string;
  attachments?: AnnouncementAttachment[];
  category: AnnouncementCategory;
  targetAudience: AnnouncementAudience;
  targetDepartment?: string;
  targetAcademicYear?: number;
  targetCommunityId?: string;
  targetCommunityName?: string;
  priority: AnnouncementPriority;
  publishDate: string; // ISO string
  expiryDate?: string; // ISO string
  status: AnnouncementStatus;
  viewsCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
