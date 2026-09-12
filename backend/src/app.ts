import path from "node:path";
import fs from "node:fs";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import hpp from "hpp";
import morgan from "morgan";
import { corsOptions } from "./config/cors.js";
import { env } from "./config/env.js";
import {
  errorMiddleware,
  notFoundMiddleware
} from "./middlewares/error.middleware.js";
import { apiLimiter } from "./middlewares/rate-limit.middleware.js";
import { sanitizeInput } from "./middlewares/sanitize.middleware.js";
import {
  protectedChatAttachment,
  protectedDirectMessageAttachment
} from "./middlewares/attachment-auth.middleware.js";
import { apiRouter } from "./routes/index.js";

export const createApp = () => {
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors(corsOptions));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(cookieParser());
  app.use(sanitizeInput);
  app.use(hpp());
  if (env.NODE_ENV !== "test") app.use(morgan(env.LOG_LEVEL));

  // Render Health Check Endpoint
  const healthHandler = (_request: express.Request, response: express.Response) => {
    response.status(200).json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: Date.now(),
      success: true,
      service: "studyconnect-backend",
      environment: env.NODE_ENV
    });
  };

  app.get("/health", healthHandler);
  app.get("/api/health", healthHandler);

  // Protected attachment routes (authenticated & permission-checked)
  app.get("/uploads/direct-messages/:filename", protectedDirectMessageAttachment);
  app.get("/uploads/chat/:filename", protectedChatAttachment);

  app.use("/uploads", express.static(path.resolve(process.cwd(), env.UPLOAD_DIR), {
    maxAge: env.NODE_ENV === "production" ? "1d" : 0,
    immutable: env.NODE_ENV === "production"
  }));

  // Stream uploads from MongoDB GridFS if missing from local disk, with graceful fallback
  app.get("/uploads/:namespace/:filename", async (req, res, next) => {
    const { namespace, filename } = req.params;
    const key = `${namespace}/${filename}`;

    // 1. Check if file is already on local disk
    const localPath = path.resolve(process.cwd(), env.UPLOAD_DIR, namespace, filename);
    if (fs.existsSync(localPath)) {
      return res.sendFile(localPath);
    }

    // 2. Stream from MongoDB GridFS (shared database)
    try {
      const db = mongoose.connection.db;
      if (db) {
        const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: "uploads" });
        const files = await bucket.find({ filename: key }).toArray();
        const fileDoc = files?.[0];
        if (fileDoc) {
          res.setHeader("Content-Type", fileDoc.contentType || "application/octet-stream");
          res.setHeader("Content-Length", fileDoc.length);
          res.setHeader("Cache-Control", "public, max-age=86400");

          // Non-blocking background caching to local disk
          try {
            const dir = path.join(path.resolve(process.cwd(), env.UPLOAD_DIR), namespace);
            await fs.promises.mkdir(dir, { recursive: true });
            const localFileStream = fs.createWriteStream(localPath);
            bucket.openDownloadStreamByName(key).pipe(localFileStream);
          } catch {
            // Non-blocking
          }

          return bucket.openDownloadStreamByName(key).pipe(res);
        }
      }
    } catch (err) {
      console.warn(`GridFS retrieval error for ${key}:`, err);
    }

    // 3. Graceful SVG fallback for missing profile pictures or events
    if (namespace === "profiles") {
      res.setHeader("Content-Type", "image/svg+xml");
      res.setHeader("Cache-Control", "public, max-age=3600");
      const initials = filename.slice(0, 2).toUpperCase();
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
        <defs>
          <linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1E90FF"/>
            <stop offset="100%" stop-color="#104E8B"/>
          </linearGradient>
        </defs>
        <rect width="200" height="200" rx="40" fill="url(#pg)"/>
        <text x="100" y="115" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-size="64" font-weight="bold" text-anchor="middle" dominant-baseline="middle">${initials}</text>
      </svg>`;
      return res.status(200).send(svg.trim());
    }

    if (namespace === "events") {
      res.setHeader("Content-Type", "image/svg+xml");
      res.setHeader("Cache-Control", "public, max-age=3600");
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
        <defs>
          <linearGradient id="eg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0F172A"/>
            <stop offset="50%" stop-color="#1E293B"/>
            <stop offset="100%" stop-color="#1E3A8A"/>
          </linearGradient>
        </defs>
        <rect width="600" height="400" rx="24" fill="url(#eg)"/>
        <circle cx="300" cy="160" r="48" fill="#1E90FF" opacity="0.2"/>
        <path d="M280 135 h40 v40 h-40 z M280 125 v10 M320 125 v10" stroke="#1E90FF" stroke-width="4" fill="none" stroke-linecap="round"/>
        <text x="300" y="260" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="20" font-weight="bold" text-anchor="middle" letter-spacing="2">CAMPUS EVENT</text>
      </svg>`;
      return res.status(200).send(svg.trim());
    }

    next();
  });

  app.use("/api", apiLimiter, apiRouter);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
};

export const app = createApp();
