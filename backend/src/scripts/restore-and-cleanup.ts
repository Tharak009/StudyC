import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { config } from "dotenv";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, "..", "..", ".env") });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/studyconnect";
const LOCAL_URI = "mongodb://127.0.0.1:27017/studyconnect";

async function executeRestorationAndCleanup() {
  console.log("==================================================");
  console.log("🛠️ Starting StudyConnect Account & Resource Restoration");
  console.log("==================================================\n");

  // 1. Connect to Local DB to extract original users
  const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
  const localUsers = await localConn.db!.collection("users").find({}).toArray();
  console.log(`✓ Retrieved ${localUsers.length} original user documents from local DB.`);

  // 2. Connect to Atlas DB
  const atlasConn = await mongoose.createConnection(MONGODB_URI).asPromise();
  const atlasUsersCol = atlasConn.db!.collection("users");
  const atlasResourcesCol = atlasConn.db!.collection("resources");
  const atlasUploadSessionsCol = atlasConn.db!.collection("upload_sessions");

  // Backup existing users collection in Atlas before mutation
  const currentAtlasUsers = await atlasUsersCol.find({}).toArray();
  const backupUsersCol = atlasConn.db!.collection("users_backup_recovery");
  await backupUsersCol.deleteMany({});
  if (currentAtlasUsers.length > 0) {
    await backupUsersCol.insertMany(currentAtlasUsers);
  }
  console.log(`✓ Backed up ${currentAtlasUsers.length} current Atlas users to 'users_backup_recovery'.`);

  // Restoring original accounts to Atlas
  console.log("\n👤 Restoring Original User Accounts to Atlas...");
  for (const origUser of localUsers) {
    const filter = { email: origUser.email };
    const { _class, ...userData } = origUser;
    await atlasUsersCol.replaceOne(filter, userData, { upsert: true });
    console.log(`  ✓ Restored account: ${origUser.email} (Name: ${origUser.fullName}, Roll: ${origUser.rollNumber})`);
  }

  // Verify restored users in Atlas
  const restoredUser = await atlasUsersCol.findOne({ email: "thilak@college.edu" });
  console.log("\nVERIFIED RESTORED ACCOUNT (thilak@college.edu):");
  console.log({
    _id: restoredUser?._id.toString(),
    email: restoredUser?.email,
    fullName: restoredUser?.fullName,
    rollNumber: restoredUser?.rollNumber,
    hasPasswordHash: Boolean(restoredUser?.password),
    status: restoredUser?.status
  });

  // 3. Resource Vault Audit & Cleanup
  console.log("\n📚 Auditing & Cleaning up Fake Seed Resources...");
  const currentResources = await atlasResourcesCol.find({}).toArray();
  console.log(`Total current resources in Atlas: ${currentResources.length}`);

  const fakeSeedResourceIds: any[] = [];
  const fakeResourceSummaries: any[] = [];

  for (const r of currentResources) {
    // Fake seed resources are identified by dummy /uploads/vault/ URLs created by seed.ts
    if (r.fileUrl && r.fileUrl.startsWith("/uploads/vault/")) {
      fakeSeedResourceIds.push(r._id);
      fakeResourceSummaries.push({
        _id: r._id.toString(),
        title: r.title,
        fileName: r.fileName,
        fileUrl: r.fileUrl,
        reason: "Matched dummy /uploads/vault/ path created by seed.ts (no physical file on disk)"
      });
    }
  }

  console.log(`\nIdentified ${fakeSeedResourceIds.length} confirmed fake/demo seed resources:`);
  fakeResourceSummaries.forEach((f) => console.log(` - [${f._id}] ${f.title} (${f.fileName}) -> ${f.reason}`));

  // Remove confirmed fake resources from DB
  if (fakeSeedResourceIds.length > 0) {
    const deleteRes = await atlasResourcesCol.deleteMany({ _id: { $in: fakeSeedResourceIds } });
    console.log(`\n✓ Successfully removed ${deleteRes.deletedCount} fake seed resources from Atlas DB.`);
  }

  // 4. Restore Real User Uploads from upload_sessions into resources collection
  console.log("\n📦 Restoring Genuine User Uploads into Resources Collection...");
  const completedSessions = await atlasUploadSessionsCol.find({ status: "COMPLETED" }).toArray();
  console.log(`Found ${completedSessions.length} completed user upload sessions.`);

  for (const session of completedSessions) {
    const existingResource = await atlasResourcesCol.findOne({
      fileUrl: `/${session.s3Key}`
    });

    if (!existingResource) {
      // Find corresponding user for uploadedBy reference
      const uploader = restoredUser || (await atlasUsersCol.findOne({ _id: session.userId }));
      const newResource = {
        title: session.title || session.fileName,
        description: session.description || "",
        fileName: session.fileName,
        fileUrl: `/${session.s3Key}`,
        fileSize: session.fileSize,
        fileType: session.mimeType,
        category: session.category || "NOTES",
        department: "Computer Science & Engineering",
        semester: "Sem 4",
        format: session.fileName.split(".").pop()?.toLowerCase() || "pdf",
        tags: session.tags || [],
        uploadedBy: session.userId,
        communityId: session.communityId,
        downloadCount: 0,
        rating: 5.0,
        reviewCount: 0,
        visibility: session.visibility || "PUBLIC",
        createdAt: session.createdAt || new Date(),
        updatedAt: session.updatedAt || new Date()
      };

      await atlasResourcesCol.insertOne(newResource);
      console.log(`  ✓ Restored genuine resource: "${newResource.title}" (${newResource.fileName}) -> ${newResource.fileUrl}`);
    }
  }

  const finalResources = await atlasResourcesCol.find({}).toArray();
  console.log(`\n✓ Final Genuine Resources Count in Vault: ${finalResources.length}`);
  finalResources.forEach((r) => {
    console.log(`   • [${r._id.toString()}] ${r.title} (${r.fileName}) -> ${r.fileUrl}`);
  });

  await localConn.close();
  await atlasConn.close();

  console.log("\n==================================================");
  console.log("🎉 Account & Resource Recovery Successfully Completed!");
  console.log("==================================================");
}

executeRestorationAndCleanup().catch(console.error);
