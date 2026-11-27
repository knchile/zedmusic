/**
 * Seed reference data (genres, stream rules v1, chart definitions).
 *   npm run db:seed
 *
 * Demonstration catalogue data is intentionally NOT created here. It will be added
 * behind `--demo` (refused in production, flagged `is_demo`) once Phase 2 pages exist.
 */
import { seedReferenceData } from "../src/db/seed";
import { scriptDb } from "./lib/db";

async function main() {
  const { db, pool } = scriptDb();
  try {
    const result = await seedReferenceData(db);
    console.log(
      `Reference data applied: ${result.genres} genres, ${result.ruleSets} stream rule sets, ${result.charts} chart definitions inserted (existing rows unchanged).`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
