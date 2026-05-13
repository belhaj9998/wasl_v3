import request from "supertest";
import { app } from "../../setup/testApp";
import { resetDatabase } from "../../setup/testDatabase";
import { createAuthenticatedUser } from "../../helpers/auth.helpers";

describe("POST /api/auth/refresh", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("returns a new access token when a valid refresh token is provided", async () => {
    const { refreshToken } = await createAuthenticatedUser();

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", [`refresh_token=${refreshToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(typeof res.body.data.accessToken).toBe("string");
    expect(res.body.data.accessToken.length).toBeGreaterThan(0);
  });

  it("returns 401 when no refresh token cookie is provided", async () => {
    const res = await request(app).post("/api/auth/refresh");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 when an invalid refresh token is provided", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", ["refresh_token=invalid-token-value"]);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 when an expired refresh token is provided", async () => {
    // Create a user with a refresh token, then manually expire it in the DB
    const { refreshToken } = await createAuthenticatedUser();

    // Import prisma to manipulate the token's expiry
    const { prisma } = await import("../../setup/testDatabase");
    await prisma.refreshToken.updateMany({
      data: { expires_at: new Date(Date.now() - 1000) }, // expired 1 second ago
    });

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", [`refresh_token=${refreshToken}`]);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
