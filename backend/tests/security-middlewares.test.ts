import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { authenticateToken } from "../src/middlewares/auth.middleware.js";
import { requireAdmin, requireModeratorOrAdmin } from "../src/middlewares/admin-guard.middleware.js";
import { enforceAdminProtection, studentPrivacyGuard } from "../src/middlewares/admin-self-protect.middleware.js";
import { auditLogger } from "../src/middlewares/audit.middleware.js";
import { ROLES } from "../src/constants/roles.js";
import { USER_STATUS } from "../src/constants/user-status.js";
import { ApiError } from "../src/utils/api-error.js";
import { User } from "../src/models/user.model.js";
import { Report } from "../src/models/report.model.js";
import { AdminLog } from "../src/models/admin-log.model.js";
import { userRepository } from "../src/repositories/user.repository.js";
import * as tokenUtils from "../src/utils/tokens.js";
import { EventEmitter } from "node:events";

const getFirstError = (mockFn: any): ApiError => {
  const firstCall = mockFn.mock.calls[0];
  if (!firstCall) throw new Error("Expected mock function to have been called");
  return firstCall[0] as ApiError;
};

describe("JWT Authentication & Account Status Verification (auth.middleware.ts)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("authenticateToken: throws 401 AUTH_REQUIRED when Bearer header is missing", async () => {
    const req = { headers: {} } as Request;
    const res = {} as Response;
    const next = vi.fn();

    authenticateToken(req, res, next);
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const error = getFirstError(next);
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe("AUTH_REQUIRED");
  });

  it("authenticateToken: throws 403 ACCOUNT_BANNED if user status is DEACTIVATED", async () => {
    vi.spyOn(tokenUtils, "verifyAccessToken").mockReturnValue({
      sub: "user-1",
      role: ROLES.STUDENT,
      type: "access"
    } as any);

    vi.spyOn(userRepository, "findById").mockResolvedValue({
      id: "user-1",
      status: USER_STATUS.DEACTIVATED,
      role: ROLES.STUDENT
    } as any);

    const req = { headers: { authorization: "Bearer valid-token" } } as Request;
    const res = {} as Response;
    const next = vi.fn();

    authenticateToken(req, res, next);
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const error = getFirstError(next);
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe("ACCOUNT_BANNED");
  });

  it("authenticateToken: throws 403 ACCOUNT_SUSPENDED if user status is SUSPENDED", async () => {
    vi.spyOn(tokenUtils, "verifyAccessToken").mockReturnValue({
      sub: "user-2",
      role: ROLES.STUDENT,
      type: "access"
    } as any);

    vi.spyOn(userRepository, "findById").mockResolvedValue({
      id: "user-2",
      status: USER_STATUS.SUSPENDED,
      role: ROLES.STUDENT
    } as any);

    const req = { headers: { authorization: "Bearer valid-token" } } as Request;
    const res = {} as Response;
    const next = vi.fn();

    authenticateToken(req, res, next);
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const error = getFirstError(next);
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe("ACCOUNT_SUSPENDED");
  });

  it("authenticateToken: populates req.user and calls next() for active users", async () => {
    vi.spyOn(tokenUtils, "verifyAccessToken").mockReturnValue({
      sub: "user-3",
      role: ROLES.STUDENT,
      type: "access"
    } as any);

    vi.spyOn(userRepository, "findById").mockResolvedValue({
      id: "user-3",
      email: "student3@college.edu",
      role: ROLES.STUDENT,
      status: USER_STATUS.ACTIVE,
      fullName: "Student Three",
      department: "CSE",
      rollNumber: "CS24-300"
    } as any);

    const req = { headers: { authorization: "Bearer valid-token" } } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn();

    authenticateToken(req, res, next);
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({
      id: "user-3",
      email: "student3@college.edu",
      role: ROLES.STUDENT,
      status: USER_STATUS.ACTIVE,
      name: "Student Three",
      fullName: "Student Three",
      department: "CSE",
      rollNumber: "CS24-300"
    });
  });
});

