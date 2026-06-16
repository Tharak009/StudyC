import { createServer, type Server as HttpServer } from "node:http";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { AdminLog } from "../src/models/admin-log.model.js";
import { Community } from "../src/models/community.model.js";
import { CommunityMember } from "../src/models/community-member.model.js";
import { Notification } from "../src/models/notification.model.js";
import { Report } from "../src/models/report.model.js";
import { Resource } from "../src/models/resource.model.js";
import { User } from "../src/models/user.model.js";
import { ROLES } from "../src/constants/roles.js";

let mongo: MongoMemoryServer;
let server: HttpServer;
let baseURL: string;

const adminData = {
  fullName: "Admin User",
  rollNumber: "ADMIN-001",
  department: "Administration",
  academicYear: 4,
  email: "admin@college.edu",
  password: "SecurePass1"
};

const userData = {
  fullName: "Regular User",
  rollNumber: "CS24-200",
  department: "Computer Science",
  academicYear: 2,
  email: "user@college.edu",
  password: "SecurePass1"
};

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDatabase(mongo.getUri());
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (address && typeof address === "object") {
    baseURL = `http://127.0.0.1:${address.port}`;
  }
}, 30_000);

afterEach(async () => {
  await Promise.all([
    AdminLog.deleteMany({}),
    Community.deleteMany({}),
    CommunityMember.deleteMany({}),
    Notification.deleteMany({}),
    Report.deleteMany({}),
    Resource.deleteMany({}),
    User.deleteMany({})
  ]);
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await disconnectDatabase();
  await mongo.stop();
});

const createAdmin = async () => {
  const res = await request(app).post("/api/auth/register").send(adminData).expect(201);
  const userId = res.body.data.user._id as string;
  await User.findByIdAndUpdate(userId, { role: ROLES.ADMIN }).exec();
  return {
    token: res.body.data.accessToken as string,
    userId
  };
};

const createUser = async () => {
  const res = await request(app).post("/api/auth/register").send(userData).expect(201);
  return {
    token: res.body.data.accessToken as string,
    userId: res.body.data.user._id as string
  };
};

describe("Admin API", () => {
  it("GET /api/admin/dashboard - returns stats", async () => {
    const { token } = await createAdmin();
    const res = await request(app)
      .get("/api/admin/dashboard")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.userCount).toBeGreaterThanOrEqual(1);
    expect(res.body.data).toHaveProperty("communityCount");
    expect(res.body.data).toHaveProperty("resourceCount");
    expect(res.body.data).toHaveProperty("reportCount");
    expect(res.body.data).toHaveProperty("activeUsers");
    expect(res.body.data).toHaveProperty("recentActivity");
  });

  it("GET /api/admin/users - lists users", async () => {
    const { token } = await createAdmin();
    const res = await request(app)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data).toHaveProperty("total");
    expect(res.body.data).toHaveProperty("pages");
  });

  it("forbids non-admin users", async () => {
    const { token } = await createUser();
    await request(app)
      .get("/api/admin/dashboard")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
  });

  it("requires authentication", async () => {
    await request(app).get("/api/admin/dashboard").expect(401);
  });

  it("PATCH /api/admin/users/:userId/ban - bans a user", async () => {
    const { token: adminToken } = await createAdmin();
    const { userId } = await createUser();
    const res = await request(app)
      .patch(`/api/admin/users/${userId}/ban`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data.status).toBe("DEACTIVATED");
  });

  it("PATCH /api/admin/users/:userId/suspend - suspends a user", async () => {
    const { token: adminToken } = await createAdmin();
    const { userId } = await createUser();
    const res = await request(app)
      .patch(`/api/admin/users/${userId}/suspend`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data.status).toBe("SUSPENDED");
  });

  it("PATCH /api/admin/users/:userId/unban - unbans a user", async () => {
    const { token: adminToken } = await createAdmin();
    const { userId } = await createUser();
    await User.findByIdAndUpdate(userId, { status: "DEACTIVATED" }).exec();
    const res = await request(app)
      .patch(`/api/admin/users/${userId}/unban`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data.status).toBe("ACTIVE");
  });

  it("DELETE /api/admin/users/:userId - deletes user and related data", async () => {
    const { token: adminToken } = await createAdmin();
    const { userId } = await createUser();
    await request(app)
      .delete(`/api/admin/users/${userId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    const user = await User.findById(userId).exec();
    expect(user).toBeNull();
  });

  it("GET /api/admin/users - searches users", async () => {
    const { token } = await createAdmin();
    await createUser();
    const res = await request(app)
      .get("/api/admin/users?search=Regular")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Report System", () => {
  it("creates a report via admin service", async () => {
    const admin = await createAdmin();
    const report = await (await import("../src/services/admin.service.js")).adminService.createReport({
      reporterId: admin.userId,
      targetType: "USER",
      targetId: admin.userId,
      reason: "Spam",
      description: "This user is spamming"
    });
    expect(report).toBeDefined();
    expect(report.status).toBe("PENDING");
  });

  it("lists reports via admin API", async () => {
    const { token, userId } = await createAdmin();
    const { adminService } = await import("../src/services/admin.service.js");
    await adminService.createReport({
      reporterId: userId, targetType: "USER", targetId: userId, reason: "Test"
    });
    const res = await request(app)
      .get("/api/admin/reports")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.items.length).toBe(1);
  });

  it("reviews a report", async () => {
    const { token, userId } = await createAdmin();
    const { adminService } = await import("../src/services/admin.service.js");
    const report = await adminService.createReport({
      reporterId: userId, targetType: "USER", targetId: userId, reason: "Test"
    });
    const res = await request(app)
      .patch(`/api/admin/reports/${report.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "RESOLVED" })
      .expect(200);
    expect(res.body.data.status).toBe("RESOLVED");
  });
});
