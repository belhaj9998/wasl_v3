import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { ZodError } from "zod";

/**
 * Checks if an error is a Prisma known request error by duck-typing.
 * Prisma errors have a `code` string property and a `meta` object.
 */
function isPrismaError(
  err: unknown,
): err is { code: string; meta?: { target?: string[] } } {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as any).code === "string" &&
    (err as any).code.startsWith("P")
  );
}

/**
 * Centralized error handler middleware.
 * Must be registered LAST in the middleware chain.
 * Express identifies 4-argument functions as error handlers.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // 1. AppError — use its statusCode and message directly
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      message: err.message,
    });
    return;
  }

  // 2. Prisma known request errors
  if (isPrismaError(err)) {
    if (err.code === "P2002") {
      const field = err.meta?.target?.[0] ?? "field";
      res.status(409).json({
        success: false,
        error: "Unique constraint violation",
        message: `A record with this ${field} already exists`,
      });
      return;
    }

    if (err.code === "P2025") {
      res.status(404).json({
        success: false,
        error: "Not found",
        message: "The requested record does not exist",
      });
      return;
    }
  }

  // 3. ZodError — validation failure
  if (err instanceof ZodError) {
    res.status(422).json({
      success: false,
      error: err.issues,
      message: "Validation failed",
    });
    return;
  }

  // 4. Unknown / non-operational error — log and return generic message
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: "An unexpected error occurred",
  });
}
