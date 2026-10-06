import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

const isDevOrTest = env.NODE_ENV !== "production";

const jsonHandler = (_request: unknown, response: any) => {
  response.status(429).json({
    success: false,
    message: "Too many requests. Please try again later.",
    code: "RATE_LIMITED"
  });
};

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isDevOrTest ? 10000 : 2000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: jsonHandler
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isDevOrTest ? 100 : 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: jsonHandler
});

export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isDevOrTest ? 500 : 150,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: jsonHandler
});

export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: isDevOrTest ? 1000 : 150,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: jsonHandler
});

export const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: isDevOrTest ? 100 : 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: jsonHandler
});

export const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: isDevOrTest ? 1000 : 180,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: jsonHandler
});

