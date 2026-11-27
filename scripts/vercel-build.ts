/**
 * Vercel build entry point (`vercel-build` npm script).
 * - Production: apply migrations + reference seed, then build. Fails the deploy if
 *   migrations fail, so a broken schema never goes live.
 * - Preview: migrates only when MIGRATE_ON_PREVIEW=1 (use with a separate Neon preview
 *   branch); otherwise previews never touch the production database schema.
 * - No database configured: builds anyway (pages show "unavailable"/empty states).
 */
import { execSync } from "node:child_process";

const run = (cmd: string) => execSync(cmd, { stdio: "inherit" });
const env = process.env.VERCEL_ENV ?? "development";
const hasDb = !!(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL);
const migrate = hasDb && (env === "production" || process.env.MIGRATE_ON_PREVIEW === "1");

if (migrate) {
  console.log(`[vercel-build] ${env}: applying migrations and reference data`);
  run("npm run db:migrate");
  run("npm run db:seed");
} else if (!hasDb) {
  console.warn("[vercel-build] No DATABASE_URL — building without a database. Add Neon from the Vercel Marketplace.");
} else {
  console.log(`[vercel-build] ${env}: skipping migrations (set MIGRATE_ON_PREVIEW=1 with a Neon preview branch to enable)`);
}
run("next build");
