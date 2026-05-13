import request from "supertest";
import { app } from "../../setup/testApp";
import { resetDatabase } from "../../setup/testDatabase";
import { UserFactory } from "../../helpers/factories";
import bcrypt from "bcryptjs";

/**
 * Integration tests for POST /api/auth/login
 * Validates: Requirements 4.4, 4.5, 4.6, 8.2
 */
describe("POST /api/auth/login", () => {
  const PLAIN_PASSWORD = "TestPassword123!";
  let passwordHash: string;

  beforeAll(async () => {
    // Pre-compute hash once for all tests (bcrypt is slow)
    passwordHash = await bcrypt.hash(PLAIN_PASSWORD, 10);
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it("should return 200 with tokens on successful login", async () => {
    // Create a user with a known password hash
    const user = await UserFactory.create({
      email: "login@test.com",
      password: passwordHash,
    });

    const res = await request(app).post("/api/auth/login").send({
      identifier: user.email,
      password: PLAIN_PASSWORD,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.id).toBe(user.id);
    expect(res.body.data.user.email).toBe(user.email);
    // Refresh token should be set as a cookie
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    const refreshCookie = Array.isArray(cookies)
      ? cookies.find((c: string) => c.startsWith("refresh_token="))
      : cookies?.startsWith("refresh_token=");
    expect(refreshCookie).toBeTruthy();
  });

  it("should return 401 for invalid credentials (wrong password)", async () => {
    await UserFactory.create({
      email: "login@test.com",
      password: passwordHash,
    });

    const res = await request(app).post("/api/auth/login").send({
      identifier: "login@test.com",
      password: "WrongPassword123!",
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 401 for non-existent user", async () => {
    const res = await request(app).post("/api/auth/login").send({
      identifier: "nonexistent@test.com",
      password: PLAIN_PASSWORD,
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 403 for deactivated account", async () => {
    await UserFactory.create({
      email: "inactive@test.com",
      password: passwordHash,
      is_active: false,
    });

    const res = await request(app).post("/api/auth/login").send({
      identifier: "inactive@test.com",
      password: PLAIN_PASSWORD,
    });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
