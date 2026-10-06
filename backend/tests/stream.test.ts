import { createServer, type Server as HttpServer } from "node:http";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { User } from "../src/models/user.model.js";
import { streamService } from "../src/services/stream.service.js";
import { toStreamUserId, fromStreamUserId } from "../src/utils/stream-id.js";

let mongo: MongoMemoryServer;
let server: HttpServer;

const userData = {
  fullName: "Vikram Reddy",
  rollNumber: "CS24-200",
  department: "Computer Science",
  academicYear: 3,
  email: "vikram@college.edu",
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
  await User.deleteMany({});
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

describe("Stream Chat Backend Integration (Phase 1)", () => {
  describe("User ID Mapping", () => {
    it("toStreamUserId prefixes raw user IDs with studyconnect_", () => {
      expect(toStreamUserId("60d0fe4f5311236168a109ca")).toBe("studyconnect_60d0fe4f5311236168a109ca");
      // Idempotent if already prefixed
      expect(toStreamUserId("studyconnect_60d0fe4f5311236168a109ca")).toBe("studyconnect_60d0fe4f5311236168a109ca");
    });

    it("fromStreamUserId extracts the original user ID", () => {
      expect(fromStreamUserId("studyconnect_60d0fe4f5311236168a109ca")).toBe("60d0fe4f5311236168a109ca");
      expect(fromStreamUserId("plain_id")).toBe("plain_id");
    });
  });

  describe("Token Generation & Service", () => {
    it("streamService.createUserToken generates a valid signed JWT", () => {
      const token = streamService.createUserToken("user-12345");
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(20);
      expect(token.split(".").length).toBe(3);
    });
  });

  describe("GET /api/stream/token Endpoint", () => {
    it("rejects unauthenticated requests with 401", async () => {
      const response = await request(app).get("/api/stream/token");
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("generates a valid token and mapped Stream identity for authenticated users", async () => {
      // 1. Register a test user
      const regRes = await request(app)
        .post("/api/auth/register")
        .send(userData);
      expect(regRes.status).toBe(201);
      const accessToken = regRes.body.data.accessToken;
      expect(accessToken).toBeDefined();

      // 2. Fetch Stream token
      const tokenRes = await request(app)
        .get("/api/stream/token")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(tokenRes.status).toBe(200);
      expect(tokenRes.body.success).toBe(true);
      expect(tokenRes.body.data.token).toBeDefined();
      expect(tokenRes.body.data.apiKey).toBe("53gz42z8uzan");
      expect(tokenRes.body.data.user.id).toMatch(/^studyconnect_/);
      expect(tokenRes.body.data.user.name).toBe("Vikram Reddy");
      expect(tokenRes.body.data.user.department).toBe("Computer Science");
      expect(tokenRes.body.data.user.rollNumber).toBe("CS24-200");
    });
  });
});
