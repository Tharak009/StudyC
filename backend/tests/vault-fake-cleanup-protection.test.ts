import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { app } from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { User } from "../src/models/user.model.js";
import { Resource } from "../src/models/resource.model.js";
import { runSeed } from "../src/scripts/seed.js";
import { USER_STATUS } from "../src/constants/user-status.js";

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create({
    instance: { launchTimeout: 120000 }
  });
  await connectDatabase(mongo.getUri());
  await runSeed();
}, 180000);

afterAll(async () => {
  await disconnectDatabase();
  if (mongo) {
    await mongo.stop();
  }
});

describe("Vault Preservation & Fake Resource Prevention Suite", () => {
  it("does not create dummy /uploads/vault/ resources during default seed execution", async () => {
    await runSeed();
    const vaultDummyResources = await Resource.find({
      fileUrl: { $regex: "^/uploads/vault/" }
    });
    expect(vaultDummyResources.length).toBe(0);
  });

  it("preserves genuine user uploads and original user accounts across seed executions", async () => {
    // Insert a simulated genuine user account
    const originalUser = await User.create({
      fullName: "Ch Thilak",
      rollNumber: "23EG112A14",
      department: "information technology",
      academicYear: 1,
      email: "thilak@college.edu",
      password: "$2a$12$JURvibZtP2vTeneqOckKT.cxjl2mrnGITeM9GZ8rUvw8u4h8kGLQ6",
      role: "STUDENT",
      status: USER_STATUS.ACTIVE
    });

    // Insert a simulated genuine uploaded resource
    const genuineResource = await Resource.create({
      title: "Unit-IV & V MEFA",
      fileName: "Unit-IV & V MEFA.pptx",
      fileUrl: "/uploads/6ac92cf5d4ee475deb80f740/cbcb6bde-1719-458a-bb16-b1724be4685f_Unit-IV___V_MEFA.pptx",
      fileSize: 1440540,
      fileType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      category: "NOTES",
      department: "Computer Science & Engineering",
      semester: "Sem 4",
      format: "pptx",
      uploadedBy: originalUser._id,
      visibility: "PUBLIC"
    });

    // Execute seed
    await runSeed();

    // Verify genuine resource and original user still exist intact
    const foundUser = await User.findOne({ email: "thilak@college.edu" });
    const foundResource = await Resource.findById(genuineResource._id);

    expect(foundUser).toBeDefined();
    expect(foundUser?.rollNumber).toBe("23EG112A14");
    expect(foundResource).toBeDefined();
    expect(foundResource?.fileName).toBe("Unit-IV & V MEFA.pptx");
    expect(foundResource?.fileUrl).toContain("cbcb6bde-1719-458a-bb16-b1724be4685f_Unit-IV___V_MEFA.pptx");
  });
});
