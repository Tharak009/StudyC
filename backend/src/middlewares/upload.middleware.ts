import path from "node:path";
import multer from "multer";
import { env } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedAttachmentMimeTypes = new Set([
  // Images
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
  // Audio & Voice Notes
  "audio/webm",
  "audio/ogg",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/aac",
  "audio/x-m4a",
  "audio/m4a",
  "audio/3gpp"
]);

const dangerousExtensions = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".sh",
  ".bash",
  ".ps1",
  ".vbs",
  ".js",
  ".mjs",
  ".html",
  ".htm",
  ".svg",
  ".php",
  ".py",
  ".rb",
  ".jar",
  ".com",
  ".scr",
  ".msi",
  ".dll"
]);

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024, files: 1 },
  fileFilter(_request, file, callback) {
    const ext = path.extname(file?.originalname || "").toLowerCase();
    if (dangerousExtensions.has(ext)) {
      callback(new ApiError(415, "This file type is not allowed", [], "INVALID_FILE_TYPE"));
      return;
    }
    const mime = ((file?.mimetype || "").split(";")[0] || "").trim().toLowerCase();
    if (!allowedMimeTypes.has(mime)) {
      callback(new ApiError(415, "Only JPEG, PNG, and WebP images are allowed", [], "INVALID_FILE_TYPE"));
      return;
    }
    callback(null, true);
  }
});

export const profilePictureUpload = imageUpload.single("profilePicture");
export const communityBannerUpload = imageUpload.single("bannerImage");
export const eventImageUpload = imageUpload.single("eventImage");

export const chatAttachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024, files: 5 },
  fileFilter(_request, file, callback) {
    const ext = path.extname(file?.originalname || "").toLowerCase();
    if (dangerousExtensions.has(ext)) {
      callback(
        new ApiError(
          415,
          "Executable and dangerous file extensions are strictly prohibited",
          [],
          "DANGEROUS_FILE_TYPE"
        )
      );
      return;
    }
    const mime = ((file?.mimetype || "").split(";")[0] || "").trim().toLowerCase();
    if (!allowedAttachmentMimeTypes.has(mime)) {
      callback(
        new ApiError(
          415,
          "Only images, audio notes, PDFs, documents, and archives are allowed",
          [],
          "INVALID_ATTACHMENT_TYPE"
        )
      );
      return;
    }
    callback(null, true);
  }
}).array("attachments", 5);

const allowedResourceMimeTypes = new Set([
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip",
  "application/x-zip-compressed",
  "image/jpeg",
  "image/png"
]);

export const resourceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter(_request, file, callback) {
    if (!allowedResourceMimeTypes.has(file.mimetype)) {
      callback(
        new ApiError(
          415,
          "Only PDF, PPT, PPTX, DOC, DOCX, ZIP, JPG, and PNG files are allowed",
          [],
          "INVALID_RESOURCE_TYPE"
        )
      );
      return;
    }
    callback(null, true);
  }
}).single("file");
