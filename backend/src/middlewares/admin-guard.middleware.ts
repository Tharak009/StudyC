import type { NextFunction, Request, Response } from "express";
import { ROLES, type Role } from "../constants/roles.js";
import { ApiError } from "../utils/api-error.js";

/**
 * Require Administrator Privileges Guard
 * Enforces that req.user is populated and has role === 'ADMIN'.
 */
export const requireAdmin = (
  request: Request,
  _response: Response,
  next: NextFunction
): void => {
  if (!request.user) {
    next(new ApiError(401, "Authentication is required", [], "AUTH_REQUIRED"));
    return;
  }

  if (request.user.role !== ROLES.ADMIN) {
    next(
      new ApiError(
        403,
        "Only administrators can perform this action.",
        [],
        "ADMIN_PRIVILEGE_REQUIRED"
      )
    );
    return;
  }

  next();
};

/**
 * Require Moderator or Administrator Privileges Guard
 * Permits users with role in ['ADMIN', 'MODERATOR'] (e.g. for report triage and resource approval).
 */
export const requireModeratorOrAdmin = (
  request: Request,
  _response: Response,
  next: NextFunction
): void => {
  if (!request.user) {
    next(new ApiError(401, "Authentication is required", [], "AUTH_REQUIRED"));
    return;
  }

  const allowedRoles: Role[] = [ROLES.ADMIN, ROLES.MODERATOR];
  if (!allowedRoles.includes(request.user.role)) {
    next(
      new ApiError(
        403,
        "Administrative or moderator privileges required.",
        [],
        "MODERATOR_PRIVILEGE_REQUIRED"
      )
    );
    return;
  }

  next();
};

/**
 * Generic Parametric Role Guard
 */
export const requireRoles = (...roles: Role[]) => (
  request: Request,
  _response: Response,
  next: NextFunction
): void => {
  if (!request.user) {
    next(new ApiError(401, "Authentication is required", [], "AUTH_REQUIRED"));
    return;
  }

  if (!roles.includes(request.user.role)) {
    next(
      new ApiError(
        403,
        "You do not possess the required clearance level for this action.",
        [],
        "ROLE_CLEARANCE_REQUIRED"
      )
    );
    return;
  }

  next();
};
