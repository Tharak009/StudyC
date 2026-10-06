import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { app } from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { Community } from "../src/models/community.model.js";
import { CommunityMember } from "../src/models/community-member.model.js";
import { CommunityGroup } from "../src/models/community-group.model.js";
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
  mongo = await MongoMemoryServer.create({
    instance: { launchTimeout: 120000 }
  });
  await connectDatabase(mongo.getUri());
});

afterEach(async () => {
  await Promise.all([
    Community.deleteMany({}),
    CommunityMember.deleteMany({}),
    CommunityGroup.deleteMany({}),
    User.deleteMany({})
  ]);
});

afterAll(async () => {
  await disconnectDatabase();
  if (mongo) {
    await mongo.stop();
  }
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

  it("auto-provisions Announcements group on community creation and allows owner to create groups", async () => {
    const ownerToken = await register(owner);
    const memberToken = await register(member);
    const community = await createCommunity(ownerToken);

    // 1. Check auto-provisioned announcements group
    const initialGroupsRes = await request(app)
      .get(`/api/communities/${community._id}/groups`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200);

    const initialGroups = initialGroupsRes.body.data;
    expect(initialGroups).toHaveLength(1);
    expect(initialGroups[0].type).toBe("ANNOUNCEMENT");
    expect(initialGroups[0].isAnnouncement).toBe(true);
    expect(initialGroups[0].name).toBe("Announcements");
    expect(initialGroups[0].streamChannelId).toBe(`comm_${community._id}_announcements`);

    // 2. Student joins community
    await request(app)
      .post(`/api/communities/${community._id}/join`)
      .set("Authorization", `Bearer ${memberToken}`)
      .expect(200);

    // 3. Regular member CANNOT create a group (RBAC check -> 403)
    await request(app)
      .post(`/api/communities/${community._id}/groups`)
      .set("Authorization", `Bearer ${memberToken}`)
      .send({
        name: "Hacker Project Team",
        description: "Building our final semester project",
        type: "PROJECT"
      })
      .expect(403);

    // 4. Community Owner CAN create a new group
    const createGroupRes = await request(app)
      .post(`/api/communities/${community._id}/groups`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        name: "Data Structures & Algorithms",
        description: "Discussing LeetCode problems and assignments",
        type: "STUDY"
      })
      .expect(201);

    const createdGroup = createGroupRes.body.data;
    expect(createdGroup.name).toBe("Data Structures & Algorithms");
    expect(createdGroup.type).toBe("STUDY");
    expect(createdGroup.isAnnouncement).toBe(false);
    expect(createdGroup.streamChannelId).toBe(`comm_${community._id}_grp_${createdGroup._id}`);

    // 5. Member can list all community groups
    const memberGroupsRes = await request(app)
      .get(`/api/communities/${community._id}/groups`)
      .set("Authorization", `Bearer ${memberToken}`)
      .expect(200);

    expect(memberGroupsRes.body.data).toHaveLength(2);

    // 6. Member can get specific group details
    const groupDetailsRes = await request(app)
      .get(`/api/communities/${community._id}/groups/${createdGroup._id}`)
      .set("Authorization", `Bearer ${memberToken}`)
      .expect(200);

    expect(groupDetailsRes.body.data._id).toBe(createdGroup._id);
    expect(groupDetailsRes.body.data.name).toBe("Data Structures & Algorithms");
  });
});
