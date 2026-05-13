import { describe, it, expect, vi } from "vitest";
import { createRequest, createResponse } from "node-mocks-http";
import { NextFunction } from "express";
import { ZodError, ZodIssue } from "zod";
import { errorHandler } from "../../../middlewares/error.Middleware";
import { AppError } from "../../../utils/AppError";

describe("errorHandler middleware", () => {
  const next: NextFunction = vi.fn();

  function callHandler(err: unknown) {
    const req = createRequest();
    const res = createResponse();
    errorHandler(err, req, res, next);
    return res;
  }

  describe("AppError handling (various status codes)", () => {
    it("responds with 400 for AppError.badRequest", () => {
      const err = AppError.badRequest("Invalid input");
      const res = callHandler(err);

      expect(res.statusCode).toBe(400);
      expect(res._getJSONData()).toEqual({
        success: false,
        error: "Invalid input",
        message: "Invalid input",
      });
    });

    it("responds with 401 for AppError.unauthorized", () => {
      const err = AppError.unauthorized("Token expired");
      const res = callHandler(err);

      expect(res.statusCode).toBe(401);
      expect(res._getJSONData()).toEqual({
        success: false,
        error: "Token expired",
        message: "Token expired",
      });
    });

    it("responds with 403 for AppError.forbidden", () => {
      const err = AppError.forbidden("Access denied");
      const res = callHandler(err);

      expect(res.statusCode).toBe(403);
      expect(res._getJSONData()).toEqual({
        success: false,
        error: "Access denied",
        message: "Access denied",
      });
    });

    it("responds with 404 for AppError.notFound", () => {
      const err = AppError.notFound("User not found");
      const res = callHandler(err);

      expect(res.statusCode).toBe(404);
      expect(res._getJSONData()).toEqual({
        success: false,
        error: "User not found",
        message: "User not found",
      });
    });

    it("responds with 409 for AppError.conflict", () => {
      const err = AppError.conflict("Email already exists");
      const res = callHandler(err);

      expect(res.statusCode).toBe(409);
      expect(res._getJSONData()).toEqual({
        success: false,
        error: "Email already exists",
        message: "Email already exists",
      });
    });

    it("responds with 422 for AppError.unprocessable", () => {
      const err = AppError.unprocessable("Invalid entity");
      const res = callHandler(err);

      expect(res.statusCode).toBe(422);
      expect(res._getJSONData()).toEqual({
        success: false,
        error: "Invalid entity",
        message: "Invalid entity",
      });
    });

    it("responds with 429 for AppError.tooMany", () => {
      const err = AppError.tooMany("Rate limit exceeded");
      const res = callHandler(err);

      expect(res.statusCode).toBe(429);
      expect(res._getJSONData()).toEqual({
        success: false,
        error: "Rate limit exceeded",
        message: "Rate limit exceeded",
      });
    });

    it("responds with 500 for AppError.internal", () => {
      const err = AppError.internal("Something broke");
      const res = callHandler(err);

      expect(res.statusCode).toBe(500);
      expect(res._getJSONData()).toEqual({
        success: false,
        error: "Something broke",
        message: "Something broke",
      });
    });
  });

  describe("Prisma P2002 → 409 with field name", () => {
    it("responds with 409 and includes the conflicting field name", () => {
      const prismaError = {
        code: "P2002",
        meta: { target: ["email"] },
        message: "Unique constraint failed",
      };
      const res = callHandler(prismaError);

      expect(res.statusCode).toBe(409);
      expect(res._getJSONData()).toEqual({
        success: false,
        error: "Unique constraint violation",
        message: "A record with this email already exists",
      });
    });

    it("responds with 409 and uses 'field' when meta.target is missing", () => {
      const prismaError = {
        code: "P2002",
        meta: {},
        message: "Unique constraint failed",
      };
      const res = callHandler(prismaError);

      expect(res.statusCode).toBe(409);
      expect(res._getJSONData()).toEqual({
        success: false,
        error: "Unique constraint violation",
        message: "A record with this field already exists",
      });
    });

    it("responds with 409 and uses 'field' when meta is undefined", () => {
      const prismaError = {
        code: "P2002",
        message: "Unique constraint failed",
      };
      const res = callHandler(prismaError);

      expect(res.statusCode).toBe(409);
      expect(res._getJSONData()).toEqual({
        success: false,
        error: "Unique constraint violation",
        message: "A record with this field already exists",
      });
    });
  });

  describe("Prisma P2025 → 404", () => {
    it("responds with 404 for record not found", () => {
      const prismaError = {
        code: "P2025",
        meta: { cause: "Record to update not found" },
        message: "An operation failed",
      };
      const res = callHandler(prismaError);

      expect(res.statusCode).toBe(404);
      expect(res._getJSONData()).toEqual({
        success: false,
        error: "Not found",
        message: "The requested record does not exist",
      });
    });
  });

  describe("ZodError → 422 with issues array", () => {
    it("responds with 422 and includes validation issues", () => {
      const issues: ZodIssue[] = [
        {
          code: "invalid_type",
          expected: "string",
          received: "number",
          path: ["email"],
          message: "Expected string, received number",
        },
      ];
      const zodError = new ZodError(issues);
      const res = callHandler(zodError);

      expect(res.statusCode).toBe(422);
      const body = res._getJSONData();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Validation failed");
      expect(body.error).toEqual(issues);
    });

    it("responds with 422 and includes multiple issues", () => {
      const issues: ZodIssue[] = [
        {
          code: "invalid_type",
          expected: "string",
          received: "undefined",
          path: ["name"],
          message: "Required",
        },
        {
          code: "invalid_string",
          validation: "email",
          path: ["email"],
          message: "Invalid email",
        },
      ];
      const zodError = new ZodError(issues);
      const res = callHandler(zodError);

      expect(res.statusCode).toBe(422);
      const body = res._getJSONData();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Validation failed");
      expect(body.error).toHaveLength(2);
    });
  });

  describe("Unknown error → 500 generic message", () => {
    it("responds with 500 for a plain Error", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const err = new Error("Something unexpected");
      const res = callHandler(err);

      expect(res.statusCode).toBe(500);
      expect(res._getJSONData()).toEqual({
        success: false,
        error: "Internal server error",
        message: "An unexpected error occurred",
      });
      consoleSpy.mockRestore();
    });

    it("responds with 500 for a TypeError", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const err = new TypeError("Cannot read properties of undefined");
      const res = callHandler(err);

      expect(res.statusCode).toBe(500);
      expect(res._getJSONData()).toEqual({
        success: false,
        error: "Internal server error",
        message: "An unexpected error occurred",
      });
      consoleSpy.mockRestore();
    });

    it("responds with 500 for a string error", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const res = callHandler("some string error");

      expect(res.statusCode).toBe(500);
      expect(res._getJSONData()).toEqual({
        success: false,
        error: "Internal server error",
        message: "An unexpected error occurred",
      });
      consoleSpy.mockRestore();
    });

    it("does not expose internal error details in the response", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const err = new Error(
        "Database connection pool exhausted at 192.168.1.1:5432",
      );
      const res = callHandler(err);

      const body = res._getJSONData();
      expect(body.error).not.toContain("192.168.1.1");
      expect(body.message).not.toContain("Database connection");
      consoleSpy.mockRestore();
    });
  });
});
