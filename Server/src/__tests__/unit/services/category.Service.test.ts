import { describe, it, expect } from "vitest";
import { CategoryService } from "../../../services/store-admin/category.Service";

const service = new CategoryService();

/**
 * Helper to create a flat category object for testing buildCategoryTree.
 */
function makeCategory(
  overrides: Partial<{
    id: number;
    store_id: number;
    name: string;
    slug: string;
    parent_id: number | null;
    image_url: string | null;
    sort_order: number;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  }>,
) {
  return {
    id: 1,
    store_id: 1,
    name: "Category",
    slug: "category",
    parent_id: null,
    image_url: null,
    sort_order: 0,
    is_active: true,
    created_at: new Date("2024-01-01"),
    updated_at: new Date("2024-01-01"),
    ...overrides,
  };
}

describe("CategoryService.buildCategoryTree", () => {
  it("returns empty array for empty list", () => {
    const result = service.buildCategoryTree([]);
    expect(result).toEqual([]);
  });

  it("returns single root category with empty children", () => {
    const categories = [makeCategory({ id: 1, name: "Root", slug: "root" })];

    const result = service.buildCategoryTree(categories);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
    expect(result[0].name).toBe("Root");
    expect(result[0].children).toEqual([]);
  });

  it("builds multi-level tree (3 levels deep)", () => {
    const categories = [
      makeCategory({
        id: 1,
        name: "Level 1",
        slug: "level-1",
        parent_id: null,
        sort_order: 0,
      }),
      makeCategory({
        id: 2,
        name: "Level 2",
        slug: "level-2",
        parent_id: 1,
        sort_order: 0,
      }),
      makeCategory({
        id: 3,
        name: "Level 3",
        slug: "level-3",
        parent_id: 2,
        sort_order: 0,
      }),
    ];

    const result = service.buildCategoryTree(categories);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children[0].id).toBe(2);
    expect(result[0].children[0].children).toHaveLength(1);
    expect(result[0].children[0].children[0].id).toBe(3);
    expect(result[0].children[0].children[0].children).toEqual([]);
  });

  it("orphaned children (parent not in list) become roots", () => {
    const categories = [
      makeCategory({
        id: 10,
        name: "Orphan A",
        slug: "orphan-a",
        parent_id: 999,
        sort_order: 0,
      }),
      makeCategory({
        id: 11,
        name: "Orphan B",
        slug: "orphan-b",
        parent_id: 888,
        sort_order: 1,
      }),
      makeCategory({
        id: 12,
        name: "Root",
        slug: "root",
        parent_id: null,
        sort_order: 2,
      }),
    ];

    const result = service.buildCategoryTree(categories);

    // All three should be roots since parents 999 and 888 don't exist in the list
    expect(result).toHaveLength(3);
    const rootIds = result.map((r) => r.id);
    expect(rootIds).toContain(10);
    expect(rootIds).toContain(11);
    expect(rootIds).toContain(12);
  });

  it("sorts children by sort_order at each level", () => {
    const categories = [
      makeCategory({
        id: 1,
        name: "Root",
        slug: "root",
        parent_id: null,
        sort_order: 0,
      }),
      makeCategory({
        id: 2,
        name: "Child C",
        slug: "child-c",
        parent_id: 1,
        sort_order: 3,
      }),
      makeCategory({
        id: 3,
        name: "Child A",
        slug: "child-a",
        parent_id: 1,
        sort_order: 1,
      }),
      makeCategory({
        id: 4,
        name: "Child B",
        slug: "child-b",
        parent_id: 1,
        sort_order: 2,
      }),
      // Nested level — children of Child A (id: 3)
      makeCategory({
        id: 5,
        name: "Sub Z",
        slug: "sub-z",
        parent_id: 3,
        sort_order: 5,
      }),
      makeCategory({
        id: 6,
        name: "Sub X",
        slug: "sub-x",
        parent_id: 3,
        sort_order: 1,
      }),
    ];

    const result = service.buildCategoryTree(categories);

    // Root level
    expect(result).toHaveLength(1);

    // First level children sorted by sort_order: 1, 2, 3
    const children = result[0].children;
    expect(children).toHaveLength(3);
    expect(children[0].id).toBe(3); // sort_order: 1
    expect(children[1].id).toBe(4); // sort_order: 2
    expect(children[2].id).toBe(2); // sort_order: 3

    // Second level children of Child A sorted by sort_order: 1, 5
    const subChildren = children[0].children;
    expect(subChildren).toHaveLength(2);
    expect(subChildren[0].id).toBe(6); // sort_order: 1
    expect(subChildren[1].id).toBe(5); // sort_order: 5
  });
});
