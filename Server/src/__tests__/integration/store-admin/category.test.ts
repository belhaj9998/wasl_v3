import request from "supertest";
import { app } from "../../setup/testApp";
import { resetDatabase, prisma } from "../../setup/testDatabase";
import { createStoreAdmin } from "../../helpers/auth.helpers";
import { CategoryFactory } from "../../helpers/factories";

/**
 * Integration tests for category CRUD operations (store-admin).
 * Endpoint: /api/stores/:storeId/categories
 * Validates: Requirements 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9
 */
describe("Category Operations (Store Admin)", () => {
  let store: any;
  let accessToken: string;

  beforeEach(async () => {
    await resetDatabase();

    // Create store admin with necessary permissions
    const admin = await createStoreAdmin();
    store = admin.store;
    accessToken = admin.accessToken;

    // Add category permissions to the owner role
    const ownerRole = await prisma.storeRole.findFirst({
      where: { store_id: store.id, slug: "owner" },
    });

    const permissionCodes = [
      "category:view",
      "category:create",
      "category:update",
      "category:delete",
    ];

    for (const code of permissionCodes) {
      const permission = await prisma.permission.create({
        data: {
          code,
          module: "category",
          action: code.split(":")[1],
        },
      });
      await prisma.storeRolePermission.create({
        data: { role_id: ownerRole!.id, permission_id: permission.id },
      });
    }
  });

  // ─── Requirement 6.3: Create category with valid data ───

  it("should create a category with valid data and return 201", async () => {
    const res = await request(app)
      .post(`/api/stores/${store.id}/categories`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-store-id", String(store.id))
      .send({ name: "Electronics" });

    expect(res.status).toBe(201);
    expect(res.body.data.category).toMatchObject({
      name: "Electronics",
      slug: "electronics",
      store_id: store.id,
      parent_id: null,
      is_active: true,
    });
  });

  // ─── Requirement 6.4: Create category with depth > 3 returns 400 ───

  it("should return 400 when creating a category that exceeds depth 3", async () => {
    // Create a 3-level deep chain: root -> child -> grandchild
    const root = await CategoryFactory.create(store.id, { name: "Level 1" });
    const child = await CategoryFactory.create(store.id, {
      name: "Level 2",
      parent_id: root.id,
    });
    const grandchild = await CategoryFactory.create(store.id, {
      name: "Level 3",
      parent_id: child.id,
    });

    // Attempt to create a 4th level
    const res = await request(app)
      .post(`/api/stores/${store.id}/categories`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-store-id", String(store.id))
      .send({ name: "Level 4", parent_id: grandchild.id });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("depth");
  });

  // ─── Requirement 6.5: Create category with non-existent parent returns 404 ───

  it("should return 404 when creating a category with non-existent parent_id", async () => {
    const res = await request(app)
      .post(`/api/stores/${store.id}/categories`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-store-id", String(store.id))
      .send({ name: "Orphan", parent_id: 99999 });

    expect(res.status).toBe(404);
    expect(res.body.error).toContain("Parent category not found");
  });

  // ─── Requirement 6.6: Update category parent to self returns 400 (circular) ───

  it("should return 400 when updating category parent to itself", async () => {
    const category = await CategoryFactory.create(store.id, {
      name: "Self Ref",
    });

    const res = await request(app)
      .patch(`/api/stores/${store.id}/categories/${category.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-store-id", String(store.id))
      .send({ parent_id: category.id });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("circular");
  });

  // ─── Requirement 6.7: Update category parent to descendant returns 400 (circular) ───

  it("should return 400 when updating category parent to its descendant", async () => {
    // Create parent -> child -> grandchild
    const parent = await CategoryFactory.create(store.id, { name: "Parent" });
    const child = await CategoryFactory.create(store.id, {
      name: "Child",
      parent_id: parent.id,
    });
    const grandchild = await CategoryFactory.create(store.id, {
      name: "Grandchild",
      parent_id: child.id,
    });

    // Try to set parent's parent to grandchild (circular)
    const res = await request(app)
      .patch(`/api/stores/${store.id}/categories/${parent.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-store-id", String(store.id))
      .send({ parent_id: grandchild.id });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("circular");
  });

  // ─── Requirement 6.8: Delete category reassigns children ───

  it("should reassign children to deleted category's parent on delete", async () => {
    // Create parent -> middle -> child
    const parent = await CategoryFactory.create(store.id, { name: "Root" });
    const middle = await CategoryFactory.create(store.id, {
      name: "Middle",
      parent_id: parent.id,
    });
    const child = await CategoryFactory.create(store.id, {
      name: "Leaf",
      parent_id: middle.id,
    });

    // Delete the middle category
    const res = await request(app)
      .delete(`/api/stores/${store.id}/categories/${middle.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-store-id", String(store.id));

    expect(res.status).toBe(200);

    // Verify child was reassigned to parent (middle's parent)
    const updatedChild = await prisma.category.findFirst({
      where: { id: child.id },
    });
    expect(updatedChild!.parent_id).toBe(parent.id);
  });

  // ─── Requirement 6.9: Reorder with invalid IDs returns 400 ───

  it("should return 400 when reordering with non-existent category IDs", async () => {
    const res = await request(app)
      .patch(`/api/stores/${store.id}/categories/reorder`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-store-id", String(store.id))
      .send({
        items: [
          { id: 99999, sort_order: 0 },
          { id: 99998, sort_order: 1 },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("do not exist");
  });

  // ─── Requirement 6.3: Unique slug generation with suffix ───

  it("should generate unique slug with numeric suffix for duplicate names", async () => {
    // Create first category with name "Electronics"
    await request(app)
      .post(`/api/stores/${store.id}/categories`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-store-id", String(store.id))
      .send({ name: "Electronics" });

    // Create second category with same name
    const res = await request(app)
      .post(`/api/stores/${store.id}/categories`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-store-id", String(store.id))
      .send({ name: "Electronics" });

    expect(res.status).toBe(201);
    expect(res.body.data.category.slug).toBe("electronics-2");
  });
});
