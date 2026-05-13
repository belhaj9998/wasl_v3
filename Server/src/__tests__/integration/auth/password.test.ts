import request from "supertest";
import crypto from "crypto";
import { app } from "../../setup/testApp";
import { prisma, resetDatabase } from "../../setup/testDatabase";
import { createAuthenticatedUser } from "../../helpers/auth.helpers";
import { UserFactory } from "../../helpers/factories";

describe("Password Flows Integration", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  // ─── Forgot Password ───────────────────────────────────────────────────────

  describe("POST /api/auth/forgot-password", () => {
    it("should return 200 and store a reset token for an existing email", async () => {
      const user = await UserFactory.create({ email: "exists@test.com" });

      const res = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "exists@test.com" });

      expect(res.status).toBe(200);

      // Verify token was stored in the database
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(updatedUser!.reset_token).not.toBeNull();
      expect(updatedUser!.reset_token_expires_at).not.toBeNull();
      // Token expiry should be in the future
      expect(updatedUser!.reset_token_expires_at!.getTime()).toBeGreaterThan(
        Date.now(),
      );
    });

    it("should return 200 with no error for a non-existent email", async () => {
      const res = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "nonexistent@test.com" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ─── Reset Password ────────────────────────────────────────────────────────

  describe("POST /api/auth/reset-password", () => {
    it("should reset password with a valid token", async () => {
      // Create user and simulate forgot-password flow
      const user = await UserFactory.create({ email: "reset@test.com" });

      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: {
          reset_token: hashedToken,
          reset_token_expires_at: expiresAt,
        },
      });

      const res = await request(app).post("/api/auth/reset-password").send({
        token: rawToken,
        new_password: "NewPassword123!",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify token was cleared
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(updatedUser!.reset_token).toBeNull();
      expect(updatedUser!.reset_token_expires_at).toBeNull();
    });

    it("should return 400 for an expired token", async () => {
      const user = await UserFactory.create({ email: "expired@test.com" });

      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");
      // Set expiry in the past
      const expiresAt = new Date(Date.now() - 60 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          reset_token: hashedToken,
          reset_token_expires_at: expiresAt,
        },
      });

      const res = await request(app).post("/api/auth/reset-password").send({
        token: rawToken,
        new_password: "NewPassword123!",
      });

      expect(res.status).toBe(400);
    });
  });

  // ─── Change Password ───────────────────────────────────────────────────────

  describe("POST /api/auth/change-password", () => {
    it("should change password with correct current password", async () => {
      // createAuthenticatedUser uses a pre-computed hash for "Password123!"
      // but we need to use the real bcrypt flow for change-password to work.
      // Register a user via the API to get a properly hashed password.
      const registerRes = await request(app).post("/api/auth/register").send({
        name: "Change Pass User",
        email: "changepass@test.com",
        phone: "+218910000099",
        password: "OldPassword123!",
      });

      const accessToken = registerRes.body.data.accessToken;

      const res = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          current_password: "OldPassword123!",
          new_password: "NewPassword456!",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify new password works by logging in
      const loginRes = await request(app).post("/api/auth/login").send({
        identifier: "changepass@test.com",
        password: "NewPassword456!",
      });
      expect(loginRes.status).toBe(200);
    });

    it("should return 401 with wrong current password", async () => {
      const registerRes = await request(app).post("/api/auth/register").send({
        name: "Wrong Pass User",
        email: "wrongpass@test.com",
        phone: "+218910000088",
        password: "CorrectPassword123!",
      });

      const accessToken = registerRes.body.data.accessToken;

      const res = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          current_password: "WrongPassword123!",
          new_password: "NewPassword456!",
        });

      expect(res.status).toBe(401);
    });
  });
});
