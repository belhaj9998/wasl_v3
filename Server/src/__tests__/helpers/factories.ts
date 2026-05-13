import { prisma } from "../setup/testDatabase";
import type { User, Store, Category } from "../../../generated/prisma";

// Pre-computed bcrypt hash for "Password123!" (10 rounds)
// Using a pre-computed hash avoids slow hashing in tests
const DEFAULT_PASSWORD_HASH =
  "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

// ─── Sequential Counters ────────────────────────────────────────────────────

let userCounter = 0;
let storeCounter = 0;
let categoryCounter = 0;

/**
 * Reset all factory counters. Useful in beforeEach hooks
 * to get predictable values across tests.
 */
export function resetFactoryCounters(): void {
  userCounter = 0;
  storeCounter = 0;
  categoryCounter = 0;
}

// ─── User Factory ───────────────────────────────────────────────────────────

interface UserBuildInput {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  system_role?: "USER" | "SUPPORT" | "PLATFORM_ADMIN" | "PLATFORM_OWNER";
  is_active?: boolean;
}

export const UserFactory = {
  /**
   * Build a plain user object with default values (no DB interaction).
   * Useful for unit tests that don't need persistence.
   */
  build(overrides: UserBuildInput = {}): UserBuildInput & {
    name: string;
    email: string;
    phone: string;
    password: string;
  } {
    userCounter++;
    return {
      name: `Test User ${userCounter}`,
      email: `user${userCounter}@test.com`,
      phone: `+2189100000${String(userCounter).padStart(2, "0")}`,
      password: DEFAULT_PASSWORD_HASH,
      ...overrides,
    };
  },

  /**
   * Create a user in the database with default values.
   * Returns the full Prisma User record.
   */
  async create(overrides: UserBuildInput = {}): Promise<User> {
    const data = UserFactory.build(overrides);
    return prisma.user.create({ data });
  },
};

// ─── Store Factory ──────────────────────────────────────────────────────────

interface StoreBuildInput {
  name?: string;
  domain?: string;
  status?: "DRAFT" | "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  currency_code?: string;
  locale?: string;
  timezone?: string;
  description?: string;
}

export const StoreFactory = {
  /**
   * Build a plain store object with default values (no DB interaction).
   */
  build(overrides: StoreBuildInput = {}): StoreBuildInput & {
    name: string;
    domain: string;
  } {
    storeCounter++;
    return {
      name: `Test Store ${storeCounter}`,
      domain: `test-store-${storeCounter}`,
      status: "ACTIVE",
      ...overrides,
    };
  },

  /**
   * Create a store in the database with default values.
   * Returns the full Prisma Store record.
   */
  async create(overrides: StoreBuildInput = {}): Promise<Store> {
    const data = StoreFactory.build(overrides);
    return prisma.store.create({ data });
  },
};

// ─── Category Factory ───────────────────────────────────────────────────────

interface CategoryBuildInput {
  store_id?: number;
  name?: string;
  slug?: string;
  parent_id?: number | null;
  image_url?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export const CategoryFactory = {
  /**
   * Build a plain category object with default values (no DB interaction).
   * Requires a store_id since categories always belong to a store.
   */
  build(
    storeId: number,
    overrides: Omit<CategoryBuildInput, "store_id"> = {},
  ): CategoryBuildInput & {
    store_id: number;
    name: string;
    slug: string;
  } {
    categoryCounter++;
    const name = overrides.name || `Category ${categoryCounter}`;
    const slug = overrides.slug || `category-${categoryCounter}`;
    return {
      store_id: storeId,
      name,
      slug,
      parent_id: null,
      sort_order: 0,
      is_active: true,
      ...overrides,
    };
  },

  /**
   * Create a category in the database with default values.
   * Returns the full Prisma Category record.
   */
  async create(
    storeId: number,
    overrides: Omit<CategoryBuildInput, "store_id"> = {},
  ): Promise<Category> {
    const data = CategoryFactory.build(storeId, overrides);
    return prisma.category.create({ data });
  },

  /**
   * Create a category tree: one parent with the specified number of children.
   * Returns an array where the first element is the parent and the rest are children.
   */
  async createTree(
    storeId: number,
    childrenCount: number = 2,
  ): Promise<Category[]> {
    const parent = await CategoryFactory.create(storeId, {
      name: `Parent Category ${categoryCounter + 1}`,
    });

    const children: Category[] = [];
    for (let i = 0; i < childrenCount; i++) {
      const child = await CategoryFactory.create(storeId, {
        parent_id: parent.id,
        name: `Child Category ${i + 1}`,
        sort_order: i,
      });
      children.push(child);
    }

    return [parent, ...children];
  },
};
