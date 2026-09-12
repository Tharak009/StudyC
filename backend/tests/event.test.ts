import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { describe, it, beforeAll, afterAll, afterEach, expect } from "vitest";
import { app } from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { Event } from "../src/models/event.model.js";
import { User } from "../src/models/user.model.js";

let mongo: MongoMemoryServer;

const testUser = {
  fullName: "Event Organizer",
  rollNumber: "CS24-200",
  department: "Computer Science",
  academicYear: 3,
  email: "organizer@college.edu",
  password: "SecurePass1"
};

beforeAll(async () => {
  mongo = await MongoMemoryServer.create({
    instance: { launchTimeout: 120000 }
  });
  await connectDatabase(mongo.getUri());
}, 180000);

afterEach(async () => {
  await Promise.all([Event.deleteMany({}), User.deleteMany({})]);
});

afterAll(async () => {
  await disconnectDatabase();
  if (mongo) {
    await mongo.stop();
  }
});

const getAuthToken = async () => {
  const response = await request(app).post("/api/auth/register").send(testUser).expect(201);
  return response.body.data.accessToken as string;
};

describe("Event API with Poster Image Upload", () => {
  it("creates an event without an image poster", async () => {
    const token = await getAuthToken();

    const res = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${token}`)
      .field("title", "Hackathon 2026")
      .field("description", "Annual coding competition for students")
      .field("category", "hackathons")
      .field("department", "Computer Science")
      .field("organizer", "Tech Club")
      .field("venue", "Auditorium A")
      .field("dateStr", "2026-09-20")
      .field("timeStr", "10:00 AM")
      .field("isVirtual", "false")
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe("Hackathon 2026");
    expect(res.body.data.eventImage).toBeUndefined();
  });

  it("creates an event with a valid JPEG image poster", async () => {
    const token = await getAuthToken();
    const fakeJpegBuffer = Buffer.from("fake-jpeg-image-binary-data");

    const res = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${token}`)
      .field("title", "AI Workshop 2026")
      .field("description", "Hands-on machine learning session")
      .field("category", "workshops")
      .field("department", "Computer Science")
      .field("organizer", "AI Society")
      .field("venue", "Lab 3")
      .field("dateStr", "2026-09-25")
      .field("timeStr", "02:00 PM")
      .field("isVirtual", "false")
      .attach("eventImage", fakeJpegBuffer, { filename: "poster.jpg", contentType: "image/jpeg" })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.eventImage).toBeDefined();
    expect(res.body.data.eventImage.url).toContain("/uploads/events/");
    expect(res.body.data.eventImage.mimeType).toBe("image/jpeg");
  });

  it("rejects invalid file types for event poster", async () => {
    const token = await getAuthToken();
    const textBuffer = Buffer.from("This is a text file not an image");

    const res = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${token}`)
      .field("title", "Invalid File Event")
      .field("description", "Testing file filter")
      .field("category", "workshops")
      .field("department", "Computer Science")
      .field("organizer", "AI Society")
      .field("venue", "Lab 3")
      .field("dateStr", "2026-09-25")
      .field("timeStr", "02:00 PM")
      .attach("eventImage", textBuffer, { filename: "notes.txt", contentType: "text/plain" })
      .expect(415);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe("INVALID_FILE_TYPE");
  });

  it("updates and replaces event image poster", async () => {
    const token = await getAuthToken();
    const jpeg1 = Buffer.from("poster-1-data");
    const jpeg2 = Buffer.from("poster-2-data");

    const createRes = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${token}`)
      .field("title", "Seminar 2026")
      .field("description", "Cybersecurity Seminar")
      .field("category", "reviews")
      .field("department", "IT")
      .field("organizer", "InfoSec")
      .field("venue", "Hall B")
      .field("dateStr", "2026-10-01")
      .field("timeStr", "11:00 AM")
      .attach("eventImage", jpeg1, { filename: "poster1.png", contentType: "image/png" })
      .expect(201);

    const eventId = createRes.body.data._id;
    const oldUrl = createRes.body.data.eventImage.url;

    const updateRes = await request(app)
      .patch(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${token}`)
      .attach("eventImage", jpeg2, { filename: "poster2.png", contentType: "image/png" })
      .expect(200);

    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.eventImage.url).not.toBe(oldUrl);
  });

  it("removes event image poster when removeImage is true", async () => {
    const token = await getAuthToken();
    const jpeg = Buffer.from("poster-data");

    const createRes = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${token}`)
      .field("title", "Webinar 2026")
      .field("description", "Cloud Architecture Webinar")
      .field("category", "workshops")
      .field("department", "CS")
      .field("organizer", "Cloud Club")
      .field("venue", "Online")
      .field("dateStr", "2026-10-05")
      .field("timeStr", "04:00 PM")
      .attach("eventImage", jpeg, { filename: "poster.webp", contentType: "image/webp" })
      .expect(201);

    const eventId = createRes.body.data._id;

    const updateRes = await request(app)
      .patch(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${token}`)
      .field("removeImage", "true")
      .expect(200);

    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.eventImage).toBeNull();
  });
});

describe("Event Approval, Authority, and Security Workflow", () => {
  const createStudentA = async () => {
    const res = await request(app).post("/api/auth/register").send({
      fullName: "Student A",
      rollNumber: "ST-001",
      department: "Computer Science",
      academicYear: 2,
      email: "studenta@college.edu",
      password: "SecurePass1"
    }).expect(201);
    return { token: res.body.data.accessToken as string, userId: res.body.data.user._id as string };
  };

  const createStudentB = async () => {
    const res = await request(app).post("/api/auth/register").send({
      fullName: "Student B",
      rollNumber: "ST-002",
      department: "Electrical Engineering",
      academicYear: 3,
      email: "studentb@college.edu",
      password: "SecurePass1"
    }).expect(201);
    return { token: res.body.data.accessToken as string, userId: res.body.data.user._id as string };
  };

  const createAdminUser = async () => {
    const res = await request(app).post("/api/auth/register").send({
      fullName: "Admin User",
      rollNumber: "ADM-001",
      department: "Administration",
      academicYear: 4,
      email: "adminuser@college.edu",
      password: "SecurePass1"
    }).expect(201);
    const userId = res.body.data.user._id as string;
    await User.findByIdAndUpdate(userId, { role: "ADMIN" }).exec();
    return { token: res.body.data.accessToken as string, userId };
  };

  const sampleEventData = {
    title: "Quantum Computing Seminar",
    description: "Introductory seminar on quantum algorithms",
    category: "workshops",
    department: "Physics",
    organizer: "Physics Society",
    venue: "Hall 1",
    dateStr: "2026-10-10",
    timeStr: "03:00 PM",
    isVirtual: false
  };

  it("1. Student creates event -> status is PENDING", async () => {
    const student = await createStudentA();
    const res = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${student.token}`)
      .send(sampleEventData)
      .expect(201);

    expect(res.body.data.approvalStatus).toBe("PENDING");
  });

  it("2. Newly created PENDING event does NOT appear in public Campus Events", async () => {
    const student = await createStudentA();
    const createRes = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${student.token}`)
      .send(sampleEventData)
      .expect(201);

    const pendingId = createRes.body.data._id;

    const listRes = await request(app)
      .get("/api/events")
      .set("Authorization", `Bearer ${student.token}`)
      .expect(200);

    const found = listRes.body.data.some((e: any) => e._id === pendingId);
    expect(found).toBe(false);
  });

  it("3. Admin can view pending events", async () => {
    const student = await createStudentA();
    const admin = await createAdminUser();

    const createRes = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${student.token}`)
      .send(sampleEventData)
      .expect(201);

    const pendingId = createRes.body.data._id;

    const listRes = await request(app)
      .get("/api/events?approvalStatus=PENDING")
      .set("Authorization", `Bearer ${admin.token}`)
      .expect(200);

    const found = listRes.body.data.some((e: any) => e._id === pendingId);
    expect(found).toBe(true);
  });

  it("4. Admin can approve event", async () => {
    const student = await createStudentA();
    const admin = await createAdminUser();

    const createRes = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${student.token}`)
      .send(sampleEventData)
      .expect(201);

    const eventId = createRes.body.data._id;

    const approveRes = await request(app)
      .patch(`/api/events/${eventId}/approve`)
      .set("Authorization", `Bearer ${admin.token}`)
      .expect(200);

    expect(approveRes.body.data.approvalStatus).toBe("APPROVED");
  });

  it("5. Approved event appears on Campus Events", async () => {
    const student = await createStudentA();
    const admin = await createAdminUser();

    const createRes = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${student.token}`)
      .send(sampleEventData)
      .expect(201);

    const eventId = createRes.body.data._id;

    await request(app)
      .patch(`/api/events/${eventId}/approve`)
      .set("Authorization", `Bearer ${admin.token}`)
      .expect(200);

    const listRes = await request(app)
      .get("/api/events")
      .set("Authorization", `Bearer ${student.token}`)
      .expect(200);

    const found = listRes.body.data.some((e: any) => e._id === eventId);
    expect(found).toBe(true);
  });

  it("6. Admin can reject event", async () => {
    const student = await createStudentA();
    const admin = await createAdminUser();

    const createRes = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${student.token}`)
      .send(sampleEventData)
      .expect(201);

    const eventId = createRes.body.data._id;

    const rejectRes = await request(app)
      .patch(`/api/events/${eventId}/reject`)
      .set("Authorization", `Bearer ${admin.token}`)
      .expect(200);

    expect(rejectRes.body.data.approvalStatus).toBe("REJECTED");
  });

  it("7. Rejected event does NOT appear on Campus Events", async () => {
    const student = await createStudentA();
    const admin = await createAdminUser();

    const createRes = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${student.token}`)
      .send(sampleEventData)
      .expect(201);

    const eventId = createRes.body.data._id;

    await request(app)
      .patch(`/api/events/${eventId}/reject`)
      .set("Authorization", `Bearer ${admin.token}`)
      .expect(200);

    const listRes = await request(app)
      .get("/api/events")
      .set("Authorization", `Bearer ${student.token}`)
      .expect(200);

    const found = listRes.body.data.some((e: any) => e._id === eventId);
    expect(found).toBe(false);
  });

  it("8. Student cannot approve event", async () => {
    const student = await createStudentA();

    const createRes = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${student.token}`)
      .send(sampleEventData)
      .expect(201);

    const eventId = createRes.body.data._id;

    await request(app)
      .patch(`/api/events/${eventId}/approve`)
      .set("Authorization", `Bearer ${student.token}`)
      .expect(403);
  });

  it("9. Student cannot reject event", async () => {
    const student = await createStudentA();

    const createRes = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${student.token}`)
      .send(sampleEventData)
      .expect(201);

    const eventId = createRes.body.data._id;

    await request(app)
      .patch(`/api/events/${eventId}/reject`)
      .set("Authorization", `Bearer ${student.token}`)
      .expect(403);
  });

  it("10. Student cannot approve their own event by manipulating update request", async () => {
    const student = await createStudentA();

    const createRes = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${student.token}`)
      .send(sampleEventData)
      .expect(201);

    const eventId = createRes.body.data._id;

    const updateRes = await request(app)
      .patch(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${student.token}`)
      .send({ title: "Updated Title", approvalStatus: "APPROVED", status: "APPROVED" })
      .expect(200);

    expect(updateRes.body.data.approvalStatus).toBe("PENDING");
  });

  it("11. Student A cannot delete Student B's event", async () => {
    const studentA = await createStudentA();
    const studentB = await createStudentB();

    const createRes = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${studentB.token}`)
      .send(sampleEventData)
      .expect(201);

    const eventId = createRes.body.data._id;

    await request(app)
      .delete(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${studentA.token}`)
      .expect(403);
  });

  it("12. Event creator can delete their own event", async () => {
    const studentA = await createStudentA();

    const createRes = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${studentA.token}`)
      .send(sampleEventData)
      .expect(201);

    const eventId = createRes.body.data._id;

    await request(app)
      .delete(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${studentA.token}`)
      .expect(200);
  });

  it("13. Admin can delete any event", async () => {
    const studentA = await createStudentA();
    const admin = await createAdminUser();

    const createRes = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${studentA.token}`)
      .send(sampleEventData)
      .expect(201);

    const eventId = createRes.body.data._id;

    await request(app)
      .delete(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .expect(200);
  });

  it("14. Unauthorized user cannot delete event", async () => {
    const studentA = await createStudentA();

    const createRes = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${studentA.token}`)
      .send(sampleEventData)
      .expect(201);

    const eventId = createRes.body.data._id;

    await request(app)
      .delete(`/api/events/${eventId}`)
      .expect(401);
  });

  it("15. Student cannot edit another student's event", async () => {
    const studentA = await createStudentA();
    const studentB = await createStudentB();

    const createRes = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${studentA.token}`)
      .send(sampleEventData)
      .expect(201);

    const eventId = createRes.body.data._id;

    await request(app)
      .patch(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${studentB.token}`)
      .send({ title: "Unauthorized Edit Attempt" })
      .expect(403);
  });

  it("16. Backend ignores student attempting to submit status=APPROVED on creation", async () => {
    const studentA = await createStudentA();

    const res = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${studentA.token}`)
      .send({
        ...sampleEventData,
        status: "APPROVED",
        approvalStatus: "APPROVED"
      })
      .expect(201);

    expect(res.body.data.approvalStatus).toBe("PENDING");
  });
});
