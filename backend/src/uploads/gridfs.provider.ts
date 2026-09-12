import { mkdir, unlink, writeFile } from "node:fs/promises";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { Express } from "express";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import type { StorageProvider, StoredFile } from "../services/storage.service.js";

export class GridFSStorageProvider implements StorageProvider {
  private readonly root = path.resolve(process.cwd(), env.UPLOAD_DIR);

  private getBucket(): mongoose.mongo.GridFSBucket {
    if (!mongoose.connection.db) {
      throw new Error("Database connection is not ready for GridFS storage");
    }
    return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "uploads"
    });
  }

  async save(file: Express.Multer.File, namespace: string): Promise<StoredFile> {
    const extension = path.extname(file.originalname).toLowerCase();
    const filename = `${crypto.randomUUID()}${extension}`;
    const key = path.posix.join(namespace, filename);

    // 1. Save to local disk cache (for fast local reads)
    try {
      const directory = path.join(this.root, namespace);
      await mkdir(directory, { recursive: true });
      await writeFile(path.join(directory, filename), file.buffer);
    } catch (err) {
      console.warn("Local disk cache write failed, continuing with GridFS:", err);
    }

    // 2. Save directly into MongoDB Atlas GridFS (globally accessible across all computers)
    const bucket = this.getBucket();
    const uploadStream = bucket.openUploadStream(key, {
      contentType: file.mimetype,
      metadata: {
        originalName: file.originalname,
        namespace,
        size: file.size
      }
    });

    await new Promise<void>((resolve, reject) => {
      uploadStream.on("finish", () => resolve());
      uploadStream.on("error", (err: Error) => reject(err));
      uploadStream.end(file.buffer);
    });

    return {
      key,
      url: `/uploads/${key}`,
      mimeType: file.mimetype,
      size: file.size
    };
  }

  async delete(key: string): Promise<void> {
    // 1. Delete from local cache
    try {
      const resolved = path.resolve(this.root, key);
      if (resolved.startsWith(`${this.root}${path.sep}`) && fs.existsSync(resolved)) {
        await unlink(resolved);
      }
    } catch {
      // Ignore local removal error
    }

    // 2. Delete from MongoDB GridFS
    try {
      const bucket = this.getBucket();
      const files = await bucket.find({ filename: key }).toArray();
      for (const file of files) {
        await bucket.delete(file._id);
      }
    } catch (err) {
      console.warn("GridFS delete failed:", err);
    }
  }
}
