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
  // Invitation URLs are bearer credentials. Keep the existing request logger,
  // but redact invitation query values in every Morgan format that uses :url.
  morgan.token("url", (request) => {
    const expressRequest = request as express.Request;
    const raw = expressRequest.originalUrl || expressRequest.url || "/";
    try {
      const parsed = new URL(raw, "http://studyconnect.local");
      for (const key of ["invite", "inviteCode"]) if (parsed.searchParams.has(key)) parsed.searchParams.set(key, "[REDACTED]");
      return `${parsed.pathname}${parsed.search}`;
    } catch {
      return "/[redacted-url]";
    }
  });
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

  app.use("/uploads", express.static(path.resolve(process.cwd(), env.UPLOAD_DIR), {
    maxAge: env.NODE_ENV === "production" ? "1d" : 0,
    immutable: env.NODE_ENV === "production"
  }));

  // Stream uploads from local disk or MongoDB GridFS with graceful fallbacks
  app.get("/uploads/*splat", async (req, res, next) => {
    const rawPath = (req.params as any).splat || (req.params as any)[0] || req.path || "";
    const cleanPath = decodeURIComponent(rawPath).replace(/\\/g, "/").replace(/^\/+/, "");

    if (!cleanPath || cleanPath.includes("..")) {
      return res.status(400).json({ success: false, message: "Invalid file path", code: "INVALID_PATH" });
    }

    const possibleRoots = [
      path.resolve(process.cwd(), env.UPLOAD_DIR),
      path.resolve(process.cwd(), "backend", env.UPLOAD_DIR)
    ];
    
    // Check 1: Normal local path across candidate roots (e.g. uploadsRoot/6ac92cf5.../file.docx or uploadsRoot/previews/...)
    let localPath = "";
    for (const root of possibleRoots) {
      const candidate = path.resolve(root, cleanPath);
      if (candidate.startsWith(root) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        localPath = candidate;
        break;
      }
    }

    // Check 2: Nested uploads fallback path (e.g. uploadsRoot/uploads/6ac92cf5.../file.docx)
    if (!localPath && cleanPath.startsWith("uploads/")) {
      const strippedPath = cleanPath.slice("uploads/".length);
      for (const root of possibleRoots) {
        const candidate = path.resolve(root, strippedPath);
        if (candidate.startsWith(root) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          localPath = candidate;
          break;
        }
      }
    } else if (!localPath) {
      for (const root of possibleRoots) {
        const candidate = path.resolve(root, "uploads", cleanPath);
        if (candidate.startsWith(root) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          localPath = candidate;
          break;
        }
      }
    }

    // 1. Send file if found on local disk
    if (localPath && fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
      return res.sendFile(localPath);
    }

    // 2. Stream from MongoDB GridFS (shared database)
    const gridFsKeys = [
      cleanPath,
      cleanPath.startsWith("uploads/") ? cleanPath.slice("uploads/".length) : `uploads/${cleanPath}`
    ];

    try {
      const db = mongoose.connection.db;
      if (db) {
        const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: "uploads" });
        for (const key of gridFsKeys) {
          const files = await bucket.find({ filename: key }).toArray();
          const fileDoc = files?.[0];
          if (fileDoc) {
            res.setHeader("Content-Type", fileDoc.contentType || "application/octet-stream");
            res.setHeader("Content-Length", fileDoc.length);
            res.setHeader("Cache-Control", "public, max-age=86400");

            // Non-blocking background caching to local disk
            try {
              await fs.promises.mkdir(path.dirname(localPath), { recursive: true });
              const localFileStream = fs.createWriteStream(localPath);
              bucket.openDownloadStreamByName(key).pipe(localFileStream);
            } catch {
              // Non-blocking
            }

            return bucket.openDownloadStreamByName(key).pipe(res);
          }
        }
      }
    } catch (err) {
      console.warn(`GridFS retrieval error for ${cleanPath}:`, err);
    }

    // 3. Graceful SVG fallback for missing profile pictures or events
    const firstSegment = cleanPath.split("/")[0];
    const filename = path.basename(cleanPath);

    if (firstSegment === "profiles") {
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

    if (firstSegment === "events") {
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

    return res.status(404).json({ success: false, message: "File not found", code: "FILE_NOT_FOUND" });
  });

  app.use("/api", apiLimiter, apiRouter);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
};

export const app = createApp();
