import path from "node:path";
import { existsSync } from "node:fs";
import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { verifyAccessToken } from "../utils/tokens.js";
import { DirectMessage } from "../models/direct-message.model.js";
import { Message } from "../models/message.model.js";
import { Conversation } from "../models/conversation.model.js";
import { CommunityMember } from "../models/community-member.model.js";
import { userRepository } from "../repositories/user.repository.js";
import { USER_STATUS } from "../constants/user-status.js";

const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  if (typeof req.query.token === "string" && req.query.token.trim()) {
    return req.query.token.trim();
  }
  return null;
};

const authenticateRequestUser = async (req: Request): Promise<string | null> => {
  const token = extractToken(req);
  if (!token) return null;
  try {
    const payload = verifyAccessToken(token);
    if (payload.type !== "access") return null;
    const user = await userRepository.findById(payload.sub);
    if (!user || user.status !== USER_STATUS.ACTIVE) return null;
    return user.id;
  } catch {
    return null;
  }
};

export const protectedDirectMessageAttachment = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  const userId = await authenticateRequestUser(req);
  if (!userId) {
    res.status(401).json({ success: false, message: "Authentication required to access this attachment", code: "AUTH_REQUIRED" });
    return;
  }

  const rawFilename = req.params.filename;
  const filename = Array.isArray(rawFilename) ? rawFilename[0] : rawFilename;
  if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    res.status(400).json({ success: false, message: "Invalid file name", code: "INVALID_PATH" });
    return;
  }

  const message = await DirectMessage.findOne({
    $or: [
      { "attachments.key": `direct-messages/${filename}` },
      { "attachments.url": { $regex: filename } }
    ]
  }).exec();

  if (!message) {
    res.status(404).json({ success: false, message: "Attachment not found", code: "ATTACHMENT_NOT_FOUND" });
    return;
  }

  if (message.isDeletedForEveryone) {
    res.status(404).json({ success: false, message: "Attachment was deleted", code: "MESSAGE_DELETED" });
    return;
  }

  if (message.deletedFor?.some((u) => u.toString() === userId)) {
    res.status(404).json({ success: false, message: "Attachment not available", code: "MESSAGE_DELETED_FOR_ME" });
    return;
  }

  const conversation = await Conversation.findById(message.conversationId).exec();
  if (!conversation || !conversation.participants.some((p) => p.toString() === userId)) {
    res.status(403).json({ success: false, message: "Access denied: you are not a participant in this conversation", code: "CONVERSATION_ACCESS_DENIED" });
    return;
  }

  const filePath = path.resolve(process.cwd(), env.UPLOAD_DIR, "direct-messages", filename);
  if (!existsSync(filePath)) {
    try {
      const db = mongoose.connection.db;
      if (db) {
        const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: "uploads" });
        const key = `direct-messages/${filename}`;
        const files = await bucket.find({ filename: key }).toArray();
        const firstFile = files?.[0];
        if (firstFile) {
          res.setHeader("Content-Type", firstFile.contentType || "application/octet-stream");
          res.setHeader("X-Content-Type-Options", "nosniff");
          return bucket.openDownloadStreamByName(key).pipe(res) as unknown as void;
        }
      }
    } catch {
      // Fall through to 404
    }
    res.status(404).json({ success: false, message: "File not found on server", code: "FILE_NOT_FOUND" });
    return;
  }

  res.setHeader("X-Content-Type-Options", "nosniff");
  res.sendFile(filePath);
};

export const protectedChatAttachment = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  const userId = await authenticateRequestUser(req);
  if (!userId) {
    res.status(401).json({ success: false, message: "Authentication required to access this attachment", code: "AUTH_REQUIRED" });
    return;
  }

  const rawFilename = req.params.filename;
  const filename = Array.isArray(rawFilename) ? rawFilename[0] : rawFilename;
  if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    res.status(400).json({ success: false, message: "Invalid file name", code: "INVALID_PATH" });
    return;
  }

  const message = await Message.findOne({
    $or: [
      { "attachments.key": `chat/${filename}` },
      { "attachments.url": { $regex: filename } }
    ]
  }).exec();

  if (!message) {
    res.status(404).json({ success: false, message: "Attachment not found", code: "ATTACHMENT_NOT_FOUND" });
    return;
  }

  if (message.isDeletedForEveryone) {
    res.status(404).json({ success: false, message: "Attachment was deleted", code: "MESSAGE_DELETED" });
    return;
  }

  if (message.deletedFor?.some((u) => u.toString() === userId)) {
    res.status(404).json({ success: false, message: "Attachment not available", code: "MESSAGE_DELETED_FOR_ME" });
    return;
  }

  const isMember = await CommunityMember.exists({
    communityId: message.communityId,
    userId
  });

  if (!isMember) {
    res.status(403).json({ success: false, message: "Access denied: you are not a member of this study circle", code: "COMMUNITY_ACCESS_DENIED" });
    return;
  }

  const filePath = path.resolve(process.cwd(), env.UPLOAD_DIR, "chat", filename);
  if (!existsSync(filePath)) {
    try {
      const db = mongoose.connection.db;
      if (db) {
        const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: "uploads" });
        const key = `chat/${filename}`;
        const files = await bucket.find({ filename: key }).toArray();
        const firstFile = files?.[0];
        if (firstFile) {
          res.setHeader("Content-Type", firstFile.contentType || "application/octet-stream");
          res.setHeader("X-Content-Type-Options", "nosniff");
          return bucket.openDownloadStreamByName(key).pipe(res) as unknown as void;
        }
      }
    } catch {
      // Fall through to 404
    }
    res.status(404).json({ success: false, message: "File not found on server", code: "FILE_NOT_FOUND" });
    return;
  }

  res.setHeader("X-Content-Type-Options", "nosniff");
  res.sendFile(filePath);
};
