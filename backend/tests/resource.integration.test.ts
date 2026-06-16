import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { Community } from "../src/models/community.model.js";
import { CommunityMember } from "../src/models/community-member.model.js";
import { Resource } from "../src/models/resource.model.js";
import { User } from "../src/models/user.model.js";
import { COMMUNITY_ROLES } from "../src/constants/community-roles.js";
import { RESOURCE_CATEGORIES } from "../src/constants/resource.js";

let mongo: MongoMemoryServer;
let server: HttpServer;
let baseURL: string;

const userData = {
  fullName: "Aarav Sharma",
  rollNumber: "CS24-104",
  department: "Computer Science",
  academicYear: 2,
  email: "aarav@college.edu",
  password: "SecurePass1"
};

const memberData = {
  fullName: "Meera Rao",
  rollNumber: "CS24-110",
  department: "Computer Science",
  academicYear: 2,
  email: "meera@college.edu",
  password: "SecurePass1"
};

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDatabase(mongo.getUri());
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as AddressInfo;
  baseURL = `http://127.0.0.1:${address.port}`;
}, 30_000);

afterEach(async () => {
  await Promise.all([
    Resource.deleteMany({}),
    Community.deleteMany({}),
    CommunityMember.deleteMany({}),
    User.deleteMany({})
  ]);
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await disconnectDatabase();
  await mongo.stop();
});

const register = async (payload: typeof userData) => {
  const response = await request(app).post("/api/auth/register").send(payload).expect(201);
  return {
    token: response.body.data.accessToken as string,
    userId: response.body.data.user._id as string
  };
};

const createCommunity = async (token: string) => {
  const response = await request(app)
    .post("/api/communities")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "Cyber Security",
      description: "CTFs, secure coding, and incident response.",
      category: "Cyber Security",
      tags: ["ctf", "security"],
      visibility: "public"
    })
    .expect(201);
  return response.body.data._id as string;
};

describe("Resource Upload", () => {
  it("rejects upload without authentication", async () => {
    await request(app)
      .post("/api/communities/507f1f77bcf86cd799439011/resources")
      .expect(401);
  });

  it("allows community members to upload a resource", async () => {
    const owner = await register(userData);
    const communityId = await createCommunity(owner.token);

    const response = await request(app)
      .post(`/api/communities/${communityId}/resources`)
      .set("Authorization", `Bearer ${owner.token}`)
      .field("title", "Network Security Notes")
      .field("category", RESOURCE_CATEGORIES[0])
      .attach("file", Buffer.from("test content"), "notes.pdf")
      .expect(201);

    expect(response.body.data._id).toBeDefined();
    expect(response.body.data.title).toBe("Network Security Notes");
    expect(response.body.data.fileName).toBe("notes.pdf");
    expect(response.body.data.uploadedBy._id).toBe(owner.userId);
  });

  it("rejects upload from non-members", async () => {
    const owner = await register(userData);
    const outsider = await register(memberData);
    const communityId = await createCommunity(owner.token);

    await request(app)
      .post(`/api/communities/${communityId}/resources`)
      .set("Authorization", `Bearer ${outsider.token}`)
      .field("title", "Hacked Resource")
      .field("category", RESOURCE_CATEGORIES[0])
      .attach("file", Buffer.from("bad"), "hack.pdf")
      .expect(403);
  });

  it("rejects upload without a file", async () => {
    const owner = await register(userData);
    const communityId = await createCommunity(owner.token);

    await request(app)
      .post(`/api/communities/${communityId}/resources`)
      .set("Authorization", `Bearer ${owner.token}`)
      .field("title", "No File")
      .field("category", RESOURCE_CATEGORIES[0])
      .expect(400);
  });
});

describe("Resource Listing", () => {
  it("lists resources in a community with pagination", async () => {
    const owner = await register(userData);
    const communityId = await createCommunity(owner.token);

    for (let i = 1; i <= 3; i++) {
      await request(app)
        .post(`/api/communities/${communityId}/resources`)
        .set("Authorization", `Bearer ${owner.token}`)
        .field("title", `Resource ${i}`)
        .field("category", RESOURCE_CATEGORIES[0])
        .attach("file", Buffer.from(`content ${i}`), `file${i}.pdf`);
    }

    const response = await request(app)
      .get(`/api/communities/${communityId}/resources?page=1&limit=2`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    expect(response.body.data.items).toHaveLength(2);
    expect(response.body.data.total).toBe(3);
    expect(response.body.data.pages).toBe(2);
  });

  it("filters resources by category", async () => {
    const owner = await register(userData);
    const communityId = await createCommunity(owner.token);

    await request(app)
      .post(`/api/communities/${communityId}/resources`)
      .set("Authorization", `Bearer ${owner.token}`)
      .field("title", "Notes")
      .field("category", "NOTES")
      .attach("file", Buffer.from("notes"), "notes.pdf");

    await request(app)
      .post(`/api/communities/${communityId}/resources`)
      .set("Authorization", `Bearer ${owner.token}`)
      .field("title", "Assignment")
      .field("category", "ASSIGNMENTS")
      .attach("file", Buffer.from("assign"), "assign.pdf");

    const response = await request(app)
      .get(`/api/communities/${communityId}/resources?category=NOTES`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0].title).toBe("Notes");
  });
});

