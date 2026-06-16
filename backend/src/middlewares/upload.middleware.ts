import multer from "multer";
import { env } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedAttachmentMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain"
]);

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024, files: 1 },
  fileFilter(_request, file, callback) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new ApiError(415, "Only JPEG, PNG, and WebP images are allowed", [], "INVALID_FILE_TYPE"));
      return;
    }
    callback(null, true);
  }
});

export const profilePictureUpload = imageUpload.single("profilePicture");
export const communityBannerUpload = imageUpload.single("bannerImage");

export const chatAttachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024, files: 5 },
  fileFilter(_request, file, callback) {
    if (!allowedAttachmentMimeTypes.has(file.mimetype)) {
      callback(
        new ApiError(
          415,
          "Only images, PDFs, Word documents, and text files are allowed",
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
