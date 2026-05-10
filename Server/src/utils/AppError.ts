/**
 * Custom application error class.
 * Extends the native Error with an HTTP status code and operational flag.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  /** 400 — Bad Request */
  static badRequest(message = "Bad request") {
    return new AppError(message, 400);
  }

  /** 401 — Unauthorized */
  static unauthorized(message = "Unauthorized") {
    return new AppError(message, 401);
  }

  /** 403 — Forbidden */
  static forbidden(message = "Forbidden") {
    return new AppError(message, 403);
  }

  /** 404 — Not Found */
  static notFound(message = "Resource not found") {
    return new AppError(message, 404);
  }

  /** 409 — Conflict */
  static conflict(message = "Resource already exists") {
    return new AppError(message, 409);
  }

  /** 422 — Unprocessable Entity */
  static unprocessable(message = "Unprocessable entity") {
    return new AppError(message, 422);
  }

  /** 429 — Too Many Requests */
  static tooMany(message = "Too many requests") {
    return new AppError(message, 429);
  }

  /** 500 — Internal Server Error */
  static internal(message = "Internal server error") {
    return new AppError(message, 500, false);
  }
}
