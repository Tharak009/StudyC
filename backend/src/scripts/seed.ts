import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { config } from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Ensure environment variables are loaded from backend root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, "..", "..", ".env") });

import { User } from "../models/user.model.js";
import { Community } from "../models/community.model.js";
import { CommunityMember } from "../models/community-member.model.js";
import { Resource } from "../models/resource.model.js";
import { Report } from "../models/report.model.js";
import { Notification } from "../models/notification.model.js";
import { ROLES } from "../constants/roles.js";
import { USER_STATUS } from "../constants/user-status.js";
import { COMMUNITY_VISIBILITY } from "../constants/community.js";
import { RESOURCE_CATEGORIES, RESOURCE_VISIBILITY } from "../constants/resource.js";
import { REPORT_TARGET_TYPES, REPORT_STATUS } from "../constants/report.js";
import { NOTIFICATION_TYPES } from "../constants/notification.js";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/studyconnect";

export async function runSeed(): Promise<void> {
  console.log("\n=======================================================");
  console.log("🌱 Starting StudyConnect Production Database Seeder...");
  console.log("=======================================================\n");

  const shouldDisconnect = mongoose.connection.readyState === 0;

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
      console.log(`✓ Connected to MongoDB at: ${MONGODB_URI.replace(/\/\/.*@/, "//***:***@")}`);
    }

    // ── 1. Non-Destructive Database Seeding ─────────────────────────────────
    console.log("🔍 Checking existing campus data (non-destructive seed mode)...");
    console.log("✓ Preserving all existing user accounts, resources, and community data.\n");

    // ── 2. Seed Campus Users ─────────────────────────────────────────────────
    console.log("👥 Seeding Verified Campus Users...");
    const adminPassword = "Admin@2026!";
    const facultyPassword = "Faculty@2026!";
    const studentPassword = "Student@2026!";

    // Helper upsert functions to ensure idempotency
    const upsertUser = async (userData: any) => {
      let user = await User.findOne({ email: userData.email });
      if (!user) {
        user = await User.create(userData);
      }
      return user;
    };

    const upsertCommunity = async (commData: any) => {
      let comm = await Community.findOne({ slug: commData.slug });
      if (!comm) {
        comm = await Community.create(commData);
      }
      return comm;
    };

    const upsertMember = async (communityId: any, userId: any, role: string) => {
      let member = await CommunityMember.findOne({ communityId, userId });
      if (!member) {
        member = await CommunityMember.create({ communityId, userId, role });
      }
      return member;
    };

    // Root Administrator
    const adminUser = await upsertUser({
      _id: new mongoose.Types.ObjectId("6aa4081d0e3763a915e15237"),
      fullName: "Dean Rajesh Sharma",
      rollNumber: "ADMIN-2026-001",
      department: "CSE",
      academicYear: 4,
      email: "admin@campus.edu",
      password: adminPassword,
      role: ROLES.ADMIN,
      status: USER_STATUS.ACTIVE,
      bio: "Campus Dean of Academics & Lead StudyConnect Platform Administrator. Ensuring academic excellence and collaborative safety.",
      interests: ["governance", "curriculum", "distributed-systems", "academics"],
      lastLogin: new Date()
    });

    // Faculty Moderator
    const facultyUser = await upsertUser({
      fullName: "Prof. Ananya Sharma",
      rollNumber: "FAC-CSE-012",
      department: "CSE",
      academicYear: 4,
      email: "prof.sharma@campus.edu",
      password: facultyPassword,
      role: ROLES.MODERATOR,
      status: USER_STATUS.ACTIVE,
      bio: "Associate Professor in Department of Computer Science. Faculty Advisor for ICPC competitive programming and algorithms research circle.",
      interests: ["algorithms", "graph-theory", "competitive-programming", "data-structures"],
      lastLogin: new Date()
    });

    // 4 Verified Students
    const studentAarav = await upsertUser({
      fullName: "Aarav Patel",
      rollNumber: "22BCSE101",
      department: "CSE",
      academicYear: 3,
      email: "aarav.patel@campus.edu",
      password: studentPassword,
      role: ROLES.STUDENT,
      status: USER_STATUS.ACTIVE,
      bio: "Full-Stack Engineer & Cloud Systems Builder | 7-day study streak 🔥 | GitHub: @aaravpatel | Building high-scale web architectures",
      interests: ["distributed-systems", "react", "golang", "redis", "cloud"],
      lastLogin: new Date()
    });

    const studentMeera = await upsertUser({
      fullName: "Meera Nair",
      rollNumber: "22BCSE142",
      department: "CSE",
      academicYear: 3,
      email: "meera.nair@campus.edu",
      password: studentPassword,
      role: ROLES.STUDENT,
      status: USER_STATUS.ACTIVE,
      bio: "Competitive Programmer & ICPC 2025 Regionalist | Algorithms Mentor | 7-day study streak 🔥 | Passionate about combinatorial algorithms",
      interests: ["algorithms", "competitive-programming", "graph-theory", "dp"],
      lastLogin: new Date()
    });

    const studentRohan = await upsertUser({
      fullName: "Rohan Gupta",
      rollNumber: "23BAIDS024",
      department: "AI & DS",
      academicYear: 2,
      email: "rohan.gupta@campus.edu",
      password: studentPassword,
      role: ROLES.STUDENT,
      status: USER_STATUS.ACTIVE,
      bio: "Deep Learning Researcher & PyTorch Hacker | Exploring LLM agentic workflows & transformers | 7-day study streak 🔥",
      interests: ["machine-learning", "pytorch", "nlp", "llms", "deep-learning"],
      lastLogin: new Date()
    });

    const studentAnanya = await upsertUser({
      fullName: "Ananya Singh",
      rollNumber: "23BAIDS088",
      department: "AI & DS",
      academicYear: 2,
      email: "ananya.singh@campus.edu",
      password: studentPassword,
      role: ROLES.STUDENT,
      status: USER_STATUS.ACTIVE,
      bio: "Robotics & Autonomous Systems Builder | ROS2, Gazebo & Drone Vision Systems | 7-day study streak 🔥",
      interests: ["robotics", "ros2", "computer-vision", "embedded", "drone-tech"],
      lastLogin: new Date()
    });

    const studentBothilak = await User.create({
      _id: new mongoose.Types.ObjectId("6aa431e98657a12710f40010"),
      fullName: "Bothilak",
      rollNumber: "IT102-12",
      department: "Computer Science & Engineering",
      academicYear: 3,
      email: "bothilak@campus.edu",
      password: studentPassword,
      role: ROLES.STUDENT,
      status: USER_STATUS.ACTIVE,
      bio: "Full-Stack Developer & StudyConnect Collaborator | 7-day streak 🔥",
      interests: ["full-stack", "web-development", "react", "node"],
      lastLogin: new Date()
    });

    console.log(`✓ Seeded 1 Root Admin: ${adminUser.email} (Password: Admin@2026!)`);
    console.log(`✓ Seeded 1 Faculty Moderator: ${facultyUser.email} (Password: Faculty@2026!)`);
    console.log(`✓ Seeded Verified Students: aarav.patel, meera.nair, rohan.gupta, ananya.singh, bothilak (Password: Student@2026!)\n`);

    // ── 3. Seed Official Campus Communities ──────────────────────────────────
    console.log("🏛️  Seeding Official Campus Communities & Study Stages...");

    // Community 1: Computer Science 2026 Batch Hub
    const cseCommunity = await upsertCommunity({
      name: "Computer Science 2026 Batch Hub",
      slug: "cs-2026-batch-hub",
      description: "Official batch community for CSE Class of 2026. Real-time announcements, lab submissions, midsem exam prep, and 24/7 drop-in audio study stages (#announcements, #algorithms-lab, #midsem-prep, 🔊 Drop-in Study Stage 1).",
      category: "Placement Preparation",
      tags: ["cse", "batch-2026", "algorithms", "midsem-prep", "placements"],
      visibility: COMMUNITY_VISIBILITY.PUBLIC,
      owner: adminUser._id,
      moderators: [facultyUser._id, adminUser._id],
      memberCount: 6,
      extensionPoints: {
        chatEnabled: true,
        resourcesEnabled: true,
        notificationsEnabled: true
      }
    });

    // Community 2: AI & Robotics Circle
    const aiCommunity = await upsertCommunity({
      name: "AI & Robotics Circle",
      slug: "ai-robotics-circle",
      description: "Collaborative research circle for Artificial Intelligence, neural networks, ROS2 robotics, and hardware-accelerated machine learning (#general, #paper-discussions, 🔊 Research Stage).",
      category: "Data Science",
      tags: ["ai", "robotics", "deep-learning", "ros2", "pytorch"],
      visibility: COMMUNITY_VISIBILITY.PUBLIC,
      owner: facultyUser._id,
      moderators: [facultyUser._id],
      memberCount: 4,
      extensionPoints: {
        chatEnabled: true,
        resourcesEnabled: true,
        notificationsEnabled: true
      }
    });

    // Community 3: Campus Academic Resource Vault
    const vaultCommunity = await upsertCommunity({
      name: "Campus Academic Resource Vault",
      slug: "campus-vault",
      description: "Official open repository for peer-reviewed lecture notes, previous exam question papers, lab manuals, and syllabus roadmaps across all departments.",
      category: "Academic Support",
      tags: ["vault", "academic-resources", "notes", "previous-papers", "syllabus"],
      visibility: COMMUNITY_VISIBILITY.PUBLIC,
      owner: adminUser._id,
      moderators: [facultyUser._id, adminUser._id],
      memberCount: 6,
      extensionPoints: {
        chatEnabled: true,
        resourcesEnabled: true,
        notificationsEnabled: true
      }
    });

    // Community Memberships
    await Promise.all([
      // CSE Batch Hub Memberships
      upsertMember(cseCommunity._id, adminUser._id, "OWNER"),
      upsertMember(cseCommunity._id, facultyUser._id, "MODERATOR"),
      upsertMember(cseCommunity._id, studentAarav._id, "MEMBER"),
      upsertMember(cseCommunity._id, studentMeera._id, "MEMBER"),
      upsertMember(cseCommunity._id, studentRohan._id, "MEMBER"),
      upsertMember(cseCommunity._id, studentAnanya._id, "MEMBER"),
      upsertMember(cseCommunity._id, studentBothilak._id, "MEMBER"),

      // AI & Robotics Circle Memberships
      upsertMember(aiCommunity._id, facultyUser._id, "OWNER"),
      upsertMember(aiCommunity._id, studentRohan._id, "MEMBER"),
      upsertMember(aiCommunity._id, studentAnanya._id, "MEMBER"),
      upsertMember(aiCommunity._id, studentAarav._id, "MEMBER"),

      // Campus Vault Memberships
      upsertMember(vaultCommunity._id, adminUser._id, "OWNER"),
      upsertMember(vaultCommunity._id, facultyUser._id, "MODERATOR"),
      upsertMember(vaultCommunity._id, studentAarav._id, "MEMBER"),
      upsertMember(vaultCommunity._id, studentMeera._id, "MEMBER"),
      upsertMember(vaultCommunity._id, studentRohan._id, "MEMBER"),
      upsertMember(vaultCommunity._id, studentAnanya._id, "MEMBER")
    ]);

    console.log(`✓ Seeded Community 1: "${cseCommunity.name}" (6 members)`);
    console.log(`✓ Seeded Community 2: "${aiCommunity.name}" (4 members)`);
    console.log(`✓ Seeded Community 3: "${vaultCommunity.name}" (6 members)\n`);

    // ── 4. Academic Vault (Only if explicitly enabled via SEED_DEMO_RESOURCES) ───
    if (process.env.SEED_DEMO_RESOURCES === "true") {
      console.log("📚 Seeding Campus Academic Vault Resources (SEED_DEMO_RESOURCES enabled)...");
      const sampleResources = [
      {
        title: "Unit 4 & 5 MEFA Lecture Notes",
        description: "Managerial Economics and Financial Analysis presentation covering capital budgeting, break-even analysis, and financial ratios.",
        fileName: "Unit-IV & V MEFA.pptx",
        fileUrl: "/uploads/vault/mefa_unit4.pptx",
        fileSize: 2450000,
        fileType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        category: "PPTS",
        department: "Computer Science & Engineering",
        semester: "Sem 4",
        subjectCode: "MEFA-401",
        format: "pptx",
        tags: ["mefa", "economics", "finance"],
        uploadedBy: studentAarav._id,
        communityId: vaultCommunity._id,
        downloadCount: 142,
        rating: 4.9,
        reviewCount: 18,
        visibility: RESOURCE_VISIBILITY.PUBLIC
      },
      {
        title: "Distributed Systems & Raft Consensus Manual",
        description: "Complete guide to Raft state machine replication, leader election, log matching, and network partition safety.",
        fileName: "unit 4 (2).docx",
        fileUrl: "/uploads/vault/unit_4_2.docx",
        fileSize: 185000,
        fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        category: "NOTES",
        department: "Information Technology",
        semester: "Sem 6",
        subjectCode: "IT-602",
        format: "docx",
        tags: ["distributed-systems", "raft", "blockchain"],
        uploadedBy: studentMeera._id,
        communityId: vaultCommunity._id,
        downloadCount: 98,
        rating: 4.8,
        reviewCount: 12,
        visibility: RESOURCE_VISIBILITY.PUBLIC
      },
      {
        title: "Deep Learning & PyTorch Notebook Lab",
        description: "Jupyter notebooks with PyTorch implementations for convolutional neural networks, RESNET-50 transfer learning, and loss curves.",
        fileName: "pytorch_lab_5.ipynb",
        fileUrl: "/uploads/vault/pytorch_lab.ipynb",
        fileSize: 420000,
        fileType: "application/x-ipynb+json",
        category: "LAB_RECORDS",
        department: "Artificial Intelligence & Data Science",
        semester: "Sem 5",
        subjectCode: "AI-503",
        format: "ipynb",
        tags: ["pytorch", "deep-learning", "python"],
        uploadedBy: studentRohan._id,
        communityId: vaultCommunity._id,
        downloadCount: 215,
        rating: 5.0,
        reviewCount: 24,
        visibility: RESOURCE_VISIBILITY.PUBLIC
      },
      {
        title: "Analog Circuits & Signals Solved Paper 2025",
        description: "Previous year midsem and endsem question papers with step-by-step circuit derivations and frequency response diagrams.",
        fileName: "eee_circuits_2025.pdf",
        fileUrl: "/uploads/vault/circuits_2025.pdf",
        fileSize: 1200000,
        fileType: "application/pdf",
        category: "PREVIOUS_PAPERS",
        department: "Electrical & Electronics",
        semester: "Sem 3",
        subjectCode: "EEE-301",
        format: "pdf",
        tags: ["eee", "circuits", "solved-paper"],
        uploadedBy: facultyUser._id,
        communityId: vaultCommunity._id,
        downloadCount: 74,
        rating: 4.7,
        reviewCount: 9,
        visibility: RESOURCE_VISIBILITY.PUBLIC
      },
      {
        title: "Microprocessors & Embedded Systems Lab Code",
        description: "Assembly language programs and C drivers for 8086 microcontrollers and ARM Cortex M4 embedded peripherals.",
        fileName: "ece_micro_lab.zip",
        fileUrl: "/uploads/vault/micro_lab.zip",
        fileSize: 3100000,
        fileType: "application/zip",
        category: "LAB_RECORDS",
        department: "Electronics & Communication",
        semester: "Sem 4",
        subjectCode: "ECE-404",
        format: "zip",
        tags: ["ece", "embedded", "arm"],
        uploadedBy: studentAnanya._id,
        communityId: vaultCommunity._id,
        downloadCount: 160,
        rating: 4.6,
        reviewCount: 15,
        visibility: RESOURCE_VISIBILITY.PUBLIC
      },
      {
        title: "Thermodynamics & Heat Transfer Cheat Sheet",
        description: "Summary formula sheet covering Carnot efficiency, entropy calculations, and conduction/convection heat exchanger equations.",
        fileName: "thermo_cheat_sheet.pdf",
        fileUrl: "/uploads/vault/thermo.pdf",
        fileSize: 950000,
        fileType: "application/pdf",
        category: "ASSIGNMENTS",
        department: "Mechanical Engineering",
        semester: "Sem 2",
        subjectCode: "MECH-201",
        format: "pdf",
        tags: ["mech", "thermo", "cheat-sheet"],
        uploadedBy: adminUser._id,
        communityId: vaultCommunity._id,
        downloadCount: 88,
        rating: 4.9,
        reviewCount: 11,
        visibility: RESOURCE_VISIBILITY.PUBLIC
      },
      {
        title: "Engineering Mathematics 1 Question Bank",
        description: "Comprehensive question bank for differential calculus, linear algebra, vector calculus, and infinite series.",
        fileName: "math1_qbank.pdf",
        fileUrl: "/uploads/vault/math1_qbank.pdf",
        fileSize: 1500000,
        fileType: "application/pdf",
        category: "QUESTION_BANKS",
        department: "Computer Science & Engineering",
        semester: "Sem 1",
        subjectCode: "MATH-101",
        format: "pdf",
        tags: ["math", "calculus", "qbank"],
        uploadedBy: facultyUser._id,
        communityId: vaultCommunity._id,
        downloadCount: 310,
        rating: 5.0,
        reviewCount: 35,
        visibility: RESOURCE_VISIBILITY.PUBLIC
      },
      {
        title: "Blockchain & Smart Contracts Security Code ZIP",
        description: "Solidity smart contract examples, Hardhat unit test suite, and reentrancy attack mitigation benchmarks.",
        fileName: "blockchain_code.zip",
        fileUrl: "/uploads/vault/blockchain_code.zip",
        fileSize: 4500000,
        fileType: "application/zip",
        category: "ASSIGNMENTS",
        department: "Information Technology",
        semester: "Sem 8",
        subjectCode: "IT-801",
        format: "zip",
        tags: ["blockchain", "solidity", "crypto"],
        uploadedBy: studentMeera._id,
        communityId: vaultCommunity._id,
        downloadCount: 275,
        rating: 5.0,
        reviewCount: 29,
        visibility: RESOURCE_VISIBILITY.PUBLIC
      }
    ];

    for (const resItem of sampleResources) {
      const existingRes = await Resource.findOne({ title: resItem.title, fileName: resItem.fileName });
      if (!existingRes) {
        await Resource.create(resItem);
      }
    }
      console.log("✓ Seeded Academic Vault resources (demo mode).\n");
    } else {
      console.log("ℹ️  Skipping fake demo resource seeding (SEED_DEMO_RESOURCES not enabled).\n");
    }

    // ── 5. Seed Active Campus Events & Countdowns ─────────────────────────────
    console.log("⏰ Seeding Active Campus Events & Notification Countdowns...");

    const eventNotifications = [
      // Hackathon countdown notification
      {
        userId: studentAarav._id,
        type: NOTIFICATION_TYPES.ADMIN_ALERT,
        title: "Campus Hackathon 2026: Team Registration Open 🏆",
        message: "The 48-Hour Scalable AI & Autonomous Systems Hackathon countdown is on! Event starts in 3 days. Prize pool: $5,000 USD. Register your 4-member squad before Friday midnight at the Innovation Centre.",
        entityType: null,
        entityId: null,
        isRead: false
      },
      {
        userId: studentMeera._id,
        type: NOTIFICATION_TYPES.ADMIN_ALERT,
        title: "Campus Hackathon 2026: Team Registration Open 🏆",
        message: "The 48-Hour Scalable AI & Autonomous Systems Hackathon countdown is on! Event starts in 3 days. Prize pool: $5,000 USD. Register your 4-member squad before Friday midnight at the Innovation Centre.",
        entityType: null,
        entityId: null,
        isRead: false
      },
      // Assignment deadline countdown notification
      {
        userId: studentAarav._id,
        type: NOTIFICATION_TYPES.SYSTEM,
        title: "Deadline Alert: Algorithms Lab 4 (Max-Flow Min-Cut) ⏱️",
        message: "Final code submissions and test bench verification due in 48 hours. Submit your zip archives to the batch hub portal.",
        entityType: null,
        entityId: null,
        isRead: false
      },
      {
        userId: studentMeera._id,
        type: NOTIFICATION_TYPES.SYSTEM,
        title: "Deadline Alert: Algorithms Lab 4 (Max-Flow Min-Cut) ⏱️",
        message: "Final code submissions and test bench verification due in 48 hours. Submit your zip archives to the batch hub portal.",
        entityType: null,
        entityId: null,
        isRead: false
      }
    ];

    for (const notif of eventNotifications) {
      const existingNotif = await Notification.findOne({ userId: notif.userId, title: notif.title });
      if (!existingNotif) {
        await Notification.create(notif);
      }
    }
    console.log("✓ Seeded Hackathon & Assignment deadline countdown notifications.\n");

    // ── 8. Seed Sample Content Report for Admin Moderation Triage ────────────
    console.log("🛡️  Seeding Content Moderation Triage Report (#REP-9402)...");

    let sampleReport = await Report.findOne({ reporterId: studentAarav._id, targetId: studentMeera._id });
    if (!sampleReport) {
      sampleReport = await Report.create({
        reporterId: studentAarav._id,
        targetType: REPORT_TARGET_TYPES.USER,
        targetId: studentMeera._id,
        reason: "Suspected Copyright Infringement / Attribution Required",
        description: "Report #REP-9402: Suspected copyright infringement in course material upload. Please verify academic attribution before midterm exam week.",
        status: REPORT_STATUS.PENDING,
        reviewedBy: null,
        reviewedAt: null
      });
    }

    console.log(`✓ Seeded Pending Report: ${sampleReport.reason} (ID: ${sampleReport._id})\n`);

    console.log("=======================================================");
    console.log("🎉 StudyConnect Campus Database Seeding Completed!");
    console.log("=======================================================");
    console.log("Credentials Summary for Testing:");
    console.log("  • Root Admin: admin@campus.edu / Admin@2026!");
    console.log("  • Faculty:    prof.sharma@campus.edu / Faculty@2026!");
    console.log("  • Students:   aarav.patel@campus.edu, meera.nair@campus.edu,");
    console.log("                rohan.gupta@campus.edu, ananya.singh@campus.edu (Student@2026!)");
    console.log("=======================================================\n");

  } catch (error) {
    console.error("❌ Seeding failed with error:", error);
    throw error;
  } finally {
    if (shouldDisconnect) {
      await mongoose.disconnect();
      console.log("✓ Disconnected from database.");
    }
  }
}

// Auto-execute if script is directly run
const isMain = process.argv[1]?.replace(/\\/g, "/").endsWith("seed.ts") || process.argv[1]?.replace(/\\/g, "/").endsWith("seed.js");
if (isMain) {
  runSeed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
