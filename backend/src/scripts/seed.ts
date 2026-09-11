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
import { Conversation } from "../models/conversation.model.js";
import { DirectMessage } from "../models/direct-message.model.js";
import { Message } from "../models/message.model.js";
import { Report } from "../models/report.model.js";
import { Notification } from "../models/notification.model.js";
import { ROLES } from "../constants/roles.js";
import { USER_STATUS } from "../constants/user-status.js";
import { COMMUNITY_VISIBILITY } from "../constants/community.js";
import { RESOURCE_CATEGORIES, RESOURCE_VISIBILITY } from "../constants/resource.js";
import { REPORT_TARGET_TYPES, REPORT_STATUS } from "../constants/report.js";
import { NOTIFICATION_TYPES } from "../constants/notification.js";
import { MESSAGE_TYPES } from "../constants/message-types.js";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/studyconnect";

export async function runSeed(): Promise<void> {
  console.log("\n=======================================================");
  console.log("🌱 Starting StudyConnect Production Database Seeder...");
  console.log("=======================================================\n");

  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`✓ Connected to MongoDB at: ${MONGODB_URI.replace(/\/\/.*@/, "//***:***@")}`);

    // ── 1. Clean Database Slate ──────────────────────────────────────────────
    console.log("🧹 Wiping previous collections...");
    await Promise.all([
      User.deleteMany({}),
      Community.deleteMany({}),
      CommunityMember.deleteMany({}),
      Resource.deleteMany({}),
      Conversation.deleteMany({}),
      DirectMessage.deleteMany({}),
      Message.deleteMany({}),
      Report.deleteMany({}),
      Notification.deleteMany({})
    ]);
    console.log("✓ Successfully cleared collections for a fresh campus state.\n");

    // ── 2. Seed Campus Users ─────────────────────────────────────────────────
    console.log("👥 Seeding Verified Campus Users...");
    const adminPassword = "Admin@2026!";
    const facultyPassword = "Faculty@2026!";
    const studentPassword = "Student@2026!";

    // Root Administrator
    const adminUser = await User.create({
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
    const facultyUser = await User.create({
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
    const studentAarav = await User.create({
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

    const studentMeera = await User.create({
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

    const studentRohan = await User.create({
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

    const studentAnanya = await User.create({
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

    console.log(`✓ Seeded 1 Root Admin: ${adminUser.email} (Password: Admin@2026!)`);
    console.log(`✓ Seeded 1 Faculty Moderator: ${facultyUser.email} (Password: Faculty@2026!)`);
    console.log(`✓ Seeded 4 Verified Students: aarav.patel, meera.nair, rohan.gupta, ananya.singh (Password: Student@2026!)\n`);

    // ── 3. Seed Official Campus Communities ──────────────────────────────────
    console.log("🏛️  Seeding Official Campus Communities & Study Stages...");

    // Community 1: Computer Science 2026 Batch Hub
    const cseCommunity = await Community.create({
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
    const aiCommunity = await Community.create({
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

    // Community Memberships
    await Promise.all([
      // CSE Batch Hub Memberships
      CommunityMember.create({ communityId: cseCommunity._id, userId: adminUser._id, role: "OWNER" }),
      CommunityMember.create({ communityId: cseCommunity._id, userId: facultyUser._id, role: "MODERATOR" }),
      CommunityMember.create({ communityId: cseCommunity._id, userId: studentAarav._id, role: "MEMBER" }),
      CommunityMember.create({ communityId: cseCommunity._id, userId: studentMeera._id, role: "MEMBER" }),
      CommunityMember.create({ communityId: cseCommunity._id, userId: studentRohan._id, role: "MEMBER" }),
      CommunityMember.create({ communityId: cseCommunity._id, userId: studentAnanya._id, role: "MEMBER" }),

      // AI & Robotics Circle Memberships
      CommunityMember.create({ communityId: aiCommunity._id, userId: facultyUser._id, role: "OWNER" }),
      CommunityMember.create({ communityId: aiCommunity._id, userId: studentRohan._id, role: "MEMBER" }),
      CommunityMember.create({ communityId: aiCommunity._id, userId: studentAnanya._id, role: "MEMBER" }),
      CommunityMember.create({ communityId: aiCommunity._id, userId: studentAarav._id, role: "MEMBER" })
    ]);

    console.log(`✓ Seeded Community 1: "${cseCommunity.name}" (6 members)`);
    console.log(`✓ Seeded Community 2: "${aiCommunity.name}" (4 members)\n`);

    // ── 4. Seed Pre-populated Vault Resources ────────────────────────────────
    console.log("📚 Seeding Pre-populated Vault Academic Resources...");

    const res1 = await Resource.create({
      title: "Advanced Graph Algorithms & Dynamic Programming Deep Dive",
      description: "Comprehensive lecture notes covering Tarjan's SCC algorithm, Bellman-Ford, Ford-Fulkerson Max-Flow/Min-Cut, and state-space tree DP optimizations with handwritten proofs.",
      fileName: "advanced_graph_algorithms_dp_2026.pdf",
      fileUrl: "https://raw.githubusercontent.com/studyconnect/assets/main/resources/graph_algorithms_dp.pdf",
      fileSize: 4980736, // 4.75 MB
      fileType: "application/pdf",
      category: RESOURCE_CATEGORIES[0], // NOTES
      tags: ["algorithms", "graphs", "dp", "exam-prep", "cse"],
      uploadedBy: studentMeera._id,
      communityId: cseCommunity._id,
      downloadCount: 142,
      visibility: RESOURCE_VISIBILITY.PUBLIC
    });

    const res2 = await Resource.create({
      title: "Distributed Systems: Raft Consensus & Byzantine Fault Tolerance",
      description: "In-depth reference notes on distributed state-machine replication, split-brain resolution, gRPC protocol design, and leader election protocols in Go.",
      fileName: "distributed_systems_raft_paxos.pdf",
      fileUrl: "https://raw.githubusercontent.com/studyconnect/assets/main/resources/distributed_systems_raft.pdf",
      fileSize: 6488064, // 6.19 MB
      fileType: "application/pdf",
      category: RESOURCE_CATEGORIES[0], // NOTES
      tags: ["distributed-systems", "consensus", "raft", "cse", "cloud"],
      uploadedBy: studentAarav._id,
      communityId: cseCommunity._id,
      downloadCount: 189,
      visibility: RESOURCE_VISIBILITY.PUBLIC
    });

    const res3 = await Resource.create({
      title: "Transformer Architectures & Self-Attention Implementation",
      description: "Annotated PyTorch implementation of Multi-Head Attention, Rotary Position Embeddings (RoPE), and KV-Cache for LLM inference from mathematical first principles.",
      fileName: "transformers_self_attention_scratch.ipynb",
      fileUrl: "https://raw.githubusercontent.com/studyconnect/assets/main/resources/transformers_attention.ipynb",
      fileSize: 2202009, // 2.1 MB
      fileType: "application/x-ipynb+json",
      category: RESOURCE_CATEGORIES[4], // LAB_RECORDS
      tags: ["ai", "deep-learning", "transformers", "nlp", "pytorch"],
      uploadedBy: studentRohan._id,
      communityId: aiCommunity._id,
      downloadCount: 215,
      visibility: RESOURCE_VISIBILITY.PUBLIC
    });

    const res4 = await Resource.create({
      title: "Autonomous Mobile Robotics SLAM & LiDAR Navigation Manual",
      description: "Official laboratory guide on ROS2 Navigation2 (Nav2), Cartographer 2D/3D SLAM, and Kalman filter sensor fusion on differential-drive mobile rovers.",
      fileName: "ros2_slam_navigation_manual.pdf",
      fileUrl: "https://raw.githubusercontent.com/studyconnect/assets/main/resources/ros2_slam_manual.pdf",
      fileSize: 3670016, // 3.5 MB
      fileType: "application/pdf",
      category: RESOURCE_CATEGORIES[4], // LAB_RECORDS
      tags: ["robotics", "ros2", "slam", "lidar", "navigation", "lab"],
      uploadedBy: studentAnanya._id,
      communityId: aiCommunity._id,
      downloadCount: 98,
      visibility: RESOURCE_VISIBILITY.PUBLIC
    });

    console.log(`✓ Seeded Vault Resource: "${res1.title}" (142 downloads)`);
    console.log(`✓ Seeded Vault Resource: "${res2.title}" (189 downloads)`);
    console.log(`✓ Seeded Vault Resource: "${res3.title}" (215 downloads)`);
    console.log(`✓ Seeded Vault Resource: "${res4.title}" (98 downloads)\n`);

    // ── 5. Seed Community Messages ───────────────────────────────────────────
    console.log("💬 Seeding Community Discussion Messages...");
    await Message.create([
      {
        communityId: cseCommunity._id,
        senderId: facultyUser._id,
        content: "Welcome everyone to the CSE 2026 Batch Hub! Midsem exam schedules and algorithms lab assignments will be posted in this space. Please check the Vault for reference materials.",
        messageType: MESSAGE_TYPES.TEXT,
        attachments: []
      },
      {
        communityId: cseCommunity._id,
        senderId: studentAarav._id,
        content: "Shared the Distributed Systems and Consensus notes in the Vault. Let me know if anyone wants to do a mock review in Drop-in Study Stage 1 tonight.",
        messageType: MESSAGE_TYPES.TEXT,
        attachments: []
      },
      {
        communityId: cseCommunity._id,
        senderId: studentMeera._id,
        content: "Added the Graph Theory and DP proof packet as well. Good luck with the lab submissions everyone! Reach out if you need help on Ford-Fulkerson.",
        messageType: MESSAGE_TYPES.TEXT,
        attachments: []
      },
      {
        communityId: aiCommunity._id,
        senderId: facultyUser._id,
        content: "Welcome to the AI & Robotics Circle! Please review the ROS2 Cartographer guidelines before this Friday's physical drone lab.",
        messageType: MESSAGE_TYPES.TEXT,
        attachments: []
      },
      {
        communityId: aiCommunity._id,
        senderId: studentRohan._id,
        content: "Uploaded the PyTorch Transformer self-attention Jupyter Notebook in the Vault. Feel free to clone the weights and test local inference.",
        messageType: MESSAGE_TYPES.TEXT,
        attachments: []
      },
      {
        communityId: aiCommunity._id,
        senderId: studentAnanya._id,
        content: "Sensor calibration for the LiDAR scanner is documented on page 14 of the new lab manual in Vault. Testing completed with zero drift!",
        messageType: MESSAGE_TYPES.TEXT,
        attachments: []
      }
    ]);
    console.log("✓ Seeded interactive study room message threads in both communities.\n");

    // ── 6. Seed Direct Messaging (1-on-1 Conversations) ──────────────────────
    console.log("✉️  Seeding 1-on-1 Direct Messaging Conversations...");

    // Conversation 1: Aarav <-> Meera
    const conv1 = await Conversation.create({
      participants: [studentAarav._id, studentMeera._id],
      lastMessage: {
        content: "Thanks! Let me know if you want to hop on the voice stage later to solve problem D together.",
        senderId: studentMeera._id,
        createdAt: new Date()
      },
      lastMessageAt: new Date()
    });

    await DirectMessage.create([
      {
        conversationId: conv1._id,
        senderId: studentAarav._id,
        content: "Hey Meera! Are you attending the ICPC mock contest this Saturday?",
        messageType: MESSAGE_TYPES.TEXT,
        read: true,
        readAt: new Date(Date.now() - 3600000),
        createdAt: new Date(Date.now() - 3600000)
      },
      {
        conversationId: conv1._id,
        senderId: studentMeera._id,
        content: "Hey Aarav! Yes definitely, our team has been practicing segment trees and max flow.",
        messageType: MESSAGE_TYPES.TEXT,
        read: true,
        readAt: new Date(Date.now() - 2700000),
        createdAt: new Date(Date.now() - 2700000)
      },
      {
        conversationId: conv1._id,
        senderId: studentAarav._id,
        content: "Awesome! Did you review the graph algorithms notes you uploaded? They are super clear.",
        messageType: MESSAGE_TYPES.TEXT,
        read: true,
        readAt: new Date(Date.now() - 1800000),
        createdAt: new Date(Date.now() - 1800000)
      },
      {
        conversationId: conv1._id,
        senderId: studentMeera._id,
        content: "Thanks! Let me know if you want to hop on the voice stage later to solve problem D together.",
        messageType: MESSAGE_TYPES.TEXT,
        read: false,
        createdAt: new Date(Date.now() - 900000)
      }
    ]);

    // Conversation 2: Rohan <-> Ananya
    const conv2 = await Conversation.create({
      participants: [studentRohan._id, studentAnanya._id],
      lastMessage: {
        content: "Yes, exact time-sync is locked at 30fps. Check the code snippet in the robotics vault manual!",
        senderId: studentAnanya._id,
        createdAt: new Date()
      },
      lastMessageAt: new Date()
    });

    await DirectMessage.create([
      {
        conversationId: conv2._id,
        senderId: studentRohan._id,
        content: "Hi Ananya, did you finish running the SLAM mapping node on the rover robot?",
        messageType: MESSAGE_TYPES.TEXT,
        read: true,
        readAt: new Date(Date.now() - 7200000),
        createdAt: new Date(Date.now() - 7200000)
      },
      {
        conversationId: conv2._id,
        senderId: studentAnanya._id,
        content: "Hey Rohan! Yes, cartographer completed the 2D occupancy grid with zero drift.",
        messageType: MESSAGE_TYPES.TEXT,
        read: true,
        readAt: new Date(Date.now() - 5400000),
        createdAt: new Date(Date.now() - 5400000)
      },
      {
        conversationId: conv2._id,
        senderId: studentRohan._id,
        content: "Great work! Is the camera frame synced with the LiDAR timestamp topic?",
        messageType: MESSAGE_TYPES.TEXT,
        read: true,
        readAt: new Date(Date.now() - 3600000),
        createdAt: new Date(Date.now() - 3600000)
      },
      {
        conversationId: conv2._id,
        senderId: studentAnanya._id,
        content: "Yes, exact time-sync is locked at 30fps. Check the code snippet in the robotics vault manual!",
        messageType: MESSAGE_TYPES.TEXT,
        read: true,
        readAt: new Date(Date.now() - 1800000),
        createdAt: new Date(Date.now() - 1800000)
      }
    ]);

    console.log(`✓ Seeded Conversation 1: Aarav <-> Meera (${conv1._id})`);
    console.log(`✓ Seeded Conversation 2: Rohan <-> Ananya (${conv2._id})\n`);

    // ── 7. Seed Active Campus Events & Countdowns ─────────────────────────────
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

    await Notification.create(eventNotifications);
    console.log("✓ Seeded Hackathon & Assignment deadline countdown notifications.\n");

    // ── 8. Seed Sample Content Report for Admin Moderation Triage ────────────
    console.log("🛡️  Seeding Content Moderation Triage Report (#REP-9402)...");

    const sampleReport = await Report.create({
      reporterId: studentAarav._id,
      targetType: REPORT_TARGET_TYPES.RESOURCE,
      targetId: res1._id,
      reason: "Suspected Copyright Infringement / Attribution Required",
      description: "Report #REP-9402: Suspected copyright infringement in course material upload. Please verify academic attribution before midterm exam week.",
      status: REPORT_STATUS.PENDING,
      reviewedBy: null,
      reviewedAt: null
    });

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
    await mongoose.disconnect();
    console.log("✓ Disconnected from database.");
  }
}

// Auto-execute if script is directly run
const isMain = process.argv[1]?.replace(/\\/g, "/").endsWith("seed.ts") || process.argv[1]?.replace(/\\/g, "/").endsWith("seed.js");
if (isMain) {
  runSeed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
