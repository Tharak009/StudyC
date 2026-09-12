import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { Conversation } from "../src/models/conversation.model.js";
import { DirectMessage } from "../src/models/direct-message.model.js";
import { Message } from "../src/models/message.model.js";
import { Community } from "../src/models/community.model.js";
import { CommunityMember } from "../src/models/community-member.model.js";
import { User } from "../src/models/user.model.js";
import { initializeSockets } from "../src/sockets/index.js";

let mongo: MongoMemoryServer;
let server: HttpServer;
let baseURL: string;

const student1 = {
  fullName: "Aarav Sharma",
  rollNumber: "CS24-104",
  department: "Computer Science",
  academicYear: 2,
  email: "aarav.p2@college.edu",
  password: "SecurePass1"
};

const student2 = {
  fullName: "Meera Rao",
  rollNumber: "CS24-110",
  department: "Computer Science",
  academicYear: 2,
  email: "meera.p2@college.edu",
  password: "SecurePass1"
};

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDatabase(mongo.getUri());
  server = createServer(app);
  initializeSockets(server);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as AddressInfo;
  baseURL = `http://127.0.0.1:${address.port}`;
}, 30_000);

afterEach(async () => {
  await Promise.all([
    DirectMessage.deleteMany({}),
    Message.deleteMany({}),
    Community.deleteMany({}),
    CommunityMember.deleteMany({}),
    Conversation.deleteMany({}),
    User.deleteMany({})
  ]);
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await disconnectDatabase();
  await mongo.stop();
});

const register = async (payload: typeof student1) => {
  const response = await request(app).post("/api/auth/register").send(payload).expect(201);
  return {
    token: response.body.data.accessToken as string,
    userId: response.body.data.user._id as string
  };
};

