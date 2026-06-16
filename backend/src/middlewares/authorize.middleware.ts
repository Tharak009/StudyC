import type { NextFunction, Request, Response } from "express";
import type { Role } from "../constants/roles.js";
import { ApiError } from "../utils/api-error.js";

export const authorize = (...allowedRoles: Role[]) => (
  request: Request,
  _response: Response,
  next: NextFunction
): void => {
  if (!request.user || !allowedRoles.includes(request.user.role)) {
    next(new ApiError(403, "You do not have permission for this action", [], "FORBIDDEN"));
    return;
  }
  next();
};
