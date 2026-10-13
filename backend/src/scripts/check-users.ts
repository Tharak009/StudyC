import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env") });

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/studyconnect";

async function main() {
  console.log("Connecting to URI:", uri.replace(/\/\/.*@/, "//***:***@"));
  await mongoose.connect(uri);

  const users = await User.find({}).select("+password");
  console.log("Total Users in DB:", users.length);

  for (const u of users) {
    console.log("\n----------------------------------------");
    console.log("ID:", u._id.toString());
    console.log("Email:", u.email);
    console.log("Full Name:", u.fullName);
    console.log("Roll Number:", u.rollNumber);
    console.log("Role:", u.role);
    console.log("Status:", u.status);
    console.log("Password Hash:", u.password);

    const testPasswords = ["Admin@2026!", "Faculty@2026!", "Student@2026!", "SecurePass1", "Password123!", "password"];
    for (const pass of testPasswords) {
      const match = await u.comparePassword(pass);
      if (match) {
        console.log(`  ==> MATCHES password: "${pass}"`);
      }
    }
  }

  await mongoose.disconnect();
}

main().catch(console.error);
