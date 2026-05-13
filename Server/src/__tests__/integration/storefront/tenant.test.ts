import request from "supertest";
import { app } from "../../setup/testApp";
import { resetDatabase } from "../../setup/testDatabase";
import { StoreFactory } from "../../helpers/factories";

/**
 * Integration tests for storefront tenant middleware
 * Tests the storefrontTenantMiddleware which resolves store context
 * from the `:domain` route parameter on all /api/storefront/:domain routes.
 *
 * Validates: Requirements 5.6, 5.7, 5.8, 8.6
 */
describe("Storefront Tenant Middleware", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  describe("Valid domain resolution", () => {
    it("should resolve store context for a valid active domain", async () => {
      const store = await StoreFactory.create({
        name: "My Active Store",
        domain: "my-active-store",
        status: "ACTIVE",
      });

      const res = await request(app).get(`/api/storefront/${store.domain}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should resolve store context case-insensitively", async () => {
      await StoreFactory.create({
        name: "Case Test Store",
        domain: "case-test-store",
        status: "ACTIVE",
      });

      const res = await request(app).get(`/api/storefront/Case-Test-Store`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("Non-existent domain", () => {
    it("should return 404 for a non-existent domain", async () => {
      const res = await request(app).get(`/api/storefront/non-existent-domain`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe("DRAFT store", () => {
    it("should return 403 for a DRAFT store", async () => {
      const store = await StoreFactory.create({
        name: "Draft Store",
        domain: "draft-store",
        status: "DRAFT",
      });

      const res = await request(app).get(`/api/storefront/${store.domain}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe("SUSPENDED store", () => {
    it("should return 403 for a SUSPENDED store", async () => {
      const store = await StoreFactory.create({
        name: "Suspended Store",
        domain: "suspended-store",
        status: "SUSPENDED",
      });

      const res = await request(app).get(`/api/storefront/${store.domain}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Session cookie management", () => {
    it("should set a session cookie for new visitors", async () => {
      await StoreFactory.create({
        name: "Cookie Store",
        domain: "cookie-store",
        status: "ACTIVE",
      });

      const res = await request(app).get(`/api/storefront/cookie-store`);

      expect(res.status).toBe(200);

      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();

      const sessionCookie = Array.isArray(cookies)
        ? cookies.find((c: string) => c.startsWith("storefront_session="))
        : cookies?.startsWith("storefront_session=")
          ? cookies
          : undefined;

      expect(sessionCookie).toBeTruthy();
      expect(sessionCookie).toContain("HttpOnly");
    });

    it("should not set a new session cookie when one already exists", async () => {
      await StoreFactory.create({
        name: "Cookie Store 2",
        domain: "cookie-store-2",
        status: "ACTIVE",
      });

      // First request to get the session cookie
      const firstRes = await request(app).get(`/api/storefront/cookie-store-2`);

      const firstCookies = firstRes.headers["set-cookie"];
      const sessionCookie = Array.isArray(firstCookies)
        ? firstCookies.find((c: string) => c.startsWith("storefront_session="))
        : firstCookies;

      // Extract the cookie value to send in the second request
      const cookieValue = sessionCookie?.split(";")[0];

      // Second request with the existing session cookie
      const secondRes = await request(app)
        .get(`/api/storefront/cookie-store-2`)
        .set("Cookie", cookieValue!);

      expect(secondRes.status).toBe(200);

      // Should not set a new session cookie since one was provided
      const secondCookies = secondRes.headers["set-cookie"];
      const newSessionCookie = Array.isArray(secondCookies)
        ? secondCookies?.find((c: string) =>
            c.startsWith("storefront_session="),
          )
        : secondCookies?.startsWith("storefront_session=")
          ? secondCookies
          : undefined;

      expect(newSessionCookie).toBeUndefined();
    });
  });
});
