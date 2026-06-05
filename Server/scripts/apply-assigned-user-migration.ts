import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import { Client } from "pg";

/**
 * One-off migration runner for the `add_order_assigned_user` migration.
 *
 * The database has no `_prisma_migrations` baseline table, so we apply the
 * generated SQL directly via the `pg` client instead of `prisma migrate deploy`.
 */
async function main(): Promise<void> {
  const sqlPath = join(
    __dirname,
    "..",
    "prisma",
    "migrations",
    "20260531125558_add_order_assigned_user",
    "migration.sql",
  );
  const sql = readFileSync(sqlPath, "utf8");

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("Applied migration: 20260531125558_add_order_assigned_user");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
