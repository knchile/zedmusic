import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";

export function testDb() {
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 3 });
  const db = drizzle({ client: pool, schema, casing: "snake_case" });
  return { db, pool };
}

/** Run a statement and return the Postgres error code it fails with (or null). */
export async function pgErrorCode(fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await fn();
    return null;
  } catch (err) {
    const e = err as { code?: string; cause?: { code?: string } };
    return e.code ?? e.cause?.code ?? "unknown";
  }
}
