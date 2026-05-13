import request from "supertest";
import { app } from "../../setup/testApp";
import { resetDatabase } from "../../setup/testDatabase";
import {
  createAuthenticatedUser,
  generateTestToken,
} from "../../helpers/auth.helpers";

/**
 * Integration tests for auth middleware (verifyToken + platformGuard)
 * Validates: Requirements 4.14, 4.15, 8.3
 */
describe("Auth Middleware Integration", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  // Using GET /api/platform/dashboard/stats as the protected endpoint.
  // It requires verifyToken + platformGuard but has no query validation,
  // making it ideal for isolating auth middleware behavior.
  const PROTECTED_ENDPOINT = "/api/platform/dashboard/stats";

  // ─── verifyToken middleware ─────────────────────────────────────────────────

  describe("verifyToken", () => {
    it("should return 401 when no token is provided", async () => {
      const res = await request(app).get(PROTECTED_ENDPOINT);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should return 401 when an invalid token is provided", async () => {
      const res = await request(app)
        .get(PROTECTED_ENDPOINT)
        .set("Authorization", "Bearer invalid-token-string");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should return 401 when an expired token is provided", async () => {
      // Generate a token that is already expired
      const expiredToken = generateTestToken(
        { userId: 1, systemRole: "PLATFORM_ADMIN" },
        "-1s",
      );

      const res = await request(app)
        .get(PROTECTED_ENDPOINT)
        .set("Authorization", `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should succeed with a valid token on a protected endpoint", async () => {
      // Create a platform admin user with valid token
      const { accessToken } = await createAuthenticatedUser({
        system_role: "PLATFORM_ADMIN",
      });

      const res = await request(app)
        .get(PROTECTED_ENDPOINT)
        .set("Authorization", `Bearer ${accessToken}`);

      // Should pass auth middleware and return 200
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ─── platformGuard middleware ───────────────────────────────────────────────

  describe("platformGuard", () => {
    it("should return 403 when user has USER role (non-platform)", async () => {
      const { accessToken } = await createAuthenticatedUser({
        system_role: "USER",
      });

      const res = await request(app)
        .get(PROTECTED_ENDPOINT)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should return 403 when user has SUPPORT role (non-platform)", async () => {
      const { accessToken } = await createAuthenticatedUser({
        system_role: "SUPPORT",
      });

      const res = await request(app)
        .get(PROTECTED_ENDPOINT)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should allow PLATFORM_ADMIN role", async () => {
      const { accessToken } = await createAuthenticatedUser({
        system_role: "PLATFORM_ADMIN",
      });

      const res = await request(app)
        .get(PROTECTED_ENDPOINT)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should allow PLATFORM_OWNER role", async () => {
      const { accessToken } = await createAuthenticatedUser({
        system_role: "PLATFORM_OWNER",
      });

      const res = await request(app)
        .get(PROTECTED_ENDPOINT)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
