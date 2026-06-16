import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { app } from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { User } from "../src/models/user.model.js";

let mongo: MongoMemoryServer;

const student = {
  fullName: "Aarav Sharma",
  rollNumber: "CS24-104",
  department: "Computer Science",
  academicYear: 2,
  email: "aarav@college.edu",
  password: "SecurePass1"
};

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDatabase(mongo.getUri());
});

afterEach(async () => {
  await User.deleteMany({});
});

afterAll(async () => {
  await disconnectDatabase();
  await mongo.stop();
});

describe("authentication API", () => {
  it("registers an approved student and returns an access token", async () => {
    const response = await request(app).post("/api/auth/register").send(student).expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe(student.email);
    expect(response.body.data.user.password).toBeUndefined();
    expect(response.body.data.accessToken).toEqual(expect.any(String));
    expect(response.headers["set-cookie"]?.[0]).toContain("studyconnect_refresh");
  });

  it("rejects registration from an unapproved domain", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...student, email: "aarav@gmail.com" })
      .expect(400);

    expect(response.body.code).toBe("EMAIL_DOMAIN_NOT_APPROVED");
  });

  it("logs in and loads the protected profile", async () => {
    await request(app).post("/api/auth/register").send(student).expect(201);
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: student.email, password: student.password })
      .expect(200);

    const profile = await request(app)
      .get("/api/users/profile")
      .set("Authorization", `Bearer ${login.body.data.accessToken}`)
      .expect(200);

    expect(profile.body.data.rollNumber).toBe(student.rollNumber);
  });
});
