import { createServer, type Server as HttpServer } from "node:http";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { User } from "../src/models/user.model.js";
import { Community } from "../src/models/community.model.js";
import { CommunityMember } from "../src/models/community-member.model.js";
import { Block } from "../src/models/block.model.js";
import {
  toStreamDmChannelId,
  toStreamCommunityChannelId,
  parseStreamDmChannelId
} from "../src/utils/stream-id.js";

let mongo: MongoMemoryServer;
let server: HttpServer;

const userAData = {
  fullName: "Aarav Singh",
  rollNumber: "CS24-101",
  department: "Computer Science",
  academicYear: 2,
  email: "aarav@college.edu",
  password: "SecurePassword123!"
};

const userBData = {
  fullName: "Meera Patel",
  rollNumber: "CS24-102",
  department: "Computer Science",
  academicYear: 2,
  email: "meera@college.edu",
  password: "SecurePassword123!"
};

beforeAll(async () => {
  mongo = await MongoMemoryServer.create({
    instance: { launchTimeout: 120000 }
  });
  await connectDatabase(mongo.getUri());
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
}, 30_000);

afterEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Community.deleteMany({}),
    CommunityMember.deleteMany({}),
    Block.deleteMany({})
  ]);
});

afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  await disconnectDatabase();
  if (mongo) {
    await mongo.stop();
  }
});

