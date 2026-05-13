import { PrismaClient } from "../../../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import dotenv from "dotenv";

// Load .env so DATABASE_URL is available in forked test processes
dotenv.config();

/**
 * Derives the test database URL by appending `_test` to the database name.
 */
function getTestDatabaseUrl(): string {
  const originalUrl = process.env.DATABASE_URL;
  if (!originalUrl) {
    throw new Error("DATABASE_URL is not set.");
  }
  const url = new URL(originalUrl);
  const dbName = url.pathname.slice(1);
  if (!dbName.endsWith("_test")) {
    url.pathname = `/${dbName}_test`;
  }
  return url.toString();
}

const testDbUrl = getTestDatabaseUrl();

const pool = new Pool({
  connectionString: testDbUrl,
});

const adapter = new PrismaPg(pool as any);

/**
 * Dedicated PrismaClient instance for test database operations.
 * Uses PrismaPg adapter with the test database URL.
 */
const prisma = new PrismaClient({ adapter } as any);

/**
 * All table names in the database, derived from the Prisma schema.
 * Order doesn't matter since we use CASCADE.
 */
const ALL_TABLES = [
  "OrderTimeline",
  "Shipment",
  "PaymentTransaction",
  "OrderAddress",
  "OrderItem",
  "Order",
  "CouponUsage",
  "Coupon",
  "CartItem",
  "Cart",
  "CustomerAddress",
  "Customer",
  "InventoryMovement",
  "Inventory",
  "VariantOptionValue",
  "ProductVariant",
  "ProductOptionValue",
  "ProductOption",
  "ProductMedia",
  "ProductCategory",
  "Product",
  "Category",
  "StoreMembership",
  "StoreRolePermission",
  "StoreRole",
  "Permission",
  "StoreSubscription",
  "SubscriptionPlan",
  "Store",
  "RefreshToken",
  "User",
];

/**
 * Resets all tables in the test database using TRUNCATE CASCADE.
 * This removes all data while preserving the schema structure.
 * Should be called in beforeEach/afterEach hooks for test isolation.
 */
export async function resetDatabase(): Promise<void> {
  const tableNames = ALL_TABLES.map((t) => `"${t}"`).join(", ");
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE`,
  );
}

/**
 * Resets specific tables in the test database using TRUNCATE CASCADE.
 * Useful when you only need to clean up certain tables between tests.
 *
 * @param tables - Array of table names to truncate (use PascalCase model names)
 */
export async function resetTables(tables: string[]): Promise<void> {
  if (tables.length === 0) return;

  const tableNames = tables.map((t) => `"${t}"`).join(", ");
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE`,
  );
}

/**
 * Disconnects the Prisma client and closes the connection pool.
 * Should be called in afterAll hooks to clean up database connections.
 */
export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
  await pool.end();
}

export { prisma };
