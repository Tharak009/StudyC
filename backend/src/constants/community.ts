export const COMMUNITY_VISIBILITY = {
  PUBLIC: "public",
  PRIVATE: "private"
} as const;

export const COMMUNITY_CATEGORIES = [
  "Java Programming",
  "Python Programming",
  "Web Development",
  "Cyber Security",
  "Data Science",
  "Competitive Programming",
  "Placement Preparation",
  "Other"
] as const;

export type CommunityVisibility =
  (typeof COMMUNITY_VISIBILITY)[keyof typeof COMMUNITY_VISIBILITY];
export type CommunityCategory = (typeof COMMUNITY_CATEGORIES)[number];
