import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { app } from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { Community } from "../src/models/community.model.js";
import { CommunityMember } from "../src/models/community-member.model.js";
import { User } from "../src/models/user.model.js";

let mongo: MongoMemoryServer;

const owner = {
  fullName: "Aarav Sharma",
  rollNumber: "CS24-104",
  department: "Computer Science",
  academicYear: 2,
  email: "aarav@college.edu",
  password: "SecurePass1"
};

const member = {
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
});

afterEach(async () => {
  await Promise.all([Community.deleteMany({}), CommunityMember.deleteMany({}), User.deleteMany({})]);
});

afterAll(async () => {
  await disconnectDatabase();
  await mongo.stop();
});

const register = async (payload: typeof owner) => {
  const response = await request(app).post("/api/auth/register").send(payload).expect(201);
  return response.body.data.accessToken as string;
};

const createCommunity = async (token: string) => {
  const response = await request(app)
    .post("/api/communities")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "Java Programming",
      description: "Object-oriented programming, DSA, and interview practice.",
      category: "Java Programming",
      tags: ["java", "dsa"],
      visibility: "public"
    })
    .expect(201);
  return response.body.data as { _id: string; membershipRole: string; memberCount: number };
};

describe("communities API", () => {
  it("creates an owner membership with a unique community name", async () => {
    const token = await register(owner);
    const community = await createCommunity(token);

    expect(community.membershipRole).toBe("OWNER");
    expect(community.memberCount).toBe(1);

    await request(app)
      .post("/api/communities")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Java Programming",
        category: "Java Programming",
        tags: [],
        visibility: "public"
      })
      .expect(409);
  });

  it("lets a student join and view members", async () => {
    const ownerToken = await register(owner);
    const memberToken = await register(member);
    const community = await createCommunity(ownerToken);

    const join = await request(app)
      .post(`/api/communities/${community._id}/join`)
      .set("Authorization", `Bearer ${memberToken}`)
      .expect(200);

    expect(join.body.data.membershipRole).toBe("MEMBER");
    expect(join.body.data.memberCount).toBe(2);

    const members = await request(app)
      .get(`/api/communities/${community._id}/members`)
      .set("Authorization", `Bearer ${memberToken}`)
      .expect(200);

    expect(members.body.data).toHaveLength(2);
  });

  it("requires owner permissions to promote moderators", async () => {
    const ownerToken = await register(owner);
    const memberToken = await register(member);
    const community = await createCommunity(ownerToken);
    const memberProfile = await request(app)
      .get("/api/users/profile")
      .set("Authorization", `Bearer ${memberToken}`)
      .expect(200);

    await request(app)
      .post(`/api/communities/${community._id}/join`)
      .set("Authorization", `Bearer ${memberToken}`)
      .expect(200);

    await request(app)
      .post(`/api/communities/${community._id}/moderators`)
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ userId: memberProfile.body.data._id })
      .expect(403);

    const promoted = await request(app)
      .post(`/api/communities/${community._id}/moderators`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ userId: memberProfile.body.data._id })
      .expect(200);

    expect(promoted.body.data.some((item: { role: string }) => item.role === "MODERATOR")).toBe(true);
  });
});
