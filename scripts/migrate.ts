/**
 * Apply pending migrations. Safe to run repeatedly (already-applied migrations are skipped)
 * and runs inside a transaction per migration. Used locally and in the deploy pipeline:
 *   npm run db:migrate
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL (or DATABASE_URL_UNPOOLED) is not set. Nothing to migrate.");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    const db = drizzle({ client: pool });
    console.log("Applying migrations…");
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("Migrations complete.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
