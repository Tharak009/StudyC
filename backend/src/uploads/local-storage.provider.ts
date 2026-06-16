import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { Express } from "express";
import { env } from "../config/env.js";
import type { StorageProvider, StoredFile } from "../services/storage.service.js";

export class LocalStorageProvider implements StorageProvider {
  private readonly root = path.resolve(process.cwd(), env.UPLOAD_DIR);

  async save(file: Express.Multer.File, namespace: string): Promise<StoredFile> {
    const directory = path.join(this.root, namespace);
    await mkdir(directory, { recursive: true });

    const extension = path.extname(file.originalname).toLowerCase();
    const filename = `${crypto.randomUUID()}${extension}`;
    const key = path.posix.join(namespace, filename);
    await writeFile(path.join(directory, filename), file.buffer);

    return {
      key,
      url: `/uploads/${key}`,
      mimeType: file.mimetype,
      size: file.size
    };
  }

  async delete(key: string): Promise<void> {
    const resolved = path.resolve(this.root, key);
    if (!resolved.startsWith(`${this.root}${path.sep}`)) return;
    await unlink(resolved).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}
