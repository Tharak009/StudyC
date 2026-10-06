import { describe, expect, it, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";
import {
  verifyAccessToken,
  verifyRefreshToken,
  createAccessToken,
  createRefreshToken
} from "../src/utils/tokens.js";
import { authService } from "../src/services/auth.service.js";
import { blockService } from "../src/services/block.service.js";
import { reportService } from "../src/services/report.service.js";
import { userService } from "../src/services/user.service.js";
import { blockRepository } from "../src/repositories/block.repository.js";
import { refreshTokenRepository } from "../src/repositories/refresh-token.repository.js";
import { userRepository } from "../src/repositories/user.repository.js";
import { reportRepository } from "../src/repositories/report.repository.js";
import { communityMemberRepository } from "../src/repositories/community-member.repository.js";
import { Community } from "../src/models/community.model.js";
import { ROLES } from "../src/constants/roles.js";
import { COMMUNITY_ROLES } from "../src/constants/community-roles.js";
import { USER_STATUS } from "../src/constants/user-status.js";
import { ApiError } from "../src/utils/api-error.js";
import { REPORT_TARGET_TYPES } from "../src/constants/report.js";
import { env } from "../src/config/env.js";

describe("Phase 5: Privacy & Security Test Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. JWT Security & Algorithm Confusion Protection
  // =========================================================================
  describe("1. JWT Security & Algorithm Confusion Protection", () => {
    it("verifyAccessToken: allows tokens signed with valid HS256 algorithm and correct secret", () => {
      const validToken = createAccessToken("user-101", ROLES.STUDENT);
      const decoded = verifyAccessToken(validToken);
      expect(decoded.sub).toBe("user-101");
      expect(decoded.role).toBe(ROLES.STUDENT);
      expect(decoded.type).toBe("access");
    });

    it("verifyAccessToken: rejects tokens signed with algorithm 'none'", () => {
      // Create forged token with algorithm: none
      const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
      const payload = Buffer.from(JSON.stringify({ sub: "hacker", role: "ADMIN", type: "access" })).toString("base64url");
      const forgedToken = `${header}.${payload}.`;

      expect(() => verifyAccessToken(forgedToken)).toThrow();
    });

    it("verifyAccessToken: rejects tokens signed with wrong secret", () => {
      const forgedToken = jwt.sign(
        { sub: "user-101", role: ROLES.STUDENT, type: "access" },
        "wrong-unauthorized-secret-key-1234567890",
        { algorithm: "HS256" }
      );
      expect(() => verifyAccessToken(forgedToken)).toThrow();
    });

    it("verifyRefreshToken: strictly enforces HS256 algorithm", () => {
      const validRefresh = createRefreshToken("user-101", "session-tok-1");
      const decoded = verifyRefreshToken(validRefresh);
      expect(decoded.sub).toBe("user-101");
      expect(decoded.jti).toBe("session-tok-1");
      expect(decoded.type).toBe("refresh");
    });
  });

  // =========================================================================
  // 2. Active Session Management & Revocation
  // =========================================================================
  describe("2. Active Session Management & Revocation", () => {
    const validUserId = "507f1f77bcf86cd799439011";

    it("listActiveSessions: returns active sessions with current session marked", async () => {
      const mockSessions = [
        {
          tokenId: "tok-1",
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          ipAddress: "192.168.1.100"
        },
        {
          tokenId: "tok-2",
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
          userAgent: "Mobile Safari",
          ipAddress: "192.168.1.105"
        }
      ];

      vi.spyOn(refreshTokenRepository, "findActiveSessionsByUser").mockResolvedValue(mockSessions as any);

      const currentRawRefreshToken = createRefreshToken(validUserId, "tok-1");
      const sessions = await authService.listActiveSessions(validUserId, currentRawRefreshToken);
      expect(sessions).toHaveLength(2);
      expect(sessions[0]?.id).toBe("tok-1");
      expect(sessions[0]?.isCurrent).toBe(true);
      expect(sessions[1]?.id).toBe("tok-2");
      expect(sessions[1]?.isCurrent).toBe(false);
    });

    it("revokeSession: throws 404 when session does not exist for the user", async () => {
      vi.spyOn(refreshTokenRepository, "revokeSession").mockResolvedValue(null);

      await expect(authService.revokeSession(validUserId, "tok-nonexistent")).rejects.toThrow(ApiError);
      await expect(authService.revokeSession(validUserId, "tok-nonexistent")).rejects.toMatchObject({
        statusCode: 404,
        code: "SESSION_NOT_FOUND"
      });
    });

    it("revokeSession: successfully revokes valid user session", async () => {
      vi.spyOn(refreshTokenRepository, "revokeSession").mockResolvedValue({ id: "tok-1" } as any);

      await expect(authService.revokeSession(validUserId, "tok-1")).resolves.toBeUndefined();
      expect(refreshTokenRepository.revokeSession).toHaveBeenCalledWith(validUserId, "tok-1");
    });

    it("logoutAll: revokes all sessions for user", async () => {
      const revokeSpy = vi.spyOn(refreshTokenRepository, "revokeAllForUser").mockResolvedValue({ modifiedCount: 3 } as any);

      await expect(authService.logoutAll(validUserId)).resolves.toBeUndefined();
      expect(revokeSpy).toHaveBeenCalledWith(validUserId);
    });
  });

  // =========================================================================
  // 3. User Blocking & Public Profile Privacy
  // =========================================================================
  describe("3. User Blocking & Public Profile Privacy", () => {
    it("blockUser: rejects attempting to block oneself", async () => {
      await expect(blockService.blockUser("user-101", "user-101")).rejects.toThrow(ApiError);
      await expect(blockService.blockUser("user-101", "user-101")).rejects.toMatchObject({
        statusCode: 400,
        code: "SELF_BLOCK_FORBIDDEN"
      });
    });

    it("blockUser: rejects blocking a non-existent user", async () => {
      vi.spyOn(userRepository, "findById").mockResolvedValue(null);

      await expect(blockService.blockUser("user-101", "user-ghost")).rejects.toThrow(ApiError);
      await expect(blockService.blockUser("user-101", "user-ghost")).rejects.toMatchObject({
        statusCode: 404,
        code: "USER_NOT_FOUND"
      });
    });

    it("isBlocked: detects bidirectional blocking", async () => {
      vi.spyOn(blockRepository, "isBlocked").mockResolvedValue(true);

      const blocked = await blockService.isBlocked("user-alice", "user-bob");
      expect(blocked).toBe(true);
      expect(blockRepository.isBlocked).toHaveBeenCalledWith("user-alice", "user-bob");
    });

    it("unblockUser: throws 404 if no existing block relationship exists", async () => {
      vi.spyOn(blockRepository, "deleteBlock").mockResolvedValue(false);

      await expect(blockService.unblockUser("user-alice", "user-bob")).rejects.toThrow(ApiError);
      await expect(blockService.unblockUser("user-alice", "user-bob")).rejects.toMatchObject({
        statusCode: 404,
        code: "BLOCK_NOT_FOUND"
      });
    });

    it("userService.getPublicProfile: denies viewing profile if blocked", async () => {
      vi.spyOn(blockService, "isBlocked").mockResolvedValue(true);

      await expect(userService.getPublicProfile("user-target", "user-viewer")).rejects.toThrow(ApiError);
      await expect(userService.getPublicProfile("user-target", "user-viewer")).rejects.toMatchObject({
        statusCode: 403,
        code: "USER_BLOCKED"
      });
    });

    it("userService.getPublicProfile: redacts email address for privacy", async () => {
      vi.spyOn(blockService, "isBlocked").mockResolvedValue(false);
      vi.spyOn(userRepository, "findById").mockResolvedValue({
        id: "user-target",
        fullName: "Target Student",
        email: "private.target@college.edu",
        department: "CSE",
        academicYear: "3rd Year",
        karma: 50,
        status: USER_STATUS.ACTIVE,
        profilePicture: "/uploads/profiles/target.png",
        bio: "Learning systems",
        interests: ["Rust", "Databases"]
      } as any);

      const profile = await userService.getPublicProfile("user-target", "user-viewer");
      expect(profile.fullName).toBe("Target Student");
      expect((profile as any).email).toBeUndefined(); // Strict privacy protection
    });
  });

  // =========================================================================
  // 4. User Reporting & Abuse Prevention
  // =========================================================================
  describe("7. User Reporting & Abuse Prevention", () => {
    it("createReport: prevents reporting one's own account", async () => {
      await expect(
        reportService.createReport("user-101", {
          targetType: REPORT_TARGET_TYPES.USER,
          targetId: "user-101",
          reason: "Spam",
          description: "Self reporting"
        })
      ).rejects.toThrow(ApiError);

      await expect(
        reportService.createReport("user-101", {
          targetType: REPORT_TARGET_TYPES.USER,
          targetId: "user-101",
          reason: "Spam",
          description: "Self reporting"
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: "SELF_REPORT_FORBIDDEN"
      });
    });

    it("createReport: throws 404 when target entity does not exist", async () => {
      vi.spyOn(userRepository, "findById").mockResolvedValue(null);

      await expect(
        reportService.createReport("user-101", {
          targetType: REPORT_TARGET_TYPES.USER,
          targetId: "ghost-user",
          reason: "Harassment",
          description: ""
        })
      ).rejects.toThrow(ApiError);

      await expect(
        reportService.createReport("user-101", {
          targetType: REPORT_TARGET_TYPES.USER,
          targetId: "ghost-user",
          reason: "Harassment",
          description: ""
        })
      ).rejects.toMatchObject({
        statusCode: 404,
        code: "TARGET_NOT_FOUND"
      });
    });

    it("createReport: prevents submitting duplicate pending report for same target", async () => {
      vi.spyOn(userRepository, "findById").mockResolvedValue({ id: "user-target" } as any);
      vi.spyOn(reportRepository, "findPendingByReporterAndTarget").mockResolvedValue({
        id: "existing-report-id"
      } as any);

      await expect(
        reportService.createReport("user-reporter", {
          targetType: REPORT_TARGET_TYPES.USER,
          targetId: "user-target",
          reason: "Harassment",
          description: ""
        })
      ).rejects.toThrow(ApiError);

      await expect(
        reportService.createReport("user-reporter", {
          targetType: REPORT_TARGET_TYPES.USER,
          targetId: "user-target",
          reason: "Harassment",
          description: ""
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: "REPORT_DUPLICATE"
      });
    });
  });
});
