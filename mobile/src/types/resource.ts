import type { User } from "./auth";

export const RESOURCE_CATEGORIES = [
  "NOTES",
  "ASSIGNMENTS",
  "PREVIOUS_PAPERS",
  "PPTS",
  "LAB_RECORDS",
  "QUESTION_BANKS",
  "OTHER",
] as const;

export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];
export type ResourceVisibility = "COMMUNITY" | "PUBLIC";
export type ResourceSort = "recent" | "downloads" | "name";

export interface Resource {
  _id: string;
  title: string;
  description: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  category: ResourceCategory;
  tags: string[];
  uploadedBy: Pick<User, "_id" | "fullName" | "rollNumber" | "profilePicture">;
  communityId: { _id: string; name: string; slug: string };
  downloadCount: number;
  visibility: ResourceVisibility;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResources {
  items: Resource[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ResourceFormData {
  title: string;
  description: string;
  category: ResourceCategory;
  tags: string[];
  visibility: ResourceVisibility;
}
