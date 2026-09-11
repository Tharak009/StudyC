import type { CorsOptions } from "cors";
import { env } from "./env.js";

const configuredOrigins = (process.env.FRONTEND_URL || env.CLIENT_URL || "")
  .split(",")
  .map((url) => url.trim().replace(/\/$/, ""))
  .filter(Boolean);

export const isOriginAllowed = (origin?: string): boolean => {
  if (!origin) return true; // Allow non-browser requests (mobile, server-to-server, curl, health-checks)
  const normalized = origin.replace(/\/$/, "");

  // 1. Direct match with configured frontend URLs
  if (configuredOrigins.includes(normalized)) return true;

  // 2. Dynamic support for Render subdomains (*.onrender.com and *.render.com)
  if (/^https:\/\/[a-zA-Z0-9-]+\.onrender\.com$/.test(normalized)) return true;
  if (/^https:\/\/[a-zA-Z0-9-]+\.render\.com$/.test(normalized)) return true;

  // 3. Localhost and development bindings
  if (/^http:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/.test(normalized)) return true;

  return false;
};

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origin '${origin}' is not allowed by CORS`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Client-Platform",
    "Accept",
    "Origin",
    "X-Requested-With"
  ],
  exposedHeaders: ["Content-Disposition", "Content-Length"]
};