describe("Stream Chat Phase 2: DM & Community Channel Architecture", () => {
  describe("Deterministic ID Generation", () => {
    it("toStreamDmChannelId sorts user IDs alphabetically and produces identical ID in reverse order", () => {
      const id1 = "60d0fe4f5311236168a109ca";
      const id2 = "60d0fe4f5311236168a109cb";

      const channelId1 = toStreamDmChannelId(id1, id2);
      const channelId2 = toStreamDmChannelId(id2, id1);

      expect(channelId1).toBe(channelId2);
      expect(channelId1).toBe(`dm_${id1}_${id2}`);
      expect(channelId1.length).toBeLessThanOrEqual(64);
    });

    it("parseStreamDmChannelId accurately extracts participant IDs", () => {
      const id1 = "60d0fe4f5311236168a109ca";
      const id2 = "60d0fe4f5311236168a109cb";
      const channelId = toStreamDmChannelId(id1, id2);

      const parsed = parseStreamDmChannelId(channelId);
      expect(parsed).toEqual([id1, id2]);
    });

    it("toStreamCommunityChannelId derives deterministic, sanitized ID under 64 characters", () => {
      const communityId = "60d0fe4f5311236168a109ca";
      const key = "Focus & Algorithms Room 101!";

      const channelId = toStreamCommunityChannelId(communityId, key);
      expect(channelId.startsWith(`comm_${communityId}_`)).toBe(true);
      expect(channelId.length).toBeLessThanOrEqual(64);
      // Valid stream channel characters only
      expect(/^[a-z0-9_-]+$/i.test(channelId)).toBe(true);
    });
  });

  describe("Direct Messages API (POST /api/stream/dms)", () => {
    it("rejects unauthenticated requests with 401", async () => {
      const res = await request(app)
        .post("/api/stream/dms")
        .send({ targetUserId: "60d0fe4f5311236168a109ca" });
      expect(res.status).toBe(401);
    });

    it("rejects self-DM with 422", async () => {
      const reg = await request(app).post("/api/auth/register").send(userAData);
      const token = reg.body.data.accessToken;
      const myId = reg.body.data.user._id;

      const res = await request(app)
        .post("/api/stream/dms")
        .set("Authorization", `Bearer ${token}`)
        .send({ targetUserId: myId });

      expect(res.status).toBe(422);
    });

    it("rejects DM if target user does not exist with 404", async () => {
      const reg = await request(app).post("/api/auth/register").send(userAData);
      const token = reg.body.data.accessToken;

      const res = await request(app)
        .post("/api/stream/dms")
        .set("Authorization", `Bearer ${token}`)
        .send({ targetUserId: "60d0fe4f5311236168a10999" });

      expect(res.status).toBe(404);
    });

    it("rejects DM with 403 if target user is blocked", async () => {
      // 1. Register User A and User B
      const regA = await request(app).post("/api/auth/register").send(userAData);
      const tokenA = regA.body.data.accessToken;
      const idA = regA.body.data.user._id;

      const regB = await request(app).post("/api/auth/register").send(userBData);
      const idB = regB.body.data.user._id;

      // 2. User B blocks User A in MongoDB
      await Block.create({ blocker: idB, blocked: idA });

      // 3. User A attempts to start DM
      const res = await request(app)
        .post("/api/stream/dms")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ targetUserId: idB });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("BLOCKED_USER");
    });

    it("creates/returns deterministic DM channel for allowed users", async () => {
      const regA = await request(app).post("/api/auth/register").send(userAData);
      const tokenA = regA.body.data.accessToken;
      const idA = regA.body.data.user._id;

      const regB = await request(app).post("/api/auth/register").send(userBData);
      const tokenB = regB.body.data.accessToken;
      const idB = regB.body.data.user._id;

      // User A initiates DM to User B
      const res1 = await request(app)
        .post("/api/stream/dms")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ targetUserId: idB });

      expect(res1.status).toBe(200);
      expect(res1.body.success).toBe(true);
      expect(res1.body.data.channelId).toBe(toStreamDmChannelId(idA, idB));
      expect(res1.body.data.targetUser.name).toBe("Meera Patel");

      // User B initiates DM to User A -> resolves to identical channelId (idempotent)
      const res2 = await request(app)
        .post("/api/stream/dms")
        .set("Authorization", `Bearer ${tokenB}`)
        .send({ targetUserId: idA });

      expect(res2.status).toBe(200);
      expect(res2.body.data.channelId).toBe(res1.body.data.channelId);
    });
  });

  describe("Community Channels API", () => {
    it("provisions 4 default channel tiers on GET /api/stream/communities/:id/channels", async () => {
      // Register user
      const reg = await request(app).post("/api/auth/register").send(userAData);
      const token = reg.body.data.accessToken;
      const userId = reg.body.data.user._id;

      // Create a community
      const commRes = await request(app)
        .post("/api/communities")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Algorithms & DS Circle",
          description: "Data structures and algorithm prep",
          category: "Other",
          tags: ["algorithms"],
          visibility: "public"
        });

      expect(commRes.status).toBe(201);
      const communityId = commRes.body.data._id;

      // Retrieve Stream community channels
      const chanRes = await request(app)
        .get(`/api/stream/communities/${communityId}/channels`)
        .set("Authorization", `Bearer ${token}`);

      expect(chanRes.status).toBe(200);
      expect(chanRes.body.success).toBe(true);
      const channels = chanRes.body.data;
      expect(Array.isArray(channels)).toBe(true);
      expect(channels.length).toBeGreaterThanOrEqual(4);

      // Verify the 4 tiers are represented
      const tiers = channels.map((c: any) => c.channelTier);
      expect(tiers).toContain("announcements");
      expect(tiers).toContain("focus");
      expect(tiers).toContain("watercooler");
      expect(tiers).toContain("stages");
    });

    it("allows community owner to create custom channel and enforces non-members cannot", async () => {
      const regA = await request(app).post("/api/auth/register").send(userAData);
      const tokenA = regA.body.data.accessToken;

      const regB = await request(app).post("/api/auth/register").send(userBData);
      const tokenB = regB.body.data.accessToken;

      // User A creates community
      const commRes = await request(app)
        .post("/api/communities")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          name: "Web Dev Circle",
          description: "Full stack engineering",
          category: "Web Development",
          tags: ["webdev"],
          visibility: "public"
        });
      const communityId = commRes.body.data._id;

      // User B (non-owner, non-moderator) attempts to create channel -> 403
      const failRes = await request(app)
        .post(`/api/stream/communities/${communityId}/channels`)
        .set("Authorization", `Bearer ${tokenB}`)
        .send({
          name: "Secret Room",
          category: "focus"
        });
      expect(failRes.status).toBe(403);

      // User A (owner) creates channel -> 201
      const okRes = await request(app)
        .post(`/api/stream/communities/${communityId}/channels`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          name: "React & Vite Lab",
          category: "focus",
          topic: "Frontend discussion"
        });
      expect(okRes.status).toBe(201);
      expect(okRes.body.data.name).toBe("React & Vite Lab");
      expect(okRes.body.data.channelTier).toBe("focus");
    });
  });
});
