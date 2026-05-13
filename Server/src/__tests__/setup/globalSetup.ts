import { execSync } from "child_process";

/**
 * Derives the test database URL by appending `_test` to the database name
 * in the existing DATABASE_URL.
 */
function getTestDatabaseUrl(): string {
  const originalUrl = process.env.DATABASE_URL;

  if (!originalUrl) {
    throw new Error(
      "DATABASE_URL is not set. Please ensure .env file exists with a valid DATABASE_URL.",
    );
  }

  // Parse the URL and append _test to the database name
  // Format: postgresql://user:pass@host:port/dbname?schema=public
  const url = new URL(originalUrl);
  const dbName = url.pathname.slice(1); // remove leading "/"
  url.pathname = `/${dbName}_test`;

  return url.toString();
}

/**
 * Vitest global setup for integration tests.
 * - Sets DATABASE_URL to point to the test database
 * - Runs `prisma db push` to synchronize the schema
 */
export default async function setup() {
  // Load .env if not already loaded
  require("dotenv").config();

  const testDatabaseUrl = getTestDatabaseUrl();

  // Set the test database URL for all subsequent operations
  process.env.DATABASE_URL = testDatabaseUrl;

  console.log(
    `\n[Test Setup] Using test database: ${testDatabaseUrl.replace(/\/\/.*@/, "//***@")}`,
  );

  try {
    // Use prisma db push to synchronize schema (no migrations directory in this project)
    execSync("npx prisma db push --accept-data-loss", {
      env: { ...process.env, DATABASE_URL: testDatabaseUrl },
      stdio: "pipe",
      cwd: process.cwd(),
    });

    console.log("[Test Setup] Database schema synchronized successfully.");
  } catch (error: any) {
    console.error("[Test Setup] Failed to synchronize test database schema.");
    console.error(error.stderr?.toString() || error.message);
    throw error;
  }
}

/**
 * Vitest global teardown for integration tests.
 * Cleans up the test database connection.
 * Note: Individual test files should NOT call disconnect() — it's handled here.
 */
export async function teardown() {
  console.log("\n[Test Teardown] Integration test suite completed.");
}
