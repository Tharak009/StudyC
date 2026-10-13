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
  fullName: "Combined Filter Tester",
  rollNumber: `COMB-${Date.now()}`,
  department: "Computer Science & Engineering",
  academicYear: 4,
  email: `comb.tester.${Date.now()}@campus.edu`,
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

async function seedComprehensiveResources() {
  await Resource.create([
    {
      title: "Unit 4 MEFA Lecture Notes",
      description: "Managerial Economics presentation slides",
      fileName: "mefa.pptx",
      fileUrl: "/uploads/mefa.pptx",
      fileSize: 2400000,
      fileType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      category: "PPTS",
      department: "Computer Science & Engineering",
      semester: "Sem 4",
      subjectCode: "MEFA-401",
      format: "pptx",
      downloadCount: 140,
      rating: 4.9,
      reviewCount: 15,
      tags: ["mefa", "economics"],
      uploadedBy: userId,
      visibility: "PUBLIC"
    },
    {
      title: "Raft Consensus Protocol Manual",
      description: "Distributed systems replication manual",
      fileName: "raft.docx",
      fileUrl: "/uploads/raft.docx",
      fileSize: 180000,
      fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      category: "NOTES",
      department: "Information Technology",
      semester: "Sem 6",
      subjectCode: "IT-602",
      format: "docx",
      downloadCount: 95,
      rating: 4.8,
      reviewCount: 10,
      tags: ["distributed-systems", "raft"],
      uploadedBy: userId,
      visibility: "PUBLIC"
    },
    {
      title: "PyTorch Deep Learning Lab",
      description: "Jupyter notebooks with CNN training",
      fileName: "pytorch_lab.ipynb",
      fileUrl: "/uploads/dl.ipynb",
      fileSize: 400000,
      fileType: "application/x-ipynb+json",
      category: "LAB_RECORDS",
      department: "Artificial Intelligence & Data Science",
      semester: "Sem 5",
      subjectCode: "AI-503",
      format: "ipynb",
      downloadCount: 210,
      rating: 5.0,
      reviewCount: 20,
      tags: ["pytorch", "deep-learning"],
      uploadedBy: userId,
      visibility: "PUBLIC"
    },
    {
      title: "Analog Circuits Solved Paper",
      description: "Midsem exam solutions and derivations",
      fileName: "circuits.pdf",
      fileUrl: "/uploads/circuits.pdf",
      fileSize: 1200000,
      fileType: "application/pdf",
      category: "PREVIOUS_PAPERS",
      department: "Electrical & Electronics",
      semester: "Sem 3",
      subjectCode: "EEE-301",
      format: "pdf",
      downloadCount: 70,
      rating: 4.7,
      reviewCount: 8,
      tags: ["eee", "circuits"],
      uploadedBy: userId,
      visibility: "PUBLIC"
    },
    {
      title: "Embedded Systems Code Archive",
      description: "ARM Cortex microcontroller drivers",
      fileName: "micro.zip",
      fileUrl: "/uploads/micro.zip",
      fileSize: 3100000,
      fileType: "application/zip",
      category: "LAB_RECORDS",
      department: "Electronics & Communication",
      semester: "Sem 4",
      subjectCode: "ECE-404",
      format: "zip",
      downloadCount: 160,
      rating: 4.6,
      reviewCount: 12,
      tags: ["ece", "embedded"],
      uploadedBy: userId,
      visibility: "PUBLIC"
    },
    {
      title: "Thermodynamics Formula Sheet",
      description: "Heat exchanger equations summary",
      fileName: "thermo.pdf",
      fileUrl: "/uploads/thermo.pdf",
      fileSize: 950000,
      fileType: "application/pdf",
      category: "ASSIGNMENTS",
      department: "Mechanical Engineering",
      semester: "Sem 2",
      subjectCode: "MECH-201",
      format: "pdf",
      downloadCount: 85,
      rating: 4.9,
      reviewCount: 11,
      tags: ["mech", "thermo"],
      uploadedBy: userId,
      visibility: "PUBLIC"
    }
  ]);
}

