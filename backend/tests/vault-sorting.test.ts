import { createServer, type Server as HttpServer } from "node:http";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { Resource } from "../src/models/resource.model.js";
import { User } from "../src/models/user.model.js";

let mongo: MongoMemoryServer;
let server: HttpServer;
let authToken: string;
let userId: string;

const testUser = {
  fullName: "Sorting Audit Tester",
  rollNumber: `SORT-${Date.now()}`,
  department: "Computer Science & Engineering",
  academicYear: 3,
  email: `sort.tester.${Date.now()}@campus.edu`,
  password: "SecurePassword2026!"
};

beforeAll(async () => {
  mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 120000 } });
  await connectDatabase(mongo.getUri());
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));

  const userDoc = await User.create(testUser);
  userId = userDoc._id.toString();
  const res = await request(app).post("/api/auth/login").send({ email: testUser.email, password: testUser.password });
  authToken = res.body.data.accessToken;
}, 30_000);

afterEach(async () => {
  await Resource.deleteMany({});
});

afterAll(async () => {
  await User.deleteMany({});
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  await disconnectDatabase();
  if (mongo) {
    await mongo.stop();
  }
});

describe("StudyConnect Resource Vault — 'Newest First' Sorting Verification", () => {
  it("delivers a chronological feed of all matching uploaded resources in descending upload order", async () => {
    const now = Date.now();
    const todayUpload = new Date(now);
    const yesterdayUpload = new Date(now - 24 * 60 * 60 * 1000);
    const threeDaysAgoUpload = new Date(now - 3 * 24 * 60 * 60 * 1000);
    const lastMonthUpload = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const rOld = await Resource.create({
      title: "Older Upload - Last Month",
      description: "Older notes",
      fileName: "older.pdf",
      fileUrl: "/uploads/older.pdf",
      fileSize: 100000,
      fileType: "application/pdf",
      category: "NOTES",
      format: "pdf",
      uploadedBy: userId,
      createdAt: lastMonthUpload
    });

    const r3Days = await Resource.create({
      title: "Three Days Ago Upload",
      description: "Mid-week notes",
      fileName: "three_days.pdf",
      fileUrl: "/uploads/three_days.pdf",
      fileSize: 100000,
      fileType: "application/pdf",
      category: "NOTES",
      format: "pdf",
      uploadedBy: userId,
      createdAt: threeDaysAgoUpload
    });

    const rYesterday = await Resource.create({
      title: "Yesterday Upload",
      description: "Yesterday notes",
      fileName: "yesterday.pdf",
      fileUrl: "/uploads/yesterday.pdf",
      fileSize: 100000,
      fileType: "application/pdf",
      category: "NOTES",
      format: "pdf",
      uploadedBy: userId,
      createdAt: yesterdayUpload
    });

    const rToday = await Resource.create({
      title: "Today Upload - Newest",
      description: "Today notes",
      fileName: "today.pdf",
      fileUrl: "/uploads/today.pdf",
      fileSize: 100000,
      fileType: "application/pdf",
      category: "NOTES",
      format: "pdf",
      uploadedBy: userId,
      createdAt: todayUpload
    });

    // Query vault with sort=recent
    const res = await request(app)
      .get("/api/resources?sort=recent")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const items = res.body.data.items;

    // ALL 4 resources must be returned — not limited to 1, and no age cutoff
    expect(items.length).toBe(4);
    expect(items[0]._id).toBe(rToday._id.toString());
    expect(items[1]._id).toBe(rYesterday._id.toString());
    expect(items[2]._id).toBe(r3Days._id.toString());
    expect(items[3]._id).toBe(rOld._id.toString());
  });

  it("uses deterministic secondary sort (_id: -1) when createdAt timestamps are identical", async () => {
    const sameTimestamp = new Date("2026-10-10T10:00:00.000Z");

    const r1 = await Resource.create({
      title: "Batch Item 1",
      fileName: "b1.pdf",
      fileUrl: "/uploads/b1.pdf",
      fileSize: 50000,
      fileType: "application/pdf",
      category: "NOTES",
      uploadedBy: userId,
      createdAt: sameTimestamp
    });

    const r2 = await Resource.create({
      title: "Batch Item 2",
      fileName: "b2.pdf",
      fileUrl: "/uploads/b2.pdf",
      fileSize: 50000,
      fileType: "application/pdf",
      category: "NOTES",
      uploadedBy: userId,
      createdAt: sameTimestamp
    });

    const r3 = await Resource.create({
      title: "Batch Item 3",
      fileName: "b3.pdf",
      fileUrl: "/uploads/b3.pdf",
      fileSize: 50000,
      fileType: "application/pdf",
      category: "NOTES",
      uploadedBy: userId,
      createdAt: sameTimestamp
    });

    // With identical timestamps, _id: -1 must sort r3 first, then r2, then r1
    const res = await request(app)
      .get("/api/resources?sort=recent")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    const items = res.body.data.items;
    expect(items.length).toBe(3);
    expect(items[0]._id).toBe(r3._id.toString());
    expect(items[1]._id).toBe(r2._id.toString());
    expect(items[2]._id).toBe(r1._id.toString());
  });

  it("applies sorting before pagination so resources remain correctly ordered across pages", async () => {
    const baseTime = Date.now();
    const createdDocs = [];

    // Create 5 documents with distinct timestamps
    for (let i = 0; i < 5; i++) {
      const doc = await Resource.create({
        title: `Doc Page Test ${i}`,
        fileName: `page_test_${i}.pdf`,
        fileUrl: `/uploads/page_test_${i}.pdf`,
        fileSize: 50000,
        fileType: "application/pdf",
        category: "NOTES",
        uploadedBy: userId,
        createdAt: new Date(baseTime + i * 1000) // index 4 has latest time
      });
      createdDocs.push(doc);
    }

    // Page 1 with limit 2 -> should return doc 4, doc 3
    const page1Res = await request(app)
      .get("/api/resources?sort=recent&page=1&limit=2")
      .set("Authorization", `Bearer ${authToken}`);
    expect(page1Res.body.data.items.length).toBe(2);
    expect(page1Res.body.data.items[0]._id).toBe(createdDocs[4]._id.toString());
    expect(page1Res.body.data.items[1]._id).toBe(createdDocs[3]._id.toString());

    // Page 2 with limit 2 -> should return doc 2, doc 1
    const page2Res = await request(app)
      .get("/api/resources?sort=recent&page=2&limit=2")
      .set("Authorization", `Bearer ${authToken}`);
    expect(page2Res.body.data.items.length).toBe(2);
    expect(page2Res.body.data.items[0]._id).toBe(createdDocs[2]._id.toString());
    expect(page2Res.body.data.items[1]._id).toBe(createdDocs[1]._id.toString());

    // Page 3 with limit 2 -> should return doc 0
    const page3Res = await request(app)
      .get("/api/resources?sort=recent&page=3&limit=2")
      .set("Authorization", `Bearer ${authToken}`);
    expect(page3Res.body.data.items.length).toBe(1);
    expect(page3Res.body.data.items[0]._id).toBe(createdDocs[0]._id.toString());
  });

  it("combines 'recent' sort seamlessly with department, semester, category, format, and search filters", async () => {
    const baseTime = Date.now();

    // Matching resource 1: newer
    const matchNewer = await Resource.create({
      title: "Advanced AI Lecture Notes Unit 2",
      description: "Neural networks lecture notes",
      fileName: "ai_unit2.pdf",
      fileUrl: "/uploads/ai_unit2.pdf",
      fileSize: 200000,
      fileType: "application/pdf",
      category: "NOTES",
      department: "Artificial Intelligence & Data Science",
      semester: "Sem 5",
      format: "pdf",
      uploadedBy: userId,
      createdAt: new Date(baseTime + 20000)
    });

    // Matching resource 2: older
    const matchOlder = await Resource.create({
      title: "Advanced AI Lecture Notes Unit 1",
      description: "Basics of deep learning lecture notes",
      fileName: "ai_unit1.pdf",
      fileUrl: "/uploads/ai_unit1.pdf",
      fileSize: 180000,
      fileType: "application/pdf",
      category: "NOTES",
      department: "Artificial Intelligence & Data Science",
      semester: "Sem 5",
      format: "pdf",
      uploadedBy: userId,
      createdAt: new Date(baseTime + 10000)
    });

    // Non-matching resource (different department)
    await Resource.create({
      title: "Mechanical CAD Unit 1",
      description: "CAD drawings",
      fileName: "cad.pdf",
      fileUrl: "/uploads/cad.pdf",
      fileSize: 150000,
      fileType: "application/pdf",
      category: "NOTES",
      department: "Mechanical Engineering",
      semester: "Sem 5",
      format: "pdf",
      uploadedBy: userId,
      createdAt: new Date(baseTime + 30000)
    });

    const res = await request(app)
      .get("/api/resources?sort=recent&department=Artificial%20Intelligence%20%26%20Data%20Science&semester=Sem%205&category=NOTES&format=pdf&search=Lecture")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    const items = res.body.data.items;
    expect(items.length).toBe(2);
    expect(items[0]._id).toBe(matchNewer._id.toString());
    expect(items[1]._id).toBe(matchOlder._id.toString());
  });
});
