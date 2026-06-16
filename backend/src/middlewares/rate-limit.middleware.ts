import rateLimit from "express-rate-limit";

const jsonHandler = (_request: unknown, response: any) => {
  response.status(429).json({
    success: false,
    message: "Too many requests. Please try again later.",
    code: "RATE_LIMITED"
  });
};

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: jsonHandler
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: jsonHandler
});
