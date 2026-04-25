/**
 * Programmatic equivalent of `pnpm db:migrate`. We reach for this when
 * drizzle-kit's CLI swallows error output (a known issue in 0.31.10
 * where exit code 1 is returned with zero diagnostic text).
 *
 * Connects to the same DATABASE_URL drizzle.config.ts uses, points at
 * the same migrations folder, and surfaces the real Postgres error if
 * any statement fails. Idempotent — re-running after success is a
 * no-op since drizzle tracks applied hashes in
 * drizzle.__drizzle_migrations.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set in .env.local");
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(sql);

  try {
    console.log("Applying pending migrations…");
    await migrate(db, { migrationsFolder: "./src/lib/db/migrations" });
    console.log("✓ Migrations applied successfully.");
  } catch (err) {
    console.error("✗ Migration failed:", err);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

main();