describe("Resource Access", () => {
  it("returns resource details by id", async () => {
    const owner = await register(userData);
    const communityId = await createCommunity(owner.token);

    const { body } = await request(app)
      .post(`/api/communities/${communityId}/resources`)
      .set("Authorization", `Bearer ${owner.token}`)
      .field("title", "Lab Record")
      .field("category", "LAB_RECORDS")
      .attach("file", Buffer.from("lab data"), "lab.pdf");

    const resourceId = body.data._id;

    const detail = await request(app)
      .get(`/api/resources/${resourceId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    expect(detail.body.data._id).toBe(resourceId);
    expect(detail.body.data.title).toBe("Lab Record");
  });

  it("tracks download count", async () => {
    const owner = await register(userData);
    const member = await register(memberData);
    const communityId = await createCommunity(owner.token);

    await CommunityMember.create({
      communityId,
      userId: member.userId,
      role: COMMUNITY_ROLES.MEMBER
    });
    await Community.findByIdAndUpdate(communityId, { $inc: { memberCount: 1 } });

    const { body } = await request(app)
      .post(`/api/communities/${communityId}/resources`)
      .set("Authorization", `Bearer ${owner.token}`)
      .field("title", "Download Test")
      .field("category", "OTHER")
      .attach("file", Buffer.from("data"), "test.pdf");

    const resourceId = body.data._id;

    await request(app)
      .post(`/api/resources/${resourceId}/download`)
      .set("Authorization", `Bearer ${member.token}`)
      .expect(200);

    const detail = await request(app)
      .get(`/api/resources/${resourceId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    expect(detail.body.data.downloadCount).toBe(1);
  });
});

describe("Resource Management", () => {
  it("allows owner to edit their resource", async () => {
    const owner = await register(userData);
    const communityId = await createCommunity(owner.token);

    const { body } = await request(app)
      .post(`/api/communities/${communityId}/resources`)
      .set("Authorization", `Bearer ${owner.token}`)
      .field("title", "Original Title")
      .field("category", "NOTES")
      .attach("file", Buffer.from("data"), "original.pdf");

    const resourceId = body.data._id;

    const updated = await request(app)
      .put(`/api/resources/${resourceId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .field("title", "Updated Title")
      .field("description", "New description")
      .expect(200);

    expect(updated.body.data.title).toBe("Updated Title");
    expect(updated.body.data.description).toBe("New description");
  });

  it("prevents non-owner from editing", async () => {
    const owner = await register(userData);
    const other = await register(memberData);
    const communityId = await createCommunity(owner.token);

    const { body } = await request(app)
      .post(`/api/communities/${communityId}/resources`)
      .set("Authorization", `Bearer ${owner.token}`)
      .field("title", "My Resource")
      .field("category", "NOTES")
      .attach("file", Buffer.from("data"), "mine.pdf");

    await request(app)
      .put(`/api/resources/${body.data._id}`)
      .set("Authorization", `Bearer ${other.token}`)
      .field("title", "Stolen")
      .expect(403);
  });

  it("allows owner and moderator to delete a resource", async () => {
    const owner = await register(userData);
    const member = await register(memberData);
    const communityId = await createCommunity(owner.token);

    await CommunityMember.create({
      communityId,
      userId: member.userId,
      role: COMMUNITY_ROLES.MODERATOR
    });
    await Community.findByIdAndUpdate(communityId, { $inc: { memberCount: 1 } });

    const { body } = await request(app)
      .post(`/api/communities/${communityId}/resources`)
      .set("Authorization", `Bearer ${owner.token}`)
      .field("title", "Delete Me")
      .field("category", "OTHER")
      .attach("file", Buffer.from("data"), "delete.pdf");

    await request(app)
      .delete(`/api/resources/${body.data._id}`)
      .set("Authorization", `Bearer ${member.token}`)
      .expect(200);

    await request(app)
      .get(`/api/resources/${body.data._id}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(404);
  });
});
