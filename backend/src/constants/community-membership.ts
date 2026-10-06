export const MEMBERSHIP_STATUS = {
  INVITED: "INVITED",
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  LEFT: "LEFT",
  MUTED: "MUTED",
  SUSPENDED: "SUSPENDED",
  BANNED: "BANNED"
} as const;

export type MembershipStatus =
  (typeof MEMBERSHIP_STATUS)[keyof typeof MEMBERSHIP_STATUS];

export const ACTIVE_MEMBERSHIP_STATUSES: MembershipStatus[] = [
  MEMBERSHIP_STATUS.ACTIVE,
  MEMBERSHIP_STATUS.MUTED
];

export const RESTRICTED_MEMBERSHIP_STATUSES: MembershipStatus[] = [
  MEMBERSHIP_STATUS.SUSPENDED,
  MEMBERSHIP_STATUS.BANNED
];

export const isActiveMember = (status?: string | null): boolean => {
  if (!status) return false;
  return (
    status === MEMBERSHIP_STATUS.ACTIVE || status === MEMBERSHIP_STATUS.MUTED
  );
};

export const isRestrictedMember = (status?: string | null): boolean => {
  if (!status) return false;
  return (
    status === MEMBERSHIP_STATUS.SUSPENDED ||
    status === MEMBERSHIP_STATUS.BANNED
  );
};
