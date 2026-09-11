import type { NextFunction, Request, Response } from "express";
import { USER_STATUS } from "../constants/user-status.js";
import { userRepository } from "../repositories/user.repository.js";
import { ApiError } from "../utils/api-error.js";
import { verifyAccessToken } from "../utils/tokens.js";
import { asyncHandler } from "../utils/async-handler.js";

/**
 * JWT Authentication Middleware
 * Validates Bearer tokens, ensures active account status, and attaches authenticated user context.
 */
export const authenticateToken = asyncHandler(
  async (request: Request, _response: Response, next: NextFunction) => {
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      throw new ApiError(401, "Authentication token is required", [], "AUTH_REQUIRED");
    }

    try {
      const token = authorization.slice(7).trim();
      const payload = verifyAccessToken(token);
      if (payload.type !== "access") {
        throw new ApiError(401, "Invalid token type provided", [], "INVALID_TOKEN_TYPE");
      }

      const user = await userRepository.findById(payload.sub);
      if (!user) {
        throw new ApiError(401, "User associated with token not found", [], "USER_NOT_FOUND");
      }

      // Check account status against bans and suspensions
      if (user.status === USER_STATUS.DEACTIVATED) {
        throw new ApiError(
          403,
          "Account has been deactivated or banned by campus administration.",
          [],
          "ACCOUNT_BANNED"
        );
      }

      if (user.status === USER_STATUS.SUSPENDED) {
        throw new ApiError(
          403,
          "Account is currently suspended by campus administration.",
          [],
          "ACCOUNT_SUSPENDED"
        );
      }

      if (user.status !== USER_STATUS.ACTIVE) {
        throw new ApiError(403, "Account is currently unavailable.", [], "ACCOUNT_UNAVAILABLE");
      }

      // Invalidate tokens issued prior to password modification
      if (
        user.passwordChangedAt &&
        payload.iat &&
        user.passwordChangedAt.getTime() / 1000 > payload.iat
      ) {
        throw new ApiError(
          401,
          "Password changed after this token was issued. Please re-authenticate.",
          [],
          "TOKEN_STALE"
        );
      }

      // Attach sanitized user context to Express Request
      request.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        department: user.department,
        rollNumber: user.rollNumber,
        name: user.fullName,
        fullName: user.fullName,
        status: user.status
      };

      next();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(401, "Access token is invalid or expired", [], "INVALID_ACCESS_TOKEN");
    }
  }
);

// Backward-compatible alias for existing route definitions
export const authenticate = authenticateToken;