describe("Role-Based Access Control Guards (admin-guard.middleware.ts)", () => {
  it("requireAdmin: denies access if user is not authenticated", () => {
    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn();

    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const error = getFirstError(next);
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe("AUTH_REQUIRED");
  });

  it("requireAdmin: denies access if user role is STUDENT", () => {
    const req = {
      user: { id: "user-1", email: "student@college.edu", role: ROLES.STUDENT }
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn();

    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const error = getFirstError(next);
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe("ADMIN_PRIVILEGE_REQUIRED");
  });

  it("requireAdmin: allows access if user role is ADMIN", () => {
    const req = {
      user: { id: "admin-1", email: "admin@college.edu", role: ROLES.ADMIN }
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn();

    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it("requireModeratorOrAdmin: permits MODERATOR role", () => {
    const req = {
      user: { id: "mod-1", email: "mod@college.edu", role: ROLES.MODERATOR }
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn();

    requireModeratorOrAdmin(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it("requireModeratorOrAdmin: denies STUDENT role", () => {
    const req = {
      user: { id: "std-1", email: "student@college.edu", role: ROLES.STUDENT }
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn();

    requireModeratorOrAdmin(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const error = getFirstError(next);
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe("MODERATOR_PRIVILEGE_REQUIRED");
  });
});

describe("Admin Self-Protection & Peer Protection (admin-self-protect.middleware.ts)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("enforceAdminProtection: blocks administrator targeting themselves (Rule 1: Self-Protection)", async () => {
    const req = {
      user: { id: "admin-1", email: "admin@college.edu", role: ROLES.ADMIN },
      params: { userId: "admin-1" },
      body: {},
      headers: {}
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn();

    await enforceAdminProtection(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const error = getFirstError(next);
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe("SELF_TARGET_BLOCKED");
  });

  it("enforceAdminProtection: blocks modifying peer administrator accounts without root system key (Rule 2: Peer-Protection)", async () => {
    vi.spyOn(User, "findById").mockReturnValue({
      select: vi.fn().mockResolvedValue({
        id: "admin-2",
        role: ROLES.ADMIN
      })
    } as any);

    const req = {
      user: { id: "admin-1", email: "admin@college.edu", role: ROLES.ADMIN },
      params: { userId: "admin-2" },
      body: {},
      headers: {}
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn();

    enforceAdminProtection(req, res, next);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const error = getFirstError(next);
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe("PEER_ADMIN_PROTECTED");
  });

  it("enforceAdminProtection: permits administrator modifying regular student", async () => {
    vi.spyOn(User, "findById").mockReturnValue({
      select: vi.fn().mockResolvedValue({
        id: "student-1",
        role: ROLES.STUDENT
      })
    } as any);

    const req = {
      user: { id: "admin-1", email: "admin@college.edu", role: ROLES.ADMIN },
      params: { userId: "student-1" },
      body: {},
      headers: {}
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn();

    enforceAdminProtection(req, res, next);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(next).toHaveBeenCalledWith();
  });

  it("studentPrivacyGuard: rejects DM audit requests lacking a reportId", async () => {
    const req = {
      query: {},
      body: {}
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn();

    await studentPrivacyGuard(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const error = getFirstError(next);
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe("PRIVACY_PROTECTION_VIOLATION");
  });

  it("studentPrivacyGuard: permits DM audit requests with verified reportId", async () => {
    vi.spyOn(Report, "findById").mockResolvedValue({
      id: "report-123",
      status: "PENDING",
      reason: "Harassment",
      targetId: "dm-456"
    } as any);

    const req = {
      query: { reportId: "report-123" },
      body: {},
      auditMetadata: {}
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn();

    await studentPrivacyGuard(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.auditMetadata).toHaveProperty("authorizedUnderReportId", "report-123");
  });
});

describe("90-Day Auto-Expiring Audit Logger (audit.middleware.ts)", () => {
  it("records audit log upon response finish", async () => {
    const createSpy = vi.spyOn(AdminLog, "create").mockResolvedValue({} as any);

    class MockResponse extends EventEmitter {
      statusCode = 200;
    }

    const req = {
      user: { id: "507f1f77bcf86cd799439011", name: "Admin Test", email: "admin@college.edu", role: ROLES.ADMIN },
      params: { userId: "507f191e810c19729de860ea" },
      body: { reason: "Policy violation" },
      originalUrl: "/api/admin/users/507f191e810c19729de860ea/ban",
      method: "PATCH",
      headers: {},
      socket: { remoteAddress: "127.0.0.1" }
    } as unknown as Request;

    const res = new MockResponse() as unknown as Response;
    const next = vi.fn();

    const middleware = auditLogger("BAN_USER", { targetType: "User" });
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();

    // Trigger response finish
    (res as any).emit("finish");

    // Allow setImmediate callback to process
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "BAN_USER",
        targetType: "User",
        targetId: "507f191e810c19729de860ea",
        adminName: "Admin Test"
      })
    );
  });
});
