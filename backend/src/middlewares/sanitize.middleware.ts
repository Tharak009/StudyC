import type { NextFunction, Request, Response } from "express";

const sanitizeValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !key.startsWith("$") && !key.includes("."))
        .map(([key, item]) => [key, sanitizeValue(item)])
    );
  }
  return value;
};

export const sanitizeInput = (request: Request, _response: Response, next: NextFunction): void => {
  request.body = sanitizeValue(request.body);
  next();
};
