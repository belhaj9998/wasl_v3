import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import { Client } from "pg";

/**
 * One-off migration runner for the `reshape_order_source` migration.
 *
 * The database has no `_prisma_migrations` baseline table, so we apply the
 * generated SQL directly via the `pg` client instead of `prisma migrate deploy`.
 *
 * The SQL file is already wrapped in its own `BEGIN; ... COMMIT;`, so this
 * runner does NOT add a second transaction wrapper around the query. The
 * type-swap is atomic and re-runnable (the MANUAL->ADMIN update is a harmless
 * no-op on a clean DB, and the enum is fully rebuilt).
 */
async function main(): Promise<void> {
  const sqlPath = join(
    __dirname,
    "..",
    "prisma",
    "migrations",
    "20260601002709_reshape_order_source",
    "migration.sql",
  );
  const sql = readFileSync(sqlPath, "utf8");

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(sql);
    console.log("Applied migration: 20260601002709_reshape_order_source");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
