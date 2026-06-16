export const COMMUNITY_ROLES = {
  OWNER: "OWNER",
  MODERATOR: "MODERATOR",
  MEMBER: "MEMBER"
} as const;

export type CommunityRole = (typeof COMMUNITY_ROLES)[keyof typeof COMMUNITY_ROLES];
