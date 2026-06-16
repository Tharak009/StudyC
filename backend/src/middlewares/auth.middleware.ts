import type { NextFunction, Request, Response } from "express";
import { USER_STATUS } from "../constants/user-status.js";
import { userRepository } from "../repositories/user.repository.js";
import { ApiError } from "../utils/api-error.js";
import { verifyAccessToken } from "../utils/tokens.js";
import { asyncHandler } from "../utils/async-handler.js";

export const authenticate = asyncHandler(
  async (request: Request, _response: Response, next: NextFunction) => {
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      throw new ApiError(401, "Authentication is required", [], "AUTH_REQUIRED");
    }

    try {
      const payload = verifyAccessToken(authorization.slice(7));
      if (payload.type !== "access") throw new Error("Wrong token type");

      const user = await userRepository.findById(payload.sub);
      if (!user || user.status !== USER_STATUS.ACTIVE) {
        throw new ApiError(401, "User is unavailable", [], "USER_UNAVAILABLE");
      }
      if (
        user.passwordChangedAt &&
        payload.iat &&
        user.passwordChangedAt.getTime() / 1000 > payload.iat
      ) {
        throw new ApiError(401, "Password changed after this token was issued", [], "TOKEN_STALE");
      }

      request.user = { id: user.id, role: user.role };
      next();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(401, "Access token is invalid or expired", [], "INVALID_ACCESS_TOKEN");
    }
  }
);
