import "server-only";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";

/**
 * Fixed-window rate limiter stored in Postgres (`rate_limits`), shared across
 * serverless instances. Keys are prefixed "zm:" to keep them apart from Better Auth's.
 * Returns whether the request is allowed and how many were used in the window.
 */
export async function consumeRateLimit(key: string, limit: number, windowSec: number) {
  const now = Date.now();
  const windowStart = now - windowSec * 1000;
  const fullKey = `zm:${key}`;
  const res = await getDb().execute<{ count: number }>(sql`
    insert into rate_limits (id, key, count, last_request)
    values (${randomUUID()}, ${fullKey}, 1, ${now})
    on conflict (key) do update set
      count = case when rate_limits.last_request < ${windowStart} then 1 else rate_limits.count + 1 end,
      last_request = case when rate_limits.last_request < ${windowStart} then ${now} else rate_limits.last_request end
    returning count
  `);
  const count = Number(res.rows[0]?.count ?? 1);
  return { allowed: count <= limit, count, limit };
}
