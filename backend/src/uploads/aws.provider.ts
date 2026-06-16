import type { Express } from "express";
import type { StorageProvider, StoredFile } from "../services/storage.service.js";

export class AWSProvider implements StorageProvider {
  async save(_file: Express.Multer.File, _namespace: string): Promise<StoredFile> {
    throw new Error("AWSProvider is an interface placeholder for a future deployment");
  }

  async delete(_key: string): Promise<void> {
    throw new Error("AWSProvider is an interface placeholder for a future deployment");
  }
}
