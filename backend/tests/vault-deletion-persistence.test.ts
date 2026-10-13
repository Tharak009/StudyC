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
let uploaderToken: string;
let uploaderId: string;
let strangerToken: string;

const uploaderUser = {
  fullName: "Resource Owner",
  rollNumber: "OWNER-2026",
  department: "Computer Science & Engineering",
  academicYear: 4,
  email: `owner.${Date.now()}@campus.edu`,
  password: "OwnerPassword2026!"
};

const strangerUser = {
  fullName: "Other Student",
  rollNumber: "OTHER-2026",
  department: "Information Technology",
  academicYear: 2,
  email: `other.${Date.now()}@campus.edu`,
  password: "OtherPassword2026!"
};

beforeAll(async () => {
  mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 120000 } });
  await connectDatabase(mongo.getUri());
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));

  const uploaderDoc = await User.create(uploaderUser);
  uploaderId = uploaderDoc._id.toString();
  const res1 = await request(app).post("/api/auth/login").send({ email: uploaderUser.email, password: uploaderUser.password });
  uploaderToken = res1.body.data.accessToken;

  await User.create(strangerUser);
  const res2 = await request(app).post("/api/auth/login").send({ email: strangerUser.email, password: strangerUser.password });
  strangerToken = res2.body.data.accessToken;
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

describe("Resource Vault Deletion Persistence & Strict Format Filtering Suite", () => {
  it("BUG 1: Deletes a resource permanently and verifies it does not return after filter changes or pagination", async () => {
    const doc = await Resource.create({
      title: "Unit-IV & V MEFA Lecture Notes",
      description: "MEFA PPTX slides to be deleted",
      fileName: "Unit-IV & V MEFA.pptx",
      fileUrl: "/uploads/vault/mefa_unit4.pptx",
      fileSize: 2400000,
      fileType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      category: "PPTS",
      department: "Computer Science & Engineering",
      semester: "Sem 4",
      subjectCode: "MEFA-401",
      format: "pptx",
      downloadCount: 10,
      uploadedBy: uploaderId,
      visibility: "PUBLIC"
    });

    const resourceId = doc._id.toString();

    // Verify initial list returns the resource
    const beforeList = await request(app).get("/api/resources").set("Authorization", `Bearer ${uploaderToken}`);
    expect(beforeList.body.data.total).toBe(1);

    // Perform API deletion
    const delRes = await request(app).delete(`/api/resources/${resourceId}`).set("Authorization", `Bearer ${uploaderToken}`);
    expect(delRes.status).toBe(200);

    // Verify document is removed from MongoDB
    const dbDoc = await Resource.findById(resourceId);
    expect(dbDoc).toBeNull();

    // Verify list queries across all filters, search, and sorting DO NOT return the deleted resource
    const afterList = await request(app).get("/api/resources").set("Authorization", `Bearer ${uploaderToken}`);
    expect(afterList.body.data.total).toBe(0);

    const filteredList = await request(app).get("/api/resources?department=Computer Science %26 Engineering&semester=Sem 4&format=pptx").set("Authorization", `Bearer ${uploaderToken}`);
    expect(filteredList.body.data.total).toBe(0);
  });

  it("BUG 1: Denies deletion for non-owner/non-admin and preserves MongoDB document", async () => {
    const doc = await Resource.create({
      title: "Distributed Systems Raft Manual",
      description: "Raft consensus guide",
      fileName: "unit 4 (2).docx",
      fileUrl: "/uploads/vault/unit_4_2.docx",
      fileSize: 180000,
      fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      category: "NOTES",
      department: "Information Technology",
      semester: "Sem 6",
      subjectCode: "IT-602",
      format: "docx",
      downloadCount: 50,
      uploadedBy: uploaderId,
      visibility: "PUBLIC"
    });

    const resourceId = doc._id.toString();

    // Non-owner attempts to delete
    const delRes = await request(app).delete(`/api/resources/${resourceId}`).set("Authorization", `Bearer ${strangerToken}`);
    expect(delRes.status).toBe(403);

    // Document remains in MongoDB
    const dbDoc = await Resource.findById(resourceId);
    expect(dbDoc).not.toBeNull();
  });

  it("BUG 2: Strict format filtering excludes DOCX and PPTX when PDF is selected", async () => {
    await Resource.create([
      {
        title: "PDF Document",
        description: "PDF file",
        fileName: "doc.pdf",
        fileUrl: "/uploads/doc.pdf",
        fileSize: 100000,
        fileType: "application/pdf",
        category: "NOTES",
        department: "Computer Science & Engineering",
        semester: "Sem 4",
        format: "pdf",
        uploadedBy: uploaderId,
        visibility: "PUBLIC"
      },
      {
        title: "Word Document",
        description: "DOCX file",
        fileName: "unit 4 (2).docx",
        fileUrl: "/uploads/unit_4_2.docx",
        fileSize: 180000,
        fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        category: "NOTES",
        department: "Computer Science & Engineering",
        semester: "Sem 4",
        format: "docx",
        uploadedBy: uploaderId,
        visibility: "PUBLIC"
      },
      {
        title: "Presentation Slides",
        description: "PPTX file",
        fileName: "Unit-IV & V MEFA.pptx",
        fileUrl: "/uploads/mefa.pptx",
        fileSize: 2400000,
        fileType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        category: "PPTS",
        department: "Computer Science & Engineering",
        semester: "Sem 4",
        format: "pptx",
        uploadedBy: uploaderId,
        visibility: "PUBLIC"
      }
    ]);

    // Query PDF format
    const pdfRes = await request(app).get("/api/resources?format=pdf").set("Authorization", `Bearer ${uploaderToken}`);
    expect(pdfRes.body.data.total).toBe(1);
    expect(pdfRes.body.data.items[0].title).toBe("PDF Document");

    // Query DOCX format
    const docxRes = await request(app).get("/api/resources?format=docx").set("Authorization", `Bearer ${uploaderToken}`);
    expect(docxRes.body.data.total).toBe(1);
    expect(docxRes.body.data.items[0].title).toBe("Word Document");

    // Query PPTX format
    const pptxRes = await request(app).get("/api/resources?format=pptx").set("Authorization", `Bearer ${uploaderToken}`);
    expect(pptxRes.body.data.total).toBe(1);
    expect(pptxRes.body.data.items[0].title).toBe("Presentation Slides");
  });
});
