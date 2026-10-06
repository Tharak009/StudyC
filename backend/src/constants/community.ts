export const COMMUNITY_VISIBILITY = {
  PUBLIC: "PUBLIC",
  PRIVATE: "PRIVATE",
  COLLEGE_ONLY: "COLLEGE_ONLY",
  INVITE_ONLY: "INVITE_ONLY"
} as const;

export const ALL_COMMUNITY_VISIBILITIES = [
  "PUBLIC",
  "PRIVATE",
  "COLLEGE_ONLY",
  "INVITE_ONLY",
  "public",
  "private"
] as const;

export type CommunityVisibility =
  | (typeof COMMUNITY_VISIBILITY)[keyof typeof COMMUNITY_VISIBILITY]
  | "public"
  | "private";

export const normalizeVisibility = (
  visibility: string
): (typeof COMMUNITY_VISIBILITY)[keyof typeof COMMUNITY_VISIBILITY] => {
  const upper = (visibility || "").trim().toUpperCase();
  if (upper === "PUBLIC" || upper === "PRIVATE" || upper === "COLLEGE_ONLY" || upper === "INVITE_ONLY") {
    return upper as (typeof COMMUNITY_VISIBILITY)[keyof typeof COMMUNITY_VISIBILITY];
  }
  return COMMUNITY_VISIBILITY.PUBLIC;
};

export const isPrivateCommunity = (visibility?: string): boolean => {
  if (!visibility) return false;
  const upper = visibility.trim().toUpperCase();
  return upper === "PRIVATE" || upper === "INVITE_ONLY";
};

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

export type AcademicCategory = (typeof ACADEMIC_CATEGORIES)[number];
export type LegacyCategory = (typeof LEGACY_CATEGORIES)[number];
export type CommunityCategory = (typeof COMMUNITY_CATEGORIES)[number] | (string & {});

export const COMMUNITY_TYPES = {
  ACADEMIC: "ACADEMIC",
  STUDY_GROUP: "STUDY_GROUP",
  COLLEGE: "COLLEGE",
  CLUB: "CLUB",
  INTEREST: "INTEREST",
  PROJECT: "PROJECT"
} as const;

export type CommunityType = (typeof COMMUNITY_TYPES)[keyof typeof COMMUNITY_TYPES];

export const COMMUNITY_STATUS = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  ARCHIVED: "ARCHIVED",
  DELETED: "DELETED"
} as const;

export type CommunityStatus = (typeof COMMUNITY_STATUS)[keyof typeof COMMUNITY_STATUS];

export const VALID_STATUS_TRANSITIONS: Record<CommunityStatus, CommunityStatus[]> = {
  [COMMUNITY_STATUS.DRAFT]: [COMMUNITY_STATUS.ACTIVE, COMMUNITY_STATUS.DELETED],
  [COMMUNITY_STATUS.ACTIVE]: [COMMUNITY_STATUS.ARCHIVED, COMMUNITY_STATUS.DELETED],
  [COMMUNITY_STATUS.ARCHIVED]: [COMMUNITY_STATUS.ACTIVE, COMMUNITY_STATUS.DELETED],
  [COMMUNITY_STATUS.DELETED]: []
};

export const COMMUNITY_JOIN_POLICY = {
  OPEN: "OPEN",
  APPLICATION: "APPLICATION",
  INVITE_ONLY: "INVITE_ONLY"
} as const;

export type CommunityJoinPolicy = (typeof COMMUNITY_JOIN_POLICY)[keyof typeof COMMUNITY_JOIN_POLICY];
