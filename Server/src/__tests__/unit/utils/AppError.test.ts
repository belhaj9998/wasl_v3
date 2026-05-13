import { describe, it, expect } from "vitest";
import { AppError } from "../../../utils/AppError";

describe("AppError", () => {
  describe("constructor", () => {
    it("creates an instance with provided message, statusCode, and isOperational", () => {
      const error = new AppError("test error", 418, true);
      expect(error.message).toBe("test error");
      expect(error.statusCode).toBe(418);
      expect(error.isOperational).toBe(true);
    });

    it("defaults statusCode to 500 and isOperational to true", () => {
      const error = new AppError("something went wrong");
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
    });

    it("is an instance of Error", () => {
      const error = new AppError("test");
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe("static badRequest", () => {
    it("creates error with statusCode 400 and custom message", () => {
      const error = AppError.badRequest("Invalid input");
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe("Invalid input");
      expect(error.isOperational).toBe(true);
    });

    it("uses default message when no argument provided", () => {
      const error = AppError.badRequest();
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe("Bad request");
      expect(error.isOperational).toBe(true);
    });
  });

  describe("static unauthorized", () => {
    it("creates error with statusCode 401 and custom message", () => {
      const error = AppError.unauthorized("Token expired");
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe("Token expired");
      expect(error.isOperational).toBe(true);
    });

    it("uses default message when no argument provided", () => {
      const error = AppError.unauthorized();
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe("Unauthorized");
      expect(error.isOperational).toBe(true);
    });
  });

  describe("static forbidden", () => {
    it("creates error with statusCode 403 and custom message", () => {
      const error = AppError.forbidden("Access denied");
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe("Access denied");
      expect(error.isOperational).toBe(true);
    });

    it("uses default message when no argument provided", () => {
      const error = AppError.forbidden();
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe("Forbidden");
      expect(error.isOperational).toBe(true);
    });
  });

  describe("static notFound", () => {
    it("creates error with statusCode 404 and custom message", () => {
      const error = AppError.notFound("User not found");
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe("User not found");
      expect(error.isOperational).toBe(true);
    });

    it("uses default message when no argument provided", () => {
      const error = AppError.notFound();
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe("Resource not found");
      expect(error.isOperational).toBe(true);
    });
  });

  describe("static conflict", () => {
    it("creates error with statusCode 409 and custom message", () => {
      const error = AppError.conflict("Email already taken");
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe("Email already taken");
      expect(error.isOperational).toBe(true);
    });

    it("uses default message when no argument provided", () => {
      const error = AppError.conflict();
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe("Resource already exists");
      expect(error.isOperational).toBe(true);
    });
  });

  describe("static unprocessable", () => {
    it("creates error with statusCode 422 and custom message", () => {
      const error = AppError.unprocessable("Invalid data format");
      expect(error.statusCode).toBe(422);
      expect(error.message).toBe("Invalid data format");
      expect(error.isOperational).toBe(true);
    });

    it("uses default message when no argument provided", () => {
      const error = AppError.unprocessable();
      expect(error.statusCode).toBe(422);
      expect(error.message).toBe("Unprocessable entity");
      expect(error.isOperational).toBe(true);
    });
  });

  describe("static tooMany", () => {
    it("creates error with statusCode 429 and custom message", () => {
      const error = AppError.tooMany("Rate limit exceeded");
      expect(error.statusCode).toBe(429);
      expect(error.message).toBe("Rate limit exceeded");
      expect(error.isOperational).toBe(true);
    });

    it("uses default message when no argument provided", () => {
      const error = AppError.tooMany();
      expect(error.statusCode).toBe(429);
      expect(error.message).toBe("Too many requests");
      expect(error.isOperational).toBe(true);
    });
  });

  describe("static internal", () => {
    it("creates error with statusCode 500 and custom message", () => {
      const error = AppError.internal("Database connection failed");
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe("Database connection failed");
    });

    it("uses default message when no argument provided", () => {
      const error = AppError.internal();
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe("Internal server error");
    });

    it("has isOperational set to false", () => {
      const error = AppError.internal();
      expect(error.isOperational).toBe(false);
    });

    it("has isOperational false even with custom message", () => {
      const error = AppError.internal("Something broke");
      expect(error.isOperational).toBe(false);
    });
  });
});
