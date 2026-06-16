export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public errors: unknown[] = [],
    public code = "API_ERROR"
  ) {
    super(message);
    this.name = "ApiError";
    Error.captureStackTrace(this, this.constructor);
  }
}
