import type { ErrorRequestHandler } from "express";
import multer from "multer";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";

export const errorMiddleware: ErrorRequestHandler = (error, _request, response, _next) => {
  let normalized = error;

  if (error instanceof mongoose.Error.CastError) {
    normalized = new ApiError(400, "Invalid resource identifier", [], "INVALID_ID");
  } else if (error?.code === 11000) {
    normalized = new ApiError(409, "A unique field already exists", [], "DUPLICATE_VALUE");
  } else if (error instanceof multer.MulterError) {
    normalized = new ApiError(400, error.message, [], "UPLOAD_ERROR");
  }

  const statusCode = normalized instanceof ApiError ? normalized.statusCode : 500;
  const message =
    normalized instanceof ApiError ? normalized.message : "An unexpected server error occurred";

  response.status(statusCode).json({
    success: false,
    message,
    code: normalized instanceof ApiError ? normalized.code : "INTERNAL_SERVER_ERROR",
    errors: normalized instanceof ApiError ? normalized.errors : [],
    ...(env.NODE_ENV !== "production" && { stack: error?.stack })
  });
};

export const notFoundMiddleware = ((request, _response, next) => {
  next(new ApiError(404, `Route ${request.method} ${request.originalUrl} was not found`, [], "NOT_FOUND"));
}) satisfies import("express").RequestHandler;
