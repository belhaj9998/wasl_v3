import request from "supertest";
import { app } from "../../setup/testApp";
import { resetDatabase } from "../../setup/testDatabase";
import { UserFactory } from "../../helpers/factories";
import bcrypt from "bcryptjs";

/**
 * Integration tests for the centralized error handler middleware.
 * Tests error responses through actual endpoints (full middleware chain).
 * Validates: Requirements 8.7, 8.8, 8.9, 8.10
 */
describe("Error Handler Integration", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  // ─── Requirement 8.7: AppError responses through actual endpoints ─────────

  describe("AppError responses", () => {
    it("should return 401 with standard error format for invalid credentials", async () => {
      const res = await request(app).post("/api/auth/login").send({
        identifier: "nonexistent@test.com",
        password: "SomePassword123!",
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
      expect(res.body.message).toBeDefined();
    });

    it("should return 403 with standard error format for deactivated account", async () => {
      const passwordHash = await bcrypt.hash("TestPassword123!", 10);
      await UserFactory.create({
        email: "inactive@test.com",
        password: passwordHash,
        is_active: false,
      });

      const res = await request(app).post("/api/auth/login").send({
        identifier: "inactive@test.com",
        password: "TestPassword123!",
      });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
      expect(res.body.message).toBeDefined();
    });
  });

  // ─── Requirement 8.8: Prisma P2002 through duplicate creation ─────────────

  describe("Prisma P2002 (unique constraint violation)", () => {
    it("should return 409 when registering with a duplicate email", async () => {
      const validPayload = {
        name: "First User",
        email: "duplicate@test.com",
        phone: "+218910000001",
        password: "SecurePass123",
      };

      // Register the first user
      await request(app)
        .post("/api/auth/register")
        .send(validPayload)
        .expect(201);

      // Attempt to register with the same email
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          ...validPayload,
          phone: "+218910000002", // different phone to isolate email conflict
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBeDefined();
    });

    it("should return 409 when registering with a duplicate phone", async () => {
      const validPayload = {
        name: "First User",
        email: "user1@test.com",
        phone: "+218920000001",
        password: "SecurePass123",
      };

      // Register the first user
      await request(app)
        .post("/api/auth/register")
        .send(validPayload)
        .expect(201);

      // Attempt to register with the same phone
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          ...validPayload,
          email: "user2@test.com", // different email to isolate phone conflict
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBeDefined();
    });
  });

  // ─── Requirement 8.9: ZodError through invalid request body ───────────────

  describe("ZodError (validation failure)", () => {
    it("should return 422 with validation errors for invalid registration body", async () => {
      const res = await request(app).post("/api/auth/register").send({
        // Missing all required fields
      });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Validation failed");
      expect(res.body.error).toBeDefined();
      expect(Array.isArray(res.body.error)).toBe(true);
    });

    it("should return 422 with field-specific errors for invalid email", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Test User",
        email: "not-an-email",
        phone: "+218910000001",
        password: "SecurePass123",
      });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
      expect(Array.isArray(res.body.error)).toBe(true);
      // Verify the issues array contains email-related error
      const emailIssue = res.body.error.find(
        (issue: any) => issue.path && issue.path.includes("email"),
      );
      expect(emailIssue).toBeDefined();
    });

    it("should return 422 for invalid login body (empty fields)", async () => {
      const res = await request(app).post("/api/auth/login").send({
        identifier: "",
        password: "",
      });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Validation failed");
      expect(Array.isArray(res.body.error)).toBe(true);
    });
  });

  // ─── Requirement 8.10: 404 for non-existent routes ────────────────────────

  describe("404 for non-existent routes", () => {
    it("should return 404 for a GET request to an undefined route", async () => {
      const res = await request(app).get("/api/this-route-does-not-exist");

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it("should return 404 for a POST request to an undefined route", async () => {
      const res = await request(app).post("/api/nonexistent-endpoint").send({
        data: "test",
      });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should include the route path in the 404 response message", async () => {
      const res = await request(app).get("/api/unknown-path");

      expect(res.status).toBe(404);
      expect(res.body.message).toContain("/api/unknown-path");
    });
  });
});
