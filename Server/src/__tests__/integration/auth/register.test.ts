import request from "supertest";
import { app } from "../../setup/testApp";
import { resetDatabase } from "../../setup/testDatabase";
import { UserFactory } from "../../helpers/factories";

/**
 * Integration tests for POST /api/auth/register
 * Validates: Requirements 4.1, 4.2, 4.3, 8.1
 */
describe("POST /api/auth/register", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  const validPayload = {
    name: "Test User",
    email: "newuser@example.com",
    phone: "+218910000001",
    password: "SecurePass123",
  };

  // ─── Requirement 4.1 & 8.1: Successful registration ─────────────────────

  it("should return 201 with user, accessToken, and refresh_token cookie on valid registration", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send(validPayload)
      .expect(201);

    // Verify response structure
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Registration successful");
    expect(res.body.data).toHaveProperty("user");
    expect(res.body.data).toHaveProperty("accessToken");

    // Verify user object fields
    const { user } = res.body.data;
    expect(user.name).toBe(validPayload.name);
    expect(user.email).toBe(validPayload.email);
    expect(user.phone).toBe(validPayload.phone);
    expect(user).not.toHaveProperty("password");
    expect(user.id).toBeDefined();

    // Verify accessToken is a non-empty string (JWT format)
    expect(typeof res.body.data.accessToken).toBe("string");
    expect(res.body.data.accessToken.length).toBeGreaterThan(0);

    // Verify refresh_token cookie is set
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    const refreshCookie = Array.isArray(cookies)
      ? cookies.find((c: string) => c.startsWith("refresh_token="))
      : cookies?.startsWith("refresh_token=")
        ? cookies
        : undefined;
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain("HttpOnly");
  });

  // ─── Requirement 4.2: Duplicate email returns 409 ────────────────────────

  it("should return 409 when registering with an existing email", async () => {
    // Create a user with the same email first
    await UserFactory.create({ email: validPayload.email });

    const res = await request(app)
      .post("/api/auth/register")
      .send(validPayload)
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("email");
  });

  // ─── Requirement 4.3: Duplicate phone returns 409 ────────────────────────

  it("should return 409 when registering with an existing phone", async () => {
    // Create a user with the same phone but different email
    await UserFactory.create({ phone: validPayload.phone });

    const res = await request(app)
      .post("/api/auth/register")
      .send({
        ...validPayload,
        email: "different@example.com",
      })
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("phone");
  });

  // ─── Requirement 8.1 (validation): Invalid body returns 422 ──────────────

  it("should return 422 when body is missing required fields", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({})
      .expect(422);

    expect(res.body.success).toBe(false);
  });

  it("should return 422 when email format is invalid", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validPayload, email: "not-an-email" })
      .expect(422);

    expect(res.body.success).toBe(false);
  });

  it("should return 422 when phone format is invalid", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validPayload, phone: "abc" })
      .expect(422);

    expect(res.body.success).toBe(false);
  });

  it("should return 422 when password is too short", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validPayload, password: "short" })
      .expect(422);

    expect(res.body.success).toBe(false);
  });
});
