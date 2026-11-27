import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

/** Recreate the test database schema from migrations before the suite runs. */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL must point to a disposable PostgreSQL database.");
  if (/neon\.tech|prod/i.test(url) && !process.env.ALLOW_REMOTE_TEST_DB) {
    throw new Error("Refusing to wipe what looks like a remote/production database. Set ALLOW_REMOTE_TEST_DB=1 to override.");
  }
  const pool = new Pool({ connectionString: url, max: 1 });
  await pool.query("DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;");
  await migrate(drizzle({ client: pool }), { migrationsFolder: "./drizzle" });
  await pool.end();
}
