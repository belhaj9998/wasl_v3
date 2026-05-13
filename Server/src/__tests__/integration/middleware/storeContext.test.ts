import request from "supertest";
import { app } from "../../setup/testApp";
import { resetDatabase, prisma } from "../../setup/testDatabase";
import { createStoreAdmin } from "../../helpers/auth.helpers";
import { UserFactory, StoreFactory } from "../../helpers/factories";
import jwt, { SignOptions } from "jsonwebtoken";
import { config } from "../../../configs/App.config";

/**
 * Integration tests for resolveStoreContext and requirePermission middleware.
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 8.4, 8.5
 */
describe("Store Context Middleware (resolveStoreContext + requirePermission)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  // ─── Requirement 5.1 & 8.4: Valid x-store-id with membership attaches context ───

  it("should process request when user has valid membership and x-store-id", async () => {
    const { store, accessToken } = await createStoreAdmin();

    // Add "store:view" permission to the owner role
    const permission = await prisma.permission.create({
      data: { code: "store:view", module: "store", action: "view" },
    });
    const ownerRole = await prisma.storeRole.findFirst({
      where: { store_id: store.id, slug: "owner" },
    });
    await prisma.storeRolePermission.create({
      data: { role_id: ownerRole!.id, permission_id: permission.id },
    });

    const res = await request(app)
      .get(`/api/stores/${store.id}/settings`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-store-id", String(store.id));

    // Should succeed (200) — the middleware allowed the request through
    expect(res.status).toBe(200);
  });

  // ─── Requirement 5.2 & 8.5: x-store-id without membership returns 403 ───

  it("should return 403 when user has no membership in the store", async () => {
    // Create a user with no store membership
    const user = await UserFactory.create();
    const store = await StoreFactory.create();

    const accessToken = jwt.sign(
      { userId: user.id, systemRole: user.system_role },
      config.jwtSecret,
      { expiresIn: config.jwtAccessExpiry as SignOptions["expiresIn"] },
    );

    const res = await request(app)
      .get(`/api/stores/${store.id}/settings`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-store-id", String(store.id));

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("not a member");
  });

  // ─── Requirement 5.3: x-store-id for SUSPENDED store returns 403 ───

  it("should return 403 when store is SUSPENDED", async () => {
    const { store, accessToken } = await createStoreAdmin({
      store: { status: "SUSPENDED" },
    });

    const res = await request(app)
      .get(`/api/stores/${store.id}/settings`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-store-id", String(store.id));

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("suspended");
  });

  // ─── Requirement 5.3: x-store-id for ARCHIVED store returns 403 ───

  it("should return 403 when store is ARCHIVED", async () => {
    const { store, accessToken } = await createStoreAdmin({
      store: { status: "ARCHIVED" },
    });

    const res = await request(app)
      .get(`/api/stores/${store.id}/settings`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-store-id", String(store.id));

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("archived");
  });

  // ─── Requirement 5.4: INACTIVE (non-ACTIVE) membership returns 403 ───

  it("should return 403 when user membership is INACTIVE (INVITED status)", async () => {
    const user = await UserFactory.create();
    const store = await StoreFactory.create();

    // Create role and membership with INVITED status (non-ACTIVE)
    const role = await prisma.storeRole.create({
      data: {
        store_id: store.id,
        name: "Staff",
        slug: "staff",
      },
    });

    await prisma.storeMembership.create({
      data: {
        store_id: store.id,
        user_id: user.id,
        role_id: role.id,
        status: "INVITED", // Not ACTIVE
      },
    });

    const accessToken = jwt.sign(
      { userId: user.id, systemRole: user.system_role },
      config.jwtSecret,
      { expiresIn: config.jwtAccessExpiry as SignOptions["expiresIn"] },
    );

    const res = await request(app)
      .get(`/api/stores/${store.id}/settings`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-store-id", String(store.id));

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("invited");
  });

  // ─── Requirement 5.5: requirePermission with missing permission returns 403 ───

  it("should return 403 when user lacks the required permission", async () => {
    const user = await UserFactory.create();
    const store = await StoreFactory.create();

    // Create a role WITHOUT the "store:view" permission
    const role = await prisma.storeRole.create({
      data: {
        store_id: store.id,
        name: "Limited",
        slug: "limited",
      },
    });

    await prisma.storeMembership.create({
      data: {
        store_id: store.id,
        user_id: user.id,
        role_id: role.id,
        status: "ACTIVE",
        joined_at: new Date(),
      },
    });

    const accessToken = jwt.sign(
      { userId: user.id, systemRole: user.system_role },
      config.jwtSecret,
      { expiresIn: config.jwtAccessExpiry as SignOptions["expiresIn"] },
    );

    // GET /settings requires "store:view" permission
    const res = await request(app)
      .get(`/api/stores/${store.id}/settings`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-store-id", String(store.id));

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("store:view");
  });
});
