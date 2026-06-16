export const REPORT_TARGET_TYPES = {
  USER: "USER",
  COMMUNITY: "COMMUNITY",
  MESSAGE: "MESSAGE",
  RESOURCE: "RESOURCE"
} as const;

export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[keyof typeof REPORT_TARGET_TYPES];

export const REPORT_STATUS = {
  PENDING: "PENDING",
  REVIEWED: "REVIEWED",
  RESOLVED: "RESOLVED",
  REJECTED: "REJECTED"
} as const;

export type ReportStatus = (typeof REPORT_STATUS)[keyof typeof REPORT_STATUS];
