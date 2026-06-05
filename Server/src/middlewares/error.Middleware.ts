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
    // Special-case the order-tag filter helper: it throws
    // `Error("TAG_FILTER_INVALID")` inside a Zod transform when the
    // `tag_ids` query parameter is malformed. We surface this as a
    // 400 with a stable error code instead of the generic 422.
    const tagFilterIssue = err.issues.find(
      (issue) =>
        issue.code === "custom" && issue.message === "TAG_FILTER_INVALID",
    );
    if (tagFilterIssue) {
      res.status(400).json({
        success: false,
        error: "TAG_FILTER_INVALID",
        message: "Invalid tag_ids filter value",
      });
      return;
    }

    // Special-case the order-assignee filter helper: it adds a custom issue
    // with `message === "ASSIGNEE_FILTER_INVALID"` inside a Zod transform when
    // the `assigned_user_id` query parameter is malformed (bad token, mixed
    // `unassigned`/`me` with integers, etc.). Surface it as a 400 with a stable
    // error code instead of the generic 422 (Requirement 9.6).
    const assigneeFilterIssue = err.issues.find(
      (issue) =>
        issue.code === "custom" && issue.message === "ASSIGNEE_FILTER_INVALID",
    );
    if (assigneeFilterIssue) {
      res.status(400).json({
        success: false,
        error: "ASSIGNEE_FILTER_INVALID",
        message: "Invalid assigned_user_id filter value",
      });
      return;
    }

    const sourceFilterIssue = err.issues.find(
      (issue) =>
        issue.code === "custom" && issue.message === "INVALID_ORDER_SOURCE",
    );
    if (sourceFilterIssue) {
      res.status(400).json({
        success: false,
        error: "INVALID_ORDER_SOURCE",
        message: "Invalid order source value",
      });
      return;
    }

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
