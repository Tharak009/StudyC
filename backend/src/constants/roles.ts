export const ROLES = {
  STUDENT: "STUDENT",
  ADMIN: "ADMIN",
  COMMUNITY_ADMIN: "COMMUNITY_ADMIN",
  MODERATOR: "MODERATOR"
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ASSIGNABLE_REGISTRATION_ROLES: Role[] = [ROLES.STUDENT];