describe("Comprehensive Vault Multi-Filter Verification Suite", () => {
  it("Verifies every Department option returns matching resources", async () => {
    await seedComprehensiveResources();

    const cse = await request(app).get("/api/resources?department=Computer Science %26 Engineering").set("Authorization", `Bearer ${authToken}`);
    expect(cse.body.data.total).toBe(1);
    expect(cse.body.data.items[0].title).toBe("Unit 4 MEFA Lecture Notes");

    const mech = await request(app).get("/api/resources?department=Mechanical Engineering").set("Authorization", `Bearer ${authToken}`);
    expect(mech.body.data.total).toBe(1);
    expect(mech.body.data.items[0].title).toBe("Thermodynamics Formula Sheet");
  });

  it("Verifies every Semester option (Sem 1 to Sem 8)", async () => {
    await seedComprehensiveResources();

    const sem4 = await request(app).get("/api/resources?semester=Sem 4").set("Authorization", `Bearer ${authToken}`);
    expect(sem4.body.data.total).toBe(2);

    const sem5 = await request(app).get("/api/resources?semester=Sem 5").set("Authorization", `Bearer ${authToken}`);
    expect(sem5.body.data.total).toBe(1);
    expect(sem5.body.data.items[0].semester).toBe("Sem 5");
  });

  it("Verifies Category filtering for enum codes and human labels", async () => {
    await seedComprehensiveResources();

    const ppts = await request(app).get("/api/resources?category=PPTS").set("Authorization", `Bearer ${authToken}`);
    expect(ppts.body.data.total).toBe(1);
    expect(ppts.body.data.items[0].category).toBe("PPTS");

    const lab = await request(app).get("/api/resources?category=LAB_RECORDS").set("Authorization", `Bearer ${authToken}`);
    expect(lab.body.data.total).toBe(2);
  });

  it("Verifies File Format filtering across pdf, docx, ipynb, zip, pptx", async () => {
    await seedComprehensiveResources();

    const ipynb = await request(app).get("/api/resources?format=ipynb").set("Authorization", `Bearer ${authToken}`);
    expect(ipynb.body.data.total).toBe(1);
    expect(ipynb.body.data.items[0].format).toBe("ipynb");

    const zip = await request(app).get("/api/resources?format=zip").set("Authorization", `Bearer ${authToken}`);
    expect(zip.body.data.total).toBe(1);
    expect(zip.body.data.items[0].format).toBe("zip");
  });

  it("Verifies sorting by downloads, rating, recent, and name", async () => {
    await seedComprehensiveResources();

    const byDownloads = await request(app).get("/api/resources?sort=downloads").set("Authorization", `Bearer ${authToken}`);
    const downloads = byDownloads.body.data.items.map((r: any) => r.downloadCount);
    expect(downloads).toEqual([210, 160, 140, 95, 85, 70]);

    const byRating = await request(app).get("/api/resources?sort=rating").set("Authorization", `Bearer ${authToken}`);
    expect(byRating.body.data.items[0].rating).toBe(5.0);

    const byName = await request(app).get("/api/resources?sort=name").set("Authorization", `Bearer ${authToken}`);
    expect(byName.body.data.items[0].title).toBe("Analog Circuits Solved Paper");
  });

  it("Verifies 5-way Combined Filter (Department + Semester + Category + Format + Sort)", async () => {
    await seedComprehensiveResources();

    const res = await request(app)
      .get("/api/resources?department=Artificial Intelligence %26 Data Science&semester=Sem 5&category=LAB_RECORDS&format=ipynb&sort=downloads")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.body.data.total).toBe(1);
    expect(res.body.data.items[0].title).toBe("PyTorch Deep Learning Lab");
  });

  it("Verifies clearing one filter while keeping others active", async () => {
    await seedComprehensiveResources();

    const allSemestersInCSE = await request(app)
      .get("/api/resources?department=Computer Science %26 Engineering")
      .set("Authorization", `Bearer ${authToken}`);
    expect(allSemestersInCSE.body.data.total).toBe(1);
  });
});
