export const RESOURCE_CATEGORIES = [
  "NOTES",
  "ASSIGNMENTS",
  "PREVIOUS_PAPERS",
  "PPTS",
  "LAB_RECORDS",
  "QUESTION_BANKS",
  "OTHER"
] as const;

export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];

export const RESOURCE_VISIBILITY = {
  COMMUNITY: "COMMUNITY",
  PUBLIC: "PUBLIC"
} as const;

export type ResourceVisibility = (typeof RESOURCE_VISIBILITY)[keyof typeof RESOURCE_VISIBILITY];
