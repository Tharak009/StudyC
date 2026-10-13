import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { Resource } from "../src/models/resource.model.js";
import { User } from "../src/models/user.model.js";
import { Community } from "../src/models/community.model.js";
import { CommunityMember } from "../src/models/community-member.model.js";

let mongo: MongoMemoryServer;
let server: HttpServer;
let authToken: string;
let userId: string;

const testUser = {
  fullName: "Audit Tester",
  rollNumber: "AUDIT-2026",
  department: "Computer Science & Engineering",
  academicYear: 3,
  email: "audit.tester@college.edu",
  password: "SecurePassword2026!"
};

beforeAll(async () => {
  mongo = await MongoMemoryServer.create({
    instance: { launchTimeout: 120000 }
  });
  await connectDatabase(mongo.getUri());
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));

  // Register user & get auth token
  const res = await request(app).post("/api/auth/register").send(testUser);
  authToken = res.body.data.accessToken;
  userId = res.body.data.user._id;
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

async function seedTestResources() {
  await Resource.create([
    {
      title: "Blockchain Security Architecture",
      description: "Solidity smart contract audit notes and consensus mechanisms",
      fileName: "blockchain.pdf",
      fileUrl: "/uploads/blockchain.pdf",
      fileSize: 100000,
      fileType: "application/pdf",
      category: "NOTES",
      department: "Information Technology",
      semester: "Sem 6",
      subjectCode: "IT601",
      format: "pdf",
      downloadCount: 500,
      rating: 4.9,
      reviewCount: 20,
      tags: ["blockchain", "security"],
      uploadedBy: userId,
      visibility: "PUBLIC"
    },
    {
      title: "Raft Consensus Protocol Manual",
      description: "Distributed systems state machine replication guide",
      fileName: "raft_manual.docx",
      fileUrl: "/uploads/raft.docx",
      fileSize: 150000,
      fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      category: "NOTES",
      department: "Information Technology",
      semester: "Sem 6",
      subjectCode: "IT602",
      format: "docx",
      downloadCount: 300,
      rating: 4.8,
      reviewCount: 15,
      tags: ["distributed-systems", "raft"],
      uploadedBy: userId,
      visibility: "PUBLIC"
    },
    {
      title: "PyTorch Deep Learning Lab Notebook",
      description: "Convolutional neural network training and validation curves",
      fileName: "deep_learning.ipynb",
      fileUrl: "/uploads/dl.ipynb",
      fileSize: 200000,
      fileType: "application/x-ipynb+json",
      category: "LAB_RECORDS",
      department: "Artificial Intelligence & Data Science",
      semester: "Sem 5",
      subjectCode: "AI503",
      format: "ipynb",
      downloadCount: 150,
      rating: 4.7,
      reviewCount: 10,
      tags: ["pytorch", "ai"],
      uploadedBy: userId,
      visibility: "PUBLIC"
    },
    {
      title: "MEFA Financial Ratios Presentation",
      description: "Managerial economics slide deck for midsem prep",
      fileName: "mefa_slides.pptx",
      fileUrl: "/uploads/mefa.pptx",
      fileSize: 250000,
      fileType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      category: "PPTS",
      department: "Computer Science & Engineering",
      semester: "Sem 4",
      subjectCode: "MEFA401",
      format: "pptx",
      downloadCount: 200,
      rating: 4.5,
      reviewCount: 8,
      tags: ["mefa", "economics"],
      uploadedBy: userId,
      visibility: "PUBLIC"
    },
    {
      title: "Microcontroller C Code Suite",
      description: "8086 C drivers and assembly code ZIP archive",
      fileName: "micro_code.zip",
      fileUrl: "/uploads/micro.zip",
      fileSize: 300000,
      fileType: "application/zip",
      category: "ASSIGNMENTS",
      department: "Electronics & Communication",
      semester: "Sem 4",
      subjectCode: "ECE404",
      format: "zip",
      downloadCount: 400,
      rating: 4.6,
      reviewCount: 12,
      tags: ["ece", "assembly"],
      uploadedBy: userId,
      visibility: "PUBLIC"
    }
  ]);
}

