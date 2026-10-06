export type GroupType =
  | "DISCUSSION"
  | "STUDY"
  | "PROJECT"
  | "SUBJECT"
  | "ANNOUNCEMENT";

export type GroupStatus = "ACTIVE" | "ARCHIVED" | "DELETED";

export interface CommunityGroup {
  _id: string;
  communityId: string;
  name: string;
  description: string;
  icon?: string;
  type: GroupType;
  streamChannelId: string;
  createdBy: string;
  status: GroupStatus;
  sortOrder: number;
  isAnnouncement: boolean;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGroupInput {
  name: string;
  description?: string;
  type?: GroupType;
  icon?: string;
}

export interface AttachGroupInput {
  name: string;
  description?: string;
  type?: GroupType;
  streamChannelId: string;
  icon?: string;
}
