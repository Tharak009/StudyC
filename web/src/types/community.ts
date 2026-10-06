import type { User } from "./auth";
import type { Channel } from "./chat";

export type CommunityRole = "OWNER" | "MODERATOR" | "MEMBER";

export type CommunityVisibility =
  | "PUBLIC"
  | "PRIVATE"
  | "COLLEGE_ONLY"
  | "INVITE_ONLY"
  | "public"
  | "private";

export type CommunityType =
  | "ACADEMIC"
  | "STUDY_GROUP"
  | "COLLEGE"
  | "CLUB"
  | "INTEREST"
  | "PROJECT";

export type CommunityStatus = "DRAFT" | "ACTIVE" | "ARCHIVED" | "DELETED";

export type CommunityJoinPolicy = "OPEN" | "APPLICATION" | "INVITE_ONLY";

export const ACADEMIC_CATEGORIES = [
  "DEPARTMENT",
  "SUBJECT",
  "COURSE",
  "PROGRAMMING",
  "PLACEMENT",
  "PROJECT",
  "STUDY_GROUP",
  "COLLEGE_CLUB",
  "ACADEMIC_INTEREST",
  "EXAM_PREPARATION"
] as const;

export const LEGACY_CATEGORIES = [
  "Java Programming",
  "Python Programming",
  "Web Development",
  "Cyber Security",
  "Data Science",
  "Competitive Programming",
  "Placement Preparation",
  "Other"
] as const;

export const COMMUNITY_CATEGORIES = [
  ...ACADEMIC_CATEGORIES,
  ...LEGACY_CATEGORIES
] as const;

export type CommunityCategory = (typeof COMMUNITY_CATEGORIES)[number] | (string & {});

export type MembershipStatus =
  | "INVITED"
  | "PENDING"
  | "ACTIVE"
  | "LEFT"
  | "MUTED"
  | "SUSPENDED"
  | "BANNED";

export interface Community {
  _id: string;
  name: string;
  slug: string;
  description: string;
  icon?: string;
  banner?: string;
  bannerImage?: string;
  category: CommunityCategory;
  type?: CommunityType;
  tags: string[];
  visibility: CommunityVisibility;
  joinPolicy?: CommunityJoinPolicy;
  status?: CommunityStatus;
  owner: Pick<User, "_id" | "fullName" | "rollNumber" | "profilePicture">;
  ownerId?: string;
  collegeId?: string;
  moderators: string[];
  memberCount: number;
  groupCount?: number;
  announcementGroupId?: string;
  channels?: Channel[];
  extensionPoints: {
    chatEnabled: boolean;
    resourcesEnabled: boolean;
    notificationsEnabled: boolean;
  };
  membershipRole: CommunityRole | null;
  membershipStatus?: MembershipStatus | null;
  isMember: boolean;
  isPending?: boolean;
  isBanned?: boolean;
  isSuspended?: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityMember {
  _id: string;
  communityId: string;
  userId: Pick<
    User,
    "_id" | "fullName" | "rollNumber" | "department" | "academicYear" | "profilePicture"
  >;
  role: CommunityRole;
  status?: MembershipStatus;
  joinedAt?: string;
  requestedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  bannedAt?: string;
  banReason?: string;
  suspendedAt?: string;
  suspendedUntil?: string;
  suspensionReason?: string;
}

export interface JoinRequest {
  _id: string;
  communityId: string;
  userId: Pick<
    User,
    "_id" | "fullName" | "rollNumber" | "department" | "academicYear" | "profilePicture"
  >;
  status: "PENDING";
  requestedAt?: string;
  createdAt?: string;
}

export interface PaginatedCommunities {
  items: Community[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
