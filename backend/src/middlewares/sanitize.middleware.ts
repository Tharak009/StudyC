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
  if (request.body) {
    request.body = sanitizeValue(request.body);
  }
  if (request.query) {
    Object.defineProperty(request, "query", {
      value: sanitizeValue(request.query),
      writable: true,
      configurable: true,
      enumerable: true
    });
  }
  if (request.params) {
    Object.defineProperty(request, "params", {
      value: sanitizeValue(request.params),
      writable: true,
      configurable: true,
      enumerable: true
    });
  }
  next();
};

