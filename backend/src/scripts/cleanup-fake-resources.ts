import mongoose from "mongoose";
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, "..", "..", ".env") });

import { Resource } from "../models/resource.model.js";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/studyconnect";

export async function cleanupFakeResources() {
  console.log("🔍 Scanning database for fake/demonstration resource records...");
  await mongoose.connect(MONGODB_URI);

  const fakeQuery = {
    $or: [
      { fileUrl: { $regex: "raw\\.githubusercontent\\.com/studyconnect/assets", $options: "i" } },
      { title: { $regex: "Transformer Architectures|Raft Consensus|Advanced Graph Algorithms|Autonomous Mobile Robotics", $options: "i" } }
    ]
  };

  const fakeRecords = await Resource.find(fakeQuery);

  console.log(`Found ${fakeRecords.length} demonstration resource records:`);
  fakeRecords.forEach((rec, idx) => {
    console.log(`  [${idx + 1}] ID: ${rec._id} | Title: "${rec.title}" | FileUrl: ${rec.fileUrl}`);
  });

  if (fakeRecords.length > 0) {
    const ids = fakeRecords.map((r) => r._id);
    const result = await Resource.deleteMany({ _id: { $in: ids } });
    console.log(`✓ Successfully deleted ${result.deletedCount} fake demonstration records from MongoDB.`);
  } else {
    console.log("✓ No fake demonstration records found in database.");
  }

  await mongoose.disconnect();
}

const isMain = process.argv[1]?.replace(/\\/g, "/").endsWith("cleanup-fake-resources.ts") || process.argv[1]?.replace(/\\/g, "/").endsWith("cleanup-fake-resources.js");
if (isMain) {
  cleanupFakeResources()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