describe("Phase 2 — Message Interactions (Direct Messages)", () => {
  it("allows sender to edit their message and sets edited flag", async () => {
    const a = await register(student1);
    const b = await register(student2);

    const convRes = await request(app)
      .post("/api/direct-messages/conversations")
      .set("Authorization", `Bearer ${a.token}`)
      .send({ receiverId: b.userId })
      .expect(201);
    const conversationId = convRes.body.data._id;

    const msgRes = await request(app)
      .post(`/api/direct-messages/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${a.token}`)
      .send({ content: "Initial homework query" })
      .expect(201);
    const messageId = msgRes.body.data._id;

    const editRes = await request(app)
      .patch(`/api/direct-messages/messages/${messageId}`)
      .set("Authorization", `Bearer ${a.token}`)
      .send({ content: "Updated homework query for Chapter 4" })
      .expect(200);

    expect(editRes.body.data.content).toBe("Updated homework query for Chapter 4");
    expect(editRes.body.data.edited).toBe(true);
    expect(editRes.body.data.editedAt).toBeDefined();
  });

  it("toggles emoji reactions on direct messages", async () => {
    const a = await register(student1);
    const b = await register(student2);

    const convRes = await request(app)
      .post("/api/direct-messages/conversations")
      .set("Authorization", `Bearer ${a.token}`)
      .send({ receiverId: b.userId })
      .expect(201);
    const conversationId = convRes.body.data._id;

    const msgRes = await request(app)
      .post(`/api/direct-messages/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${a.token}`)
      .send({ content: "Great presentation today!" })
      .expect(201);
    const messageId = msgRes.body.data._id;

    // Student B adds a reaction
    const reactRes1 = await request(app)
      .post(`/api/direct-messages/messages/${messageId}/reaction`)
      .set("Authorization", `Bearer ${b.token}`)
      .send({ emoji: "🎉" })
      .expect(200);

    expect(reactRes1.body.data.reactions).toHaveLength(1);
    expect(reactRes1.body.data.reactions[0].emoji).toBe("🎉");
    expect(reactRes1.body.data.reactions[0].count).toBe(1);

    // Student B removes reaction (toggle)
    const reactRes2 = await request(app)
      .post(`/api/direct-messages/messages/${messageId}/reaction`)
      .set("Authorization", `Bearer ${b.token}`)
      .send({ emoji: "🎉" })
      .expect(200);

    expect(reactRes2.body.data.reactions).toHaveLength(0);
  });

  it("stars and unstars direct messages and lists starred messages", async () => {
    const a = await register(student1);
    const b = await register(student2);

    const convRes = await request(app)
      .post("/api/direct-messages/conversations")
      .set("Authorization", `Bearer ${a.token}`)
      .send({ receiverId: b.userId })
      .expect(201);
    const conversationId = convRes.body.data._id;

    const msgRes = await request(app)
      .post(`/api/direct-messages/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${a.token}`)
      .send({ content: "Exam syllabus link: https://cs.college.edu/exam" })
      .expect(201);
    const messageId = msgRes.body.data._id;

    // Student A stars message
    const starRes = await request(app)
      .post(`/api/direct-messages/messages/${messageId}/star`)
      .set("Authorization", `Bearer ${a.token}`)
      .expect(200);

    expect(starRes.body.data.isStarred).toBe(true);

    // List starred
    const listStarredRes = await request(app)
      .get(`/api/direct-messages/conversations/${conversationId}/starred`)
      .set("Authorization", `Bearer ${a.token}`)
      .expect(200);

    expect(listStarredRes.body.data).toHaveLength(1);
    expect(listStarredRes.body.data[0]._id).toBe(messageId);

    // Bulk star
    const bulkStarRes = await request(app)
      .post(`/api/direct-messages/conversations/${conversationId}/messages/bulk-star`)
      .set("Authorization", `Bearer ${a.token}`)
      .send({ messageIds: [messageId], star: false })
      .expect(200);

    expect(bulkStarRes.body.data.count).toBeDefined();
  });

  it("supports pinning up to 3 messages and lists pinned messages", async () => {
    const a = await register(student1);
    const b = await register(student2);

    const convRes = await request(app)
      .post("/api/direct-messages/conversations")
      .set("Authorization", `Bearer ${a.token}`)
      .send({ receiverId: b.userId })
      .expect(201);
    const conversationId = convRes.body.data._id;

    const msgRes = await request(app)
      .post(`/api/direct-messages/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${a.token}`)
      .send({ content: "Meeting at lab room 302 at 5 PM" })
      .expect(201);
    const messageId = msgRes.body.data._id;

    // Pin message
    const pinRes = await request(app)
      .post(`/api/direct-messages/messages/${messageId}/pin`)
      .set("Authorization", `Bearer ${a.token}`)
      .expect(200);

    expect(pinRes.body.data.isPinned).toBe(true);

    // List pinned
    const listPinnedRes = await request(app)
      .get(`/api/direct-messages/conversations/${conversationId}/pinned`)
      .set("Authorization", `Bearer ${a.token}`)
      .expect(200);

    expect(listPinnedRes.body.data).toHaveLength(1);
    expect(listPinnedRes.body.data[0]._id).toBe(messageId);
  });

  it("performs delete for me and delete for everyone", async () => {
    const a = await register(student1);
    const b = await register(student2);

    const convRes = await request(app)
      .post("/api/direct-messages/conversations")
      .set("Authorization", `Bearer ${a.token}`)
      .send({ receiverId: b.userId })
      .expect(201);
    const conversationId = convRes.body.data._id;

    const msgRes = await request(app)
      .post(`/api/direct-messages/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${a.token}`)
      .send({ content: "Message to delete for me" })
      .expect(201);
    const messageId = msgRes.body.data._id;

    // Delete for me
    await request(app)
      .post(`/api/direct-messages/messages/${messageId}/delete-for-me`)
      .set("Authorization", `Bearer ${a.token}`)
      .expect(200);

    // Verify it doesn't appear in A's message list
    const listA = await request(app)
      .get(`/api/direct-messages/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${a.token}`)
      .expect(200);
    expect(listA.body.data.items.some((m: any) => m._id === messageId)).toBe(false);

    // But it DOES appear in B's message list
    const listB = await request(app)
      .get(`/api/direct-messages/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${b.token}`)
      .expect(200);
    expect(listB.body.data.items.some((m: any) => m._id === messageId)).toBe(true);

    // Now delete for everyone
    const purgeRes = await request(app)
      .post(`/api/direct-messages/messages/${messageId}/delete-for-everyone`)
      .set("Authorization", `Bearer ${a.token}`)
      .expect(200);

    expect(purgeRes.body.data.isDeletedForEveryone).toBe(true);
    expect(purgeRes.body.data.content).toBe("");
  });

  it("forwards messages to another conversation", async () => {
    const a = await register(student1);
    const b = await register(student2);

    const convRes = await request(app)
      .post("/api/direct-messages/conversations")
      .set("Authorization", `Bearer ${a.token}`)
      .send({ receiverId: b.userId })
      .expect(201);
    const conversationId = convRes.body.data._id;

    const msgRes = await request(app)
      .post(`/api/direct-messages/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${a.token}`)
      .send({ content: "Project proposal details" })
      .expect(201);
    const messageId = msgRes.body.data._id;

    const fwdRes = await request(app)
      .post("/api/direct-messages/messages/forward")
      .set("Authorization", `Bearer ${a.token}`)
      .send({
        messageIds: [messageId],
        targetConversationIds: [conversationId]
      })
      .expect(201);

    expect(fwdRes.body.data).toHaveLength(1);
    expect(fwdRes.body.data[0].isForwarded).toBe(true);
  });
});
