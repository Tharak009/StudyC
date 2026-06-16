import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { ApiError } from "../utils/api-error.js";

export const validate = (schema: ZodType) => (
  request: Request,
  _response: Response,
  next: NextFunction
): void => {
  const result = schema.safeParse({
    body: request.body,
    params: request.params,
    query: request.query
  });

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.slice(1).join("."),
      message: issue.message
    }));
    next(new ApiError(422, "Validation failed", errors, "VALIDATION_ERROR"));
    return;
  }

  const data = result.data as { body?: unknown; params?: unknown; query?: unknown };
  if (data.body !== undefined) request.body = data.body;
  request.validated = data;
  next();
};
