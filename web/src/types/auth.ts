export type Role = "STUDENT" | "ADMIN" | "COMMUNITY_ADMIN" | "MODERATOR";
export type UserStatus = "ACTIVE" | "SUSPENDED" | "DEACTIVATED";

export interface User {
  _id: string;
  fullName: string;
  rollNumber: string;
  department: string;
  academicYear: number;
  email: string;
  profilePicture?: string;
  bio: string;
  interests: string[];
  role: Role;
  status: UserStatus;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResult {
  user: User;
  accessToken: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface ApiErrorBody {
  success: false;
  message: string;
  code: string;
  errors?: Array<{ field: string; message: string }>;
}
