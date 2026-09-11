import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { AdminLog } from "../models/admin-log.model.js";

interface AuditLoggerOptions {
  targetType?: string;
  extractTargetId?: (request: Request) => string | null;
  extractDetails?: (request: Request, response: Response) => Record<string, unknown>;
}

/**
 * Sanitizes audit payload details to avoid logging passwords or raw authorization credentials
 */
const sanitizeAuditDetails = (payload: unknown): Record<string, unknown> => {
  if (!payload || typeof payload !== "object") return {};
  const copy: Record<string, unknown> = { ...(payload as Record<string, unknown>) };

  const sensitiveFields = [
    "password",
    "token",
    "accessToken",
    "refreshToken",
    "secret",
    "authorization"
  ];

  for (const field of sensitiveFields) {
    if (field in copy) {
      copy[field] = "[REDACTED]";
    }
  }

  return copy;
};

/**
 * Derives default target type from request URL parameters
 */
const deriveTargetType = (request: Request): string => {
  if (request.params.userId) return "User";
  if (request.params.communityId) return "Community";
  if (request.params.resourceId) return "Resource";
  if (request.params.reportId) return "Report";
  if (request.params.messageId) return "Message";
  if (request.originalUrl.includes("/users")) return "User";
  if (request.originalUrl.includes("/communities")) return "Community";
  if (request.originalUrl.includes("/resources")) return "Resource";
  if (request.originalUrl.includes("/reports")) return "Report";
  if (request.originalUrl.includes("/broadcast")) return "Broadcast";
  return "System";
};

/**
 * 90-Day Auto-Expiring Audit Logger Middleware
 * Intercepts successful administrative operations and records non-repudiable audit logs.
 */
export const auditLogger = (
  actionType: string,
  options: AuditLoggerOptions = {}
) => {
  return (request: Request, response: Response, next: NextFunction): void => {
    // Listen for response completion
    response.on("finish", () => {
      const adminUser = request.user;
      if (response.statusCode >= 400 || !adminUser) {
        return;
      }

      // Execute logging asynchronously to avoid blocking the client request thread
      setImmediate(async () => {
        try {
          const targetId = options.extractTargetId
            ? options.extractTargetId(request)
            : request.params.userId ||
              request.params.communityId ||
              request.params.resourceId ||
              request.params.reportId ||
              request.params.messageId ||
              (request.body as Record<string, any>)?.targetId ||
              null;

          const clientIp =
            ((request.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()) ||
            request.ip ||
            request.socket?.remoteAddress ||
            "unknown";

          const logDetails: Record<string, unknown> = {
            path: request.originalUrl,
            method: request.method,
            statusCode: response.statusCode,
            ...(request.auditMetadata || {}),
            ...(options.extractDetails ? options.extractDetails(request, response) : {}),
            ...(request.method !== "GET" && request.body
              ? { payload: sanitizeAuditDetails(request.body) }
              : {})
          };

          await AdminLog.create({
            adminId: new mongoose.Types.ObjectId(adminUser.id),
            adminName: adminUser.name || adminUser.fullName || adminUser.email,
            action: actionType,
            targetType: options.targetType || deriveTargetType(request),
            targetId: targetId ? targetId.toString() : null,
            ipAddress: clientIp,
            details: logDetails
          });
        } catch (error) {
          // Log audit failure to stderr without crashing the request pipeline
          console.error("Failed to record admin audit log:", error);
        }
      });
    });

    next();
  };
};
