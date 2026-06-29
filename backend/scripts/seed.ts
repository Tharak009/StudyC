import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, "..", ".env") });
import mongoose from "mongoose";
import { User } from "../src/models/user.model.js";
import { Community } from "../src/models/community.model.js";
import { CommunityMember } from "../src/models/community-member.model.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/studyconnect";

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  // Create Users if not exist
  let admin = await User.findOne({ email: "admin@college.edu" });
  if (!admin) {
    admin = await User.create({
      fullName: "Admin User",
      rollNumber: "ADMIN-001",
      department: "Administration",
      academicYear: 4,
      email: "admin@college.edu",
      password: "SecurePass1",
      role: "ADMIN",
      status: "ACTIVE",
      bio: "Platform administrator",
      interests: []
    });
    console.log("Seeded Admin");
  }

  let aarav = await User.findOne({ email: "aarav@college.edu" });
  if (!aarav) {
    aarav = await User.create({
      fullName: "Aarav Sharma",
      rollNumber: "CS24-104",
      department: "Computer Science",
      academicYear: 2,
      email: "aarav@college.edu",
      password: "SecurePass1",
      role: "STUDENT",
      status: "ACTIVE",
      bio: "CS student",
      interests: ["web", "security"]
    });
    console.log("Seeded Aarav");
  }

  let meera = await User.findOne({ email: "meera@college.edu" });
  if (!meera) {
    meera = await User.create({
      fullName: "Meera Rao",
      rollNumber: "CS24-110",
      department: "Computer Science",
      academicYear: 2,
      email: "meera@college.edu",
      password: "SecurePass1",
      role: "STUDENT",
      status: "ACTIVE",
      bio: "CS student",
      interests: ["python", "data"]
    });
    console.log("Seeded Meera");
  }

  // Clear existing communities and members to re-seed cleanly
  await Community.deleteMany({});
  await CommunityMember.deleteMany({});
  console.log("Cleared old communities and members");

  // Create Communities
  const comms = [
    {
      name: "Java Coding Club",
      slug: "java-coding-club",
      description: "Learn and share Java OOPs, multi-threading, Spring Boot and more.",
      category: "Java Programming" as const,
      tags: ["java", "oop", "backend"],
      visibility: "public" as const,
      owner: admin._id,
      moderators: [admin._id],
      memberCount: 2,
      extensionPoints: { chatEnabled: true, resourcesEnabled: true, notificationsEnabled: true }
    },
    {
      name: "Python Explorers",
      slug: "python-explorers",
      description: "Dive deep into Python scripting, automation, Pandas and machine learning.",
      category: "Python Programming" as const,
      tags: ["python", "data", "ml"],
      visibility: "public" as const,
      owner: admin._id,
      moderators: [admin._id],
      memberCount: 2,
      extensionPoints: { chatEnabled: true, resourcesEnabled: true, notificationsEnabled: true }
    },
    {
      name: "Web Wizards",
      slug: "web-wizards",
      description: "A hub for HTML, CSS, JavaScript, React, Tailwind and modern web tech.",
      category: "Web Development" as const,
      tags: ["react", "node", "frontend", "web"],
      visibility: "public" as const,
      owner: aarav._id,
      moderators: [aarav._id],
      memberCount: 3,
      extensionPoints: { chatEnabled: true, resourcesEnabled: true, notificationsEnabled: true }
    }
  ];

  for (const c of comms) {
    const community = await Community.create(c);
    console.log(`Created community: ${community.name}`);

    // Create memberships
    if (community.slug === "java-coding-club") {
      await CommunityMember.create({ communityId: community._id, userId: admin._id, role: "OWNER" });
      await CommunityMember.create({ communityId: community._id, userId: aarav._id, role: "MEMBER" });
    } else if (community.slug === "python-explorers") {
      await CommunityMember.create({ communityId: community._id, userId: admin._id, role: "OWNER" });
      await CommunityMember.create({ communityId: community._id, userId: meera._id, role: "MEMBER" });
    } else if (community.slug === "web-wizards") {
      await CommunityMember.create({ communityId: community._id, userId: aarav._id, role: "OWNER" });
      await CommunityMember.create({ communityId: community._id, userId: admin._id, role: "MEMBER" });
      await CommunityMember.create({ communityId: community._id, userId: meera._id, role: "MEMBER" });
    }
  }

  console.log("Done seeding communities and memberships.");
  await mongoose.disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
