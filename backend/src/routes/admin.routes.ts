import { Router } from "express";
import { adminController } from "../controllers/admin.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import { requireAdmin, requireModeratorOrAdmin } from "../middlewares/admin-guard.middleware.js";
import { enforceAdminProtection, studentPrivacyGuard } from "../middlewares/admin-self-protect.middleware.js";
import { auditLogger } from "../middlewares/audit.middleware.js";
import { apiLimiter } from "../middlewares/rate-limit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  listUsersSchema,
  userIdParamsSchema,
  listCommunitiesSchema,
  communityIdParamsSchema,
  listResourcesSchema,
  resourceIdParamsSchema,
  messageIdParamsSchema,
  listReportsSchema,
  reviewReportSchema
} from "../validators/admin.validator.js";

export const adminRouter = Router();

// Base administrative middleware pipeline:
// 1. JWT authentication verification & active account status check
// 2. Rate limiting protection
adminRouter.use(authenticateToken);
adminRouter.use(apiLimiter);

// ── Dashboard Overview (Admin & Moderator Clearance) ─────────────────────────
adminRouter.get(
  "/dashboard",
  requireModeratorOrAdmin,
  asyncHandler(adminController.dashboard)
);

// ── User Governance (Strict Administrator Clearance + Self/Peer Protection) ──
adminRouter.get(
  "/users",
  requireAdmin,
  validate(listUsersSchema),
  asyncHandler(adminController.listUsers)
);

adminRouter.get(
  "/users/:userId",
  requireAdmin,
  validate(userIdParamsSchema),
  asyncHandler(adminController.getUser)
);

adminRouter.patch(
  "/users/:userId/ban",
  requireAdmin,
  validate(userIdParamsSchema),
  enforceAdminProtection,
  auditLogger("BAN_USER", { targetType: "User" }),
  asyncHandler(adminController.banUser)
);

adminRouter.patch(
  "/users/:userId/unban",
  requireAdmin,
  validate(userIdParamsSchema),
  enforceAdminProtection,
  auditLogger("UNBAN_USER", { targetType: "User" }),
  asyncHandler(adminController.unbanUser)
);

adminRouter.patch(
  "/users/:userId/activate",
  requireAdmin,
  validate(userIdParamsSchema),
  enforceAdminProtection,
  auditLogger("ACTIVATE_USER", { targetType: "User" }),
  asyncHandler(adminController.activateUser)
);

adminRouter.patch(
  "/users/:userId/suspend",
  requireAdmin,
  validate(userIdParamsSchema),
  enforceAdminProtection,
  auditLogger("SUSPEND_USER", { targetType: "User" }),
  asyncHandler(adminController.suspendUser)
);

adminRouter.delete(
  "/users/:userId",
  requireAdmin,
  validate(userIdParamsSchema),
  enforceAdminProtection,
  auditLogger("DELETE_USER", { targetType: "User" }),
  asyncHandler(adminController.deleteUser)
);

// ── Community Governance ─────────────────────────────────────────────────────
adminRouter.get(
  "/communities",
  requireAdmin,
  validate(listCommunitiesSchema),
  asyncHandler(adminController.listCommunities)
);

adminRouter.delete(
  "/communities/:communityId",
  requireAdmin,
  validate(communityIdParamsSchema),
  auditLogger("DELETE_COMMUNITY", { targetType: "Community" }),
  asyncHandler(adminController.deleteCommunity)
);

// ── Resource Moderation (Admin & Moderator Clearance) ────────────────────────
adminRouter.get(
  "/resources",
  requireModeratorOrAdmin,
  validate(listResourcesSchema),
  asyncHandler(adminController.listResources)
);

adminRouter.delete(
  "/resources/:resourceId",
  requireAdmin,
  validate(resourceIdParamsSchema),
  auditLogger("DELETE_RESOURCE", { targetType: "Resource" }),
  asyncHandler(adminController.deleteResource)
);

// ── Report Triage & Moderation Queue (Admin & Moderator Clearance) ───────────
adminRouter.get(
  "/reports",
  requireModeratorOrAdmin,
  validate(listReportsSchema),
  asyncHandler(adminController.listReports)
);

adminRouter.patch(
  "/reports/:reportId",
  requireModeratorOrAdmin,
  validate(reviewReportSchema),
  auditLogger("REVIEW_REPORT", { targetType: "Report" }),
  asyncHandler(adminController.reviewReport)
);

// ── Message Moderation & Privacy Protections ─────────────────────────────────
adminRouter.delete(
  "/messages/:messageId",
  requireAdmin,
  validate(messageIdParamsSchema),
  auditLogger("DELETE_MESSAGE", { targetType: "Message" }),
  asyncHandler(adminController.deleteMessage)
);

// Direct message purge protected by studentPrivacyGuard (requires active report ID)
adminRouter.delete(
  "/direct-messages/:messageId",
  requireAdmin,
  studentPrivacyGuard,
  validate(messageIdParamsSchema),
  auditLogger("DELETE_DIRECT_MESSAGE", { targetType: "DirectMessage" }),
  asyncHandler(adminController.deleteDirectMessage)
);