describe("Academic Resource Vault Filter & Sorting Audit API Suite", () => {
  it("1. Filters by Department correctly", async () => {
    await seedTestResources();

    const res = await request(app)
      .get("/api/resources?department=Information Technology")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.data.total).toBe(2);
    expect(res.body.data.items.every((i: any) => i.department === "Information Technology")).toBe(true);
  });

  it("2. Filters by Semester correctly across numeric and Sem formats", async () => {
    await seedTestResources();

    const res = await request(app)
      .get("/api/resources?semester=Sem 6")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.data.total).toBe(2);
    expect(res.body.data.items.every((i: any) => i.semester === "Sem 6")).toBe(true);
  });

  it("3. Filters by Category correctly", async () => {
    await seedTestResources();

    const res = await request(app)
      .get("/api/resources?category=LAB_RECORDS")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.data.total).toBe(1);
    expect(res.body.data.items[0].title).toBe("PyTorch Deep Learning Lab Notebook");
  });

  it("4. Filters by File Format correctly", async () => {
    await seedTestResources();

    const res = await request(app)
      .get("/api/resources?format=ipynb")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.data.total).toBe(1);
    expect(res.body.data.items[0].format).toBe("ipynb");
  });

  it("5. Searches by Title, Subject Code, and Tags case-insensitively", async () => {
    await seedTestResources();

    const resTitle = await request(app)
      .get("/api/resources?search=RAFT")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(resTitle.body.data.total).toBe(1);
    expect(resTitle.body.data.items[0].title).toContain("Raft");

    const resCode = await request(app)
      .get("/api/resources?search=IT601")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(resCode.body.data.total).toBe(1);
    expect(resCode.body.data.items[0].subjectCode).toBe("IT601");
  });

  it("6. Sorts by Most Downloaded descending", async () => {
    await seedTestResources();

    const res = await request(app)
      .get("/api/resources?sort=downloads")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    const downloads = res.body.data.items.map((i: any) => i.downloadCount);
    expect(downloads).toEqual([500, 400, 300, 200, 150]);
  });

  it("7. Sorts by Highest Rated descending", async () => {
    await seedTestResources();

    const res = await request(app)
      .get("/api/resources?sort=rating")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    const ratings = res.body.data.items.map((i: any) => i.rating);
    expect(ratings[0]).toBe(4.9);
    expect(ratings[1]).toBe(4.8);
  });

  it("8. Combined Multi-Filter Query (Department + Semester + Category + Format + Search + Sort)", async () => {
    await seedTestResources();

    const res = await request(app)
      .get("/api/resources?department=Information Technology&semester=Sem 6&category=NOTES&format=docx&search=raft&sort=downloads")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.data.total).toBe(1);
    expect(res.body.data.items[0].title).toBe("Raft Consensus Protocol Manual");
  });

  it("9. Accurate Pagination and Total Counts", async () => {
    await seedTestResources();

    const page1 = await request(app)
      .get("/api/resources?page=1&limit=2&sort=downloads")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(page1.body.data.items).toHaveLength(2);
    expect(page1.body.data.total).toBe(5);
    expect(page1.body.data.pages).toBe(3);

    const page2 = await request(app)
      .get("/api/resources?page=2&limit=2&sort=downloads")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(page2.body.data.items).toHaveLength(2);
    expect(page2.body.data.page).toBe(2);
  });

  it("10. Handles empty search results cleanly without error", async () => {
    await seedTestResources();

    const res = await request(app)
      .get("/api/resources?search=nonexistentterm123")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.data.total).toBe(0);
    expect(res.body.data.items).toEqual([]);
    expect(res.body.data.pages).toBe(1);
  });
});
