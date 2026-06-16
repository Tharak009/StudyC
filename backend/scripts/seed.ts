import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, "..", ".env") });

import mongoose from "mongoose";
import { User } from "../src/models/user.model.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/studyconnect";

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const existing = await User.countDocuments();
  if (existing > 0) {
    console.log(`Database already has ${existing} users. Seeding skipped.`);
    await mongoose.disconnect();
    return;
  }

  const users = [
    {
      fullName: "Admin User",
      rollNumber: "ADMIN-001",
      department: "Administration",
      academicYear: 4,
      email: "admin@college.edu",
      password: "SecurePass1",
      role: "ADMIN" as const,
      status: "ACTIVE" as const,
      bio: "Platform administrator",
      interests: []
    },
    {
      fullName: "Aarav Sharma",
      rollNumber: "CS24-104",
      department: "Computer Science",
      academicYear: 2,
      email: "aarav@college.edu",
      password: "SecurePass1",
      role: "STUDENT" as const,
      status: "ACTIVE" as const,
      bio: "CS student",
      interests: ["web", "security"]
    },
    {
      fullName: "Meera Rao",
      rollNumber: "CS24-110",
      department: "Computer Science",
      academicYear: 2,
      email: "meera@college.edu",
      password: "SecurePass1",
      role: "STUDENT" as const,
      status: "ACTIVE" as const,
      bio: "CS student",
      interests: ["python", "data"]
    }
  ];

  for (const u of users) {
    await User.create(u);
    console.log(`  ${u.email} / SecurePass1 (role: ${u.role})`);
  }

  console.log(`\nCreated ${users.length} users`);
  await mongoose.disconnect();
  console.log("Done.");
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
