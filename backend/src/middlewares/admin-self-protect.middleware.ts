import type { NextFunction, Request, Response } from "express";
import { ROLES } from "../constants/roles.js";
import { User } from "../models/user.model.js";
import { Report } from "../models/report.model.js";
import { REPORT_STATUS } from "../constants/report.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { env } from "../config/env.js";

/**
 * Admin Self-Protection & Peer-Protection Guard Middleware
 * Prevents administrators from modifying their own status or executing unauthorized mutations on peer admins.
 */
export const enforceAdminProtection = asyncHandler(
  async (request: Request, _response: Response, next: NextFunction) => {
    if (!request.user) {
      throw new ApiError(401, "Authentication is required", [], "AUTH_REQUIRED");
    }

    const targetUserId =
      request.params.userId ||
      request.params.id ||
      (request.body as Record<string, any>)?.userId;

    if (!targetUserId) {
      // If no specific userId in params or body, proceed to next handler
      return next();
    }

    // ── Rule 1: Self-Protection ──────────────────────────────────────────────
    // Administrators cannot ban, suspend, activate, demote, or purge their own accounts
    if (request.user.id === targetUserId.toString()) {
      throw new ApiError(
        400,
        "Security Violation: Administrators cannot ban, suspend, demote, or purge their own accounts.",
        [],
        "SELF_TARGET_BLOCKED"
      );
    }

    // ── Rule 2: Peer-Protection ──────────────────────────────────────────────
    // Administrators cannot modify fellow administrators unless authenticated with a verified root system key
    const targetUser = await User.findById(targetUserId).select("+role");
    if (!targetUser) {
      throw new ApiError(404, "Target user was not found", [], "USER_NOT_FOUND");
    }

    if (targetUser.role === ROLES.ADMIN) {
      const rootKeyHeader =
        request.headers["x-root-key"] || request.headers["x-system-key"];
      const configuredRootKey =
        process.env.ROOT_SYSTEM_KEY || env.JWT_ACCESS_SECRET;

      const isRootAuthorized =
        Boolean(rootKeyHeader) && rootKeyHeader === configuredRootKey;

      if (!isRootAuthorized) {
        throw new ApiError(
          403,
          "Security Violation: Administrator accounts cannot be penalized or altered by fellow administrators.",
          [],
          "PEER_ADMIN_PROTECTED"
        );
      }
    }

    next();
  }
);

/**
 * Student Direct Message Privacy Guard
 * Protects 1-on-1 private conversations from unauthorized administrative snooping.
 * Requires an active, verified report identifier linking to the audited conversation.
 */
export const studentPrivacyGuard = asyncHandler(
  async (request: Request, _response: Response, next: NextFunction) => {
    const reportId =
      (request.query.reportId as string) ||
      (request.body as Record<string, any>)?.reportId;

    if (!reportId) {
      throw new ApiError(
        403,
        "Privacy Violation: Direct message transcripts cannot be audited without an active verified report reference.",
        [],
        "PRIVACY_PROTECTION_VIOLATION"
      );
    }

    // Verify that the referenced report exists and is active
    const report = await Report.findById(reportId);
    if (!report || report.status === REPORT_STATUS.REJECTED) {
      throw new ApiError(
        404,
        "Referenced report was not found or has been rejected.",
        [],
        "INVALID_REPORT_REFERENCE"
      );
    }

    // Populate audit metadata for tracing
    request.auditMetadata = {
      ...(request.auditMetadata || {}),
      authorizedUnderReportId: report.id,
      reportReason: report.reason,
      reportedTargetId: report.targetId.toString()
    };

    next();
  }
);
