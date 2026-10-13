import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { app } from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { User } from "../src/models/user.model.js";
import { runSeed } from "../src/scripts/seed.js";
import { USER_STATUS } from "../src/constants/user-status.js";
import { createOpaqueToken, hashToken } from "../src/utils/tokens.js";

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create({
    instance: { launchTimeout: 120000 }
  });
  await connectDatabase(mongo.getUri());
  // Execute non-destructive seed in mongo memory server database
  await runSeed();
}, 180000);

afterAll(async () => {
  await disconnectDatabase();
  if (mongo) {
    await mongo.stop();
  }
});

describe("Auth Restoration & Credential Security Suite", () => {
  it("authenticates root admin credentials successfully", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@campus.edu", password: "Admin@2026!" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe("admin@campus.edu");
    expect(res.body.data.accessToken).toEqual(expect.any(String));
  });

  it("authenticates verified student credentials successfully", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "aarav.patel@campus.edu", password: "Student@2026!" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe("aarav.patel@campus.edu");
    expect(res.body.data.accessToken).toEqual(expect.any(String));
  });

  it("rejects authentication with incorrect password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "aarav.patel@campus.edu", password: "WrongPassword123!" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("rejects authentication for non-existent email address", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nonexistent@campus.edu", password: "Student@2026!" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("rejects authentication when user status is suspended or deactivated", async () => {
    await User.updateOne(
      { email: "rohan.gupta@campus.edu" },
      { status: USER_STATUS.SUSPENDED }
    );

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "rohan.gupta@campus.edu", password: "Student@2026!" });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);

    // Restore active status
    await User.updateOne(
      { email: "rohan.gupta@campus.edu" },
      { status: USER_STATUS.ACTIVE }
    );
  });

  it("allows non-destructive seed re-runs without wiping registered accounts", async () => {
    // Manually register a custom student user in DB
    const customStudent = await User.create({
      fullName: "New Custom User",
      rollNumber: "24BCSE999",
      department: "CSE",
      academicYear: 1,
      email: "custom.user@campus.edu",
      password: "CustomPassword@2026!",
      role: "STUDENT",
      status: USER_STATUS.ACTIVE
    });

    expect(customStudent._id).toBeDefined();

    // Re-run seed
    await runSeed();

    // Verify custom user still exists and can log in successfully
    const customLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "custom.user@campus.edu", password: "CustomPassword@2026!" });

    expect(customLogin.status).toBe(200);
    expect(customLogin.body.data.user.email).toBe("custom.user@campus.edu");
  });

  it("supports password reset flow via forgot password and reset token", async () => {
    const forgotRes = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "meera.nair@campus.edu" });

    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.success).toBe(true);

    // Generate valid opaque token and save token hash on user model for reset test
    const resetToken = createOpaqueToken();
    const user = await User.findOne({ email: "meera.nair@campus.edu" });
    expect(user).toBeDefined();
    if (user) {
      user.passwordResetTokenHash = hashToken(resetToken);
      user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
      await user.save({ validateBeforeSave: false });
    }

    const resetRes = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: resetToken, newPassword: "NewMeeraPassword@2026!" });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    // Verify login with new password
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "meera.nair@campus.edu", password: "NewMeeraPassword@2026!" });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.email).toBe("meera.nair@campus.edu");
  });
});
