import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { app } from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { Friendship } from "../src/models/friendship.model.js";
import { User } from "../src/models/user.model.js";

let mongo: MongoMemoryServer;

const userA = {
  fullName: "Aarav Sharma",
  rollNumber: "CS24-104",
  department: "Computer Science",
  academicYear: 2,
  email: "aarav@college.edu",
  password: "SecurePass1"
};

const userB = {
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
}, 120000);

afterEach(async () => {
  await Promise.all([Friendship.deleteMany({}), User.deleteMany({})]);
});

afterAll(async () => {
  await disconnectDatabase();
  if (mongo) await mongo.stop();
});

const register = async (payload: typeof userA) => {
  const response = await request(app).post("/api/auth/register").send(payload).expect(201);
  return {
    token: response.body.data.accessToken as string,
    user: response.body.data.user as { _id: string; fullName: string }
  };
};

describe("Friendship API", () => {
  it("allows sending, status checking, and canceling (reverting) friend requests", async () => {
    const accountA = await register(userA);
    const accountB = await register(userB);

    // Initial status should be NONE
    const initialStatus = await request(app)
      .get(`/api/friends/status/${accountB.user._id}`)
      .set("Authorization", `Bearer ${accountA.token}`)
      .expect(200);
    expect(initialStatus.body.data.status).toBe("NONE");

    // Account A sends friend request to Account B
    const sendRes = await request(app)
      .post(`/api/friends/request/${accountB.user._id}`)
      .set("Authorization", `Bearer ${accountA.token}`)
      .expect(201);
    expect(sendRes.body.data.status).toBe("PENDING");

    // Status from A's perspective is PENDING_SENT
    const statusA = await request(app)
      .get(`/api/friends/status/${accountB.user._id}`)
      .set("Authorization", `Bearer ${accountA.token}`)
      .expect(200);
    expect(statusA.body.data.status).toBe("PENDING_SENT");

    // Status from B's perspective is PENDING_RECEIVED
    const statusB = await request(app)
      .get(`/api/friends/status/${accountA.user._id}`)
      .set("Authorization", `Bearer ${accountB.token}`)
      .expect(200);
    expect(statusB.body.data.status).toBe("PENDING_RECEIVED");

    // Account A cancels (reverts) the sent request
    await request(app)
      .delete(`/api/friends/request/${accountB.user._id}`)
      .set("Authorization", `Bearer ${accountA.token}`)
      .expect(200);

    // Status returns to NONE
    const revertedStatus = await request(app)
      .get(`/api/friends/status/${accountB.user._id}`)
      .set("Authorization", `Bearer ${accountA.token}`)
      .expect(200);
    expect(revertedStatus.body.data.status).toBe("NONE");
  });

  it("allows accepting friend requests and removing friends", async () => {
    const accountA = await register(userA);
    const accountB = await register(userB);

    // Account A sends request to Account B
    await request(app)
      .post(`/api/friends/request/${accountB.user._id}`)
      .set("Authorization", `Bearer ${accountA.token}`)
      .expect(201);

    // Account B lists requests and sees incoming request from A
    const reqList = await request(app)
      .get("/api/friends/requests")
      .set("Authorization", `Bearer ${accountB.token}`)
      .expect(200);
    expect(reqList.body.data.received).toHaveLength(1);
    expect(reqList.body.data.received[0].requester._id).toBe(accountA.user._id);

    // Account B accepts the request
    const acceptRes = await request(app)
      .post(`/api/friends/accept/${accountA.user._id}`)
      .set("Authorization", `Bearer ${accountB.token}`)
      .expect(200);
    expect(acceptRes.body.data.status).toBe("ACCEPTED");

    // Both now have each other in friends list
    const friendsA = await request(app)
      .get("/api/friends")
      .set("Authorization", `Bearer ${accountA.token}`)
      .expect(200);
    expect(friendsA.body.data).toHaveLength(1);
    expect(friendsA.body.data[0].user._id).toBe(accountB.user._id);

    const friendsB = await request(app)
      .get("/api/friends")
      .set("Authorization", `Bearer ${accountB.token}`)
      .expect(200);
    expect(friendsB.body.data).toHaveLength(1);
    expect(friendsB.body.data[0].user._id).toBe(accountA.user._id);

    // Either can remove friend
    await request(app)
      .delete(`/api/friends/${accountB.user._id}`)
      .set("Authorization", `Bearer ${accountA.token}`)
      .expect(200);

    // Friends list becomes empty
    const friendsAfter = await request(app)
      .get("/api/friends")
      .set("Authorization", `Bearer ${accountA.token}`)
      .expect(200);
    expect(friendsAfter.body.data).toHaveLength(0);
  });
});
