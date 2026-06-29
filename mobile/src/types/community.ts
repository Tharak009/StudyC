import type { User } from "./auth";

export type CommunityRole = "OWNER" | "MODERATOR" | "MEMBER";
export type CommunityVisibility = "public" | "private";

export const COMMUNITY_CATEGORIES = [
  "Java Programming",
  "Python Programming",
  "Web Development",
  "Cyber Security",
  "Data Science",
  "Competitive Programming",
  "Placement Preparation",
  "Other",
] as const;

export type CommunityCategory = (typeof COMMUNITY_CATEGORIES)[number];

export interface Community {
  _id: string;
  name: string;
  slug: string;
  description: string;
  bannerImage?: string;
  category: CommunityCategory;
  tags: string[];
  visibility: CommunityVisibility;
  owner: Pick<User, "_id" | "fullName" | "rollNumber" | "profilePicture">;
  moderators: string[];
  memberCount: number;
  extensionPoints: {
    chatEnabled: boolean;
    resourcesEnabled: boolean;
    notificationsEnabled: boolean;
  };
  membershipRole: CommunityRole | null;
  isMember: boolean;
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
  joinedAt: string;
}

export interface PaginatedCommunities {
  items: Community[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
