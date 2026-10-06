export const GROUP_TYPES = {
  DISCUSSION: "DISCUSSION",
  STUDY: "STUDY",
  PROJECT: "PROJECT",
  SUBJECT: "SUBJECT",
  ANNOUNCEMENT: "ANNOUNCEMENT"
} as const;

export type GroupType = (typeof GROUP_TYPES)[keyof typeof GROUP_TYPES];

export const GROUP_STATUS = {
  ACTIVE: "ACTIVE",
  ARCHIVED: "ARCHIVED",
  DELETED: "DELETED"
} as const;

export type GroupStatus = (typeof GROUP_STATUS)[keyof typeof GROUP_STATUS];
