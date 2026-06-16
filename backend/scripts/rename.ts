import mongoose from "mongoose";
import { User } from "../src/models/user.model.js";

async function run() {
  await mongoose.connect("mongodb://127.0.0.1:27017/studyconnect");
  await User.updateOne({ email: "aarav@college.edu" }, { $set: { fullName: "Eren" } });
  await User.updateOne({ email: "meera@college.edu" }, { $set: { fullName: "Mikasa" } });
  console.log("Updated: aarav -> Eren, meera -> Mikasa");
  await mongoose.disconnect();
}

run().catch(console.error);
