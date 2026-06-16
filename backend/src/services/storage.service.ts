import type { Express } from "express";

export interface StoredFile {
  key: string;
  url: string;
  mimeType: string;
  size: number;
}

export interface StorageProvider {
  save(file: Express.Multer.File, namespace: string): Promise<StoredFile>;
  delete(key: string): Promise<void>;
}

export class StorageService {
  constructor(private readonly provider: StorageProvider) {}

  uploadProfilePicture(file: Express.Multer.File): Promise<StoredFile> {
    return this.provider.save(file, "profiles");
  }

  uploadCommunityBanner(file: Express.Multer.File): Promise<StoredFile> {
    return this.provider.save(file, "communities");
  }

  uploadChatAttachment(file: Express.Multer.File): Promise<StoredFile> {
    return this.provider.save(file, "chat");
  }

  uploadDirectMessageAttachment(file: Express.Multer.File): Promise<StoredFile> {
    return this.provider.save(file, "direct-messages");
  }

  uploadResource(file: Express.Multer.File): Promise<StoredFile> {
    return this.provider.save(file, "resources");
  }

  delete(key: string): Promise<void> {
    return this.provider.delete(key);
  }
}
