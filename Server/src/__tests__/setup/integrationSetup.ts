import dotenv from "dotenv";
import { afterAll, beforeEach } from "vitest";

/**
 * Setup file that runs inside the Vitest worker process for integration tests.
 * Loads .env and derives the test database URL before any test modules are imported.
 */
dotenv.config();

// Derive test database URL only if not already pointing to the test DB
const originalUrl = process.env.DATABASE_URL;
if (originalUrl) {
  const url = new URL(originalUrl);
  const dbName = url.pathname.slice(1);
  if (!dbName.endsWith("_test")) {
    url.pathname = `/${dbName}_test`;
    process.env.DATABASE_URL = url.toString();
  }
}

/**
 * Global beforeEach hook to reset factory counters for predictable test data.
 */
beforeEach(async () => {
  const { resetFactoryCounters } = await import("../helpers/factories");
  resetFactoryCounters();
});

/**
 * Global afterAll hook to disconnect the shared Prisma client and pool
 * after ALL test files in this worker have finished.
 * Individual test files should NOT call disconnect() themselves.
 */
afterAll(async () => {
  const { disconnect } = await import("./testDatabase");
  await disconnect();
});
