import type { User } from "./auth";
import type { Community } from "./community";
import type { Resource } from "./resource";

export type ReportTargetType = "USER" | "COMMUNITY" | "MESSAGE" | "RESOURCE";
export type ReportStatus = "PENDING" | "REVIEWED" | "RESOLVED" | "REJECTED";

export interface Report {
  _id: string;
  reporterId: Pick<User, "_id" | "fullName" | "rollNumber" | "email" | "profilePicture">;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  description: string;
  status: ReportStatus;
  reviewedBy: Pick<User, "_id" | "fullName" | "rollNumber"> | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedUsers {
  items: User[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface PaginatedAdminCommunities {
  items: Community[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface PaginatedResources {
  items: Resource[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface PaginatedReports {
  items: Report[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface AdminDashboardStats {
  userCount: number;
  communityCount: number;
  resourceCount: number;
  reportCount: number;
  activeUsers: number;
  recentActivity: Array<{
    _id: string;
    adminId: Pick<User, "_id" | "fullName" | "rollNumber">;
    action: string;
    targetType: string;
    targetId: string | null;
    details: Record<string, unknown>;
    createdAt: string;
  }>;
}
