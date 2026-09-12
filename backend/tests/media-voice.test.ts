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

let mongo: MongoMemoryServer;

const student1 = {
  fullName: "Aarav Sharma",
  rollNumber: "CS24-201",
  department: "Computer Science",
  academicYear: 2,
  email: "aarav.media@college.edu",
  password: "SecurePass1"
};

const student2 = {
  fullName: "Meera Rao",
  rollNumber: "CS24-202",
  department: "Computer Science",
  academicYear: 2,
  email: "meera.media@college.edu",
  password: "SecurePass1"
};

const student3 = {
  fullName: "Rohan Varma",
  rollNumber: "CS24-203",
  department: "Computer Science",
  academicYear: 2,
  email: "rohan.media@college.edu",
  password: "SecurePass1"
};

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDatabase(mongo.getUri());
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
  await disconnectDatabase();
  await mongo.stop();
});

const registerStudent = async (data: typeof student1) => {
  const res = await request(app).post("/api/auth/register").send(data).expect(201);
  return { token: res.body.data.accessToken as string, userId: res.body.data.user._id as string };
};

describe("Phase 3 — Media & Voice Messages", () => {
  it("allows uploading an image with a caption in direct messages", async () => {
    const a = await registerStudent(student1);
    const b = await registerStudent(student2);

    const convRes = await request(app)
      .post("/api/direct-messages/conversations")
      .set("Authorization", `Bearer ${a.token}`)
      .send({ receiverId: b.userId })
      .expect(201);
    const convId = convRes.body.data._id;

    // Send Image message with caption
    const dummyImage = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const sendRes = await request(app)
      .post(`/api/direct-messages/conversations/${convId}/messages`)
      .set("Authorization", `Bearer ${a.token}`)
      .field("content", "Diagram of B-tree nodes")
      .attach("attachments", dummyImage, "btree.png")
      .expect(201);

    expect(sendRes.body.data.content).toBe("Diagram of B-tree nodes");
    expect(sendRes.body.data.messageType).toBe("IMAGE");
    expect(sendRes.body.data.attachments).toHaveLength(1);
    expect(sendRes.body.data.attachments[0].originalName).toBe("btree.png");
    expect(sendRes.body.data.attachments[0].mimeType).toBe("image/png");
    expect(sendRes.body.data.attachments[0].url).toContain("/uploads/direct-messages/");
  });

  it("allows uploading a voice note with duration and waveform", async () => {
    const a = await registerStudent(student1);
    const b = await registerStudent(student2);

    const convRes = await request(app)
      .post("/api/direct-messages/conversations")
      .set("Authorization", `Bearer ${a.token}`)
      .send({ receiverId: b.userId })
      .expect(201);
    const convId = convRes.body.data._id;

    const dummyAudio = Buffer.from("RIFF....WAVEfmt ....data....");
    const sendRes = await request(app)
      .post(`/api/direct-messages/conversations/${convId}/messages`)
      .set("Authorization", `Bearer ${a.token}`)
      .field("content", "")
      .field("duration", "18.5")
      .field("waveform", JSON.stringify([20, 50, 80, 40, 90]))
      .attach("attachments", dummyAudio, { filename: "voice-message.webm", contentType: "audio/webm" })
      .expect(201);

    expect(sendRes.body.data.messageType).toBe("AUDIO");
    expect(sendRes.body.data.attachments[0].duration).toBe(18.5);
    expect(sendRes.body.data.attachments[0].waveform).toEqual([20, 50, 80, 40, 90]);
  });

  it("allows uploading documents (PDF) in community chat", async () => {
    const a = await registerStudent(student1);

    const commRes = await request(app)
      .post("/api/communities")
      .set("Authorization", `Bearer ${a.token}`)
      .send({ name: "Algorithms Lab", description: "DSA Coursework", category: "Java Programming", tags: ["dsa"] })
      .expect(201);
    const commId = commRes.body.data._id;

    const dummyPdf = Buffer.from("%PDF-1.4 test document content");
    const sendRes = await request(app)
      .post(`/api/communities/${commId}/messages`)
      .set("Authorization", `Bearer ${a.token}`)
      .field("content", "Week 4 Assignment PDF")
      .attach("attachments", dummyPdf, { filename: "assignment4.pdf", contentType: "application/pdf" })
      .expect(201);

    expect(sendRes.body.data.messageType).toBe("PDF");
    expect(sendRes.body.data.attachments[0].originalName).toBe("assignment4.pdf");
    expect(sendRes.body.data.attachments[0].mimeType).toBe("application/pdf");
  });

  it("strictly rejects dangerous and executable file uploads", async () => {
    const a = await registerStudent(student1);
    const b = await registerStudent(student2);

    const convRes = await request(app)
      .post("/api/direct-messages/conversations")
      .set("Authorization", `Bearer ${a.token}`)
      .send({ receiverId: b.userId })
      .expect(201);
    const convId = convRes.body.data._id;

    const dummyExe = Buffer.from("MZ malicious binary header");
    const sendRes = await request(app)
      .post(`/api/direct-messages/conversations/${convId}/messages`)
      .set("Authorization", `Bearer ${a.token}`)
      .attach("attachments", dummyExe, "malware.exe");

    expect(sendRes.status).toBe(415);
    expect(sendRes.body.code).toBe("DANGEROUS_FILE_TYPE");
  });

  it("enforces protected attachment access and authorization", async () => {
    const a = await registerStudent(student1);
    const b = await registerStudent(student2);
    const c = await registerStudent(student3);

    const convRes = await request(app)
      .post("/api/direct-messages/conversations")
      .set("Authorization", `Bearer ${a.token}`)
      .send({ receiverId: b.userId })
      .expect(201);
    const convId = convRes.body.data._id;

    // Send an attachment
    const dummyImage = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const sendRes = await request(app)
      .post(`/api/direct-messages/conversations/${convId}/messages`)
      .set("Authorization", `Bearer ${a.token}`)
      .field("content", "Private note")
      .attach("attachments", dummyImage, "photo.png")
      .expect(201);

    const attachmentUrl = sendRes.body.data.attachments[0].url; // e.g. /uploads/direct-messages/xyz.png

    // 1. Unauthenticated request -> 401
    const unauthRes = await request(app).get(attachmentUrl);
    expect(unauthRes.status).toBe(401);

    // 2. Unauthorized third-party student -> 403
    const forbiddenRes = await request(app)
      .get(attachmentUrl)
      .set("Authorization", `Bearer ${c.token}`);
    expect(forbiddenRes.status).toBe(403);

    // 3. Authorized recipient with token query param -> 200
    const authRes = await request(app).get(`${attachmentUrl}?token=${b.token}`);
    expect(authRes.status).toBe(200);

    // 4. Authorized sender with Authorization header -> 200
    const senderRes = await request(app)
      .get(attachmentUrl)
      .set("Authorization", `Bearer ${a.token}`);
    expect(senderRes.status).toBe(200);
  });

  it("supports replying to media and editing media captions within 24h", async () => {
    const a = await registerStudent(student1);
    const b = await registerStudent(student2);

    const convRes = await request(app)
      .post("/api/direct-messages/conversations")
      .set("Authorization", `Bearer ${a.token}`)
      .send({ receiverId: b.userId })
      .expect(201);
    const convId = convRes.body.data._id;

    const dummyImage = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const sendRes = await request(app)
      .post(`/api/direct-messages/conversations/${convId}/messages`)
      .set("Authorization", `Bearer ${a.token}`)
      .field("content", "Initial caption")
      .attach("attachments", dummyImage, "chart.png")
      .expect(201);

    const msgId = sendRes.body.data._id;

    // 1. Edit caption
    const editRes = await request(app)
      .patch(`/api/direct-messages/messages/${msgId}`)
      .set("Authorization", `Bearer ${a.token}`)
      .send({ content: "Updated caption for the chart" })
      .expect(200);
    expect(editRes.body.data.content).toBe("Updated caption for the chart");
    expect(editRes.body.data.edited).toBe(true);

    // 2. Reply to media message
    const replyRes = await request(app)
      .post(`/api/direct-messages/conversations/${convId}/messages`)
      .set("Authorization", `Bearer ${b.token}`)
      .send({ content: "Looks great, thanks!", replyTo: msgId })
      .expect(201);
    expect(replyRes.body.data.replyTo._id).toBe(msgId);
    expect(replyRes.body.data.replyTo.attachments).toHaveLength(1);
    expect(replyRes.body.data.replyTo.attachments[0].originalName).toBe("chart.png");
  });
});
