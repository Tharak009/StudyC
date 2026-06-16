import path from "node:path";
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
  if (env.NODE_ENV !== "test") app.use(morgan(env.LOG_LEVEL));

  app.get("/health", (_request, response) => {
    response.json({
      success: true,
      data: { status: "ok", timestamp: new Date().toISOString() },
      message: "StudyConnect API is healthy"
    });
  });

  app.use("/uploads", express.static(path.resolve(process.cwd(), env.UPLOAD_DIR), {
    maxAge: env.NODE_ENV === "production" ? "1d" : 0,
    immutable: env.NODE_ENV === "production"
  }));
  app.use("/api", apiLimiter, apiRouter);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
};

export const app = createApp();
