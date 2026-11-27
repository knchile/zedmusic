import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../../src/db/schema";

/** Standalone DB connection for CLI scripts (outside Next.js). */
export function scriptDb(url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL) {
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url, max: 2 });
  const db = drizzle({ client: pool, schema, casing: "snake_case" });
  return { db, pool, schema };
}

export type ScriptDb = ReturnType<typeof scriptDb>["db"];
