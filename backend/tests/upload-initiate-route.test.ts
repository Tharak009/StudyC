import { describe, expect, it, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import * as tokenUtils from "../src/utils/tokens.js";
import { userRepository } from "../src/repositories/user.repository.js";
import { communityRepository } from "../src/repositories/community.repository.js";
import { communityMemberRepository } from "../src/repositories/community-member.repository.js";
import { UploadSession } from "../src/models/upload-session.model.js";
import { USER_STATUS } from "../src/constants/user-status.js";
import { ROLES } from "../src/constants/roles.js";

describe("Upload Initiation Route & Authorization Regression Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const validPayload = {
    fileName: "lecture-notes.pdf",
    fileSize: 1048576,
    mimeType: "application/pdf",
    totalParts: 1,
    title: "Lecture Notes",
    description: "Unit 1 notes",
    category: "NOTES",
    visibility: "PUBLIC",
    tags: ["math"]
  };

  it("1. Existing slug & active member: returns 201 Created and initiates session", async () => {
    vi.spyOn(tokenUtils, "verifyAccessToken").mockReturnValue({
      sub: "507f1f77bcf86cd799439011",
      role: ROLES.STUDENT,
      type: "access"
    } as any);

    vi.spyOn(userRepository, "findById").mockResolvedValue({
      id: "507f1f77bcf86cd799439011",
      email: "student@college.edu",
      role: ROLES.STUDENT,
      status: USER_STATUS.ACTIVE,
      fullName: "Verified Student"
    } as any);

    vi.spyOn(communityRepository, "findBySlug").mockImplementation(async (slug) => {
      if (slug === "cs-2026-batch-hub") {
        return { _id: { toString: () => "607f1f77bcf86cd799439022" } } as any;
      }
      return null;
    });

    vi.spyOn(communityMemberRepository, "findMembership").mockResolvedValue({
      status: "ACTIVE",
      role: "MEMBER"
    } as any);

    vi.spyOn(UploadSession, "create").mockResolvedValue({
      _id: { toString: () => "707f1f77bcf86cd799439033" },
      s3Key: "uploads/607f1f77bcf86cd799439022/test_lecture-notes.pdf",
      uploadId: "mock-upload-id-123",
      totalParts: 1
    } as any);

    const res = await request(app)
      .post("/api/communities/cs-2026-batch-hub/resources/upload/initiate")
      .set("Authorization", "Bearer valid-token")
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("sessionId");
    expect(res.body.data.sessionId).toBe("707f1f77bcf86cd799439033");
  });

  it("2. Unknown slug: returns 404 Not Found with COMMUNITY_NOT_FOUND error code", async () => {
    vi.spyOn(tokenUtils, "verifyAccessToken").mockReturnValue({
      sub: "507f1f77bcf86cd799439011",
      role: ROLES.STUDENT,
      type: "access"
    } as any);

    vi.spyOn(userRepository, "findById").mockResolvedValue({
      id: "507f1f77bcf86cd799439011",
      email: "student@college.edu",
      role: ROLES.STUDENT,
      status: USER_STATUS.ACTIVE,
      fullName: "Verified Student"
    } as any);

    vi.spyOn(communityRepository, "findBySlug").mockResolvedValue(null);

    const res = await request(app)
      .post("/api/communities/non-existent-community-slug/resources/upload/initiate")
      .set("Authorization", "Bearer valid-token")
      .send(validPayload);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe("COMMUNITY_NOT_FOUND");
    expect(res.body.message).toBe("Community not found");
  });

  it("3. Non-member user: returns 403 Forbidden with RESOURCE_MEMBERSHIP_REQUIRED error code", async () => {
    vi.spyOn(tokenUtils, "verifyAccessToken").mockReturnValue({
      sub: "507f1f77bcf86cd799439099",
      role: ROLES.STUDENT,
      type: "access"
    } as any);

    vi.spyOn(userRepository, "findById").mockResolvedValue({
      id: "507f1f77bcf86cd799439099",
      email: "nonmember@college.edu",
      role: ROLES.STUDENT,
      status: USER_STATUS.ACTIVE,
      fullName: "Non-Member Student"
    } as any);

    vi.spyOn(communityRepository, "findBySlug").mockImplementation(async (slug) => {
      if (slug === "cs-2026-batch-hub") {
        return { _id: { toString: () => "607f1f77bcf86cd799439022" } } as any;
      }
      return null;
    });

    // User is NOT a member of this community
    vi.spyOn(communityMemberRepository, "findMembership").mockResolvedValue(null);

    const res = await request(app)
      .post("/api/communities/cs-2026-batch-hub/resources/upload/initiate")
      .set("Authorization", "Bearer valid-token")
      .send(validPayload);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe("RESOURCE_MEMBERSHIP_REQUIRED");
    expect(res.body.message).toBe("Active community membership is required");
  });

  it("4. Unauthenticated request: returns 401 Unauthorized with AUTH_REQUIRED error code", async () => {
    const res = await request(app)
      .post("/api/communities/cs-2026-batch-hub/resources/upload/initiate")
      .send(validPayload);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe("AUTH_REQUIRED");
  });
});
