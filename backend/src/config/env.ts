import "dotenv/config";
import { z } from "zod";

// Provide fallback resolution for common cloud provider env variable aliases (Render / Heroku)
const rawEnv = {
  ...process.env,
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/studyconnect",
  CLIENT_URL: process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:5173",
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "development-access-secret-change-me-now",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || "development-refresh-secret-change-me-now",
  APPROVED_EMAIL_DOMAINS: process.env.APPROVED_EMAIL_DOMAINS || "campus.edu,college.edu,students.college.edu"
};

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  APPROVED_EMAIL_DOMAINS: z.string().min(1).default("campus.edu,college.edu,students.college.edu"),
  JWT_ACCESS_SECRET: z.string().min(16).default("development-access-secret-change-me-now"),
  JWT_REFRESH_SECRET: z.string().min(16).default("development-refresh-secret-change-me-now"),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),
  COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  MAX_FILE_SIZE_MB: z.coerce.number().positive().max(10).default(5),
  UPLOAD_DIR: z.string().default("uploads"),
  LOG_LEVEL: z.enum(["combined", "common", "dev", "short", "tiny"]).default("dev")
});

const parsed = schema.safeParse(rawEnv);

if (!parsed.success) {
  console.error("Invalid environment configuration", parsed.error.flatten().fieldErrors);
  throw new Error("Environment validation failed");
}

export const env = {
  ...parsed.data,
  approvedEmailDomains: parsed.data.APPROVED_EMAIL_DOMAINS.split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean)
};

