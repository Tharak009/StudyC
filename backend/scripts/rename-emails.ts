import mongoose from "mongoose";
import { User } from "../src/models/user.model.js";

async function run() {
  await mongoose.connect("mongodb://127.0.0.1:27017/studyconnect");
  await User.updateOne({ fullName: "Eren" }, { $set: { email: "eren@college.edu" } });
  await User.updateOne({ fullName: "Mikasa" }, { $set: { email: "mikasa@college.edu" } });
  console.log("Emails updated");
  await mongoose.disconnect();
}

run().catch(console.error);
