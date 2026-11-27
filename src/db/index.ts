import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getEnv, ServiceUnavailableError } from "@/lib/env";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema> & { $client: Pool };

declare global {
  // Re-use the pool across hot reloads in development.
  var __zmDb: Database | undefined;
}

/** Shared Drizzle options: TS camelCase fields map to snake_case columns. */
export const drizzleOptions = { schema, casing: "snake_case" } as const;

function createDb(): Database {
  const { DATABASE_URL, NODE_ENV } = getEnv();
  if (!DATABASE_URL) throw new ServiceUnavailableError("database", ["DATABASE_URL"]);

  const pool = new Pool({
    connectionString: DATABASE_URL,
    // Serverless functions should hold few connections; Neon's pooler (PgBouncer) multiplexes them.
    max: NODE_ENV === "production" ? 5 : 10,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  // Lets Vercel Fluid compute close idle clients before an instance is suspended.
  attachDatabasePool(pool);
  return drizzle({ client: pool, ...drizzleOptions });
}

/**
 * Lazily created so that importing this module never fails at build time
 * when DATABASE_URL is absent (e.g. preview builds without a database).
 */
export function getDb(): Database {
  if (!globalThis.__zmDb) globalThis.__zmDb = createDb();
  return globalThis.__zmDb;
}

export { schema };
