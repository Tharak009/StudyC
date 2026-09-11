import type { Role } from "../constants/roles.js";
import type { UserStatus } from "../constants/user-status.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: Role;
        department?: string;
        rollNumber?: string;
        name?: string;
        fullName?: string;
        status?: UserStatus;
      };
      auditMetadata?: Record<string, any>;
      validated?: {
        body?: unknown;
        params?: unknown;
        query?: unknown;
      };
    }
  }
}

export {};
