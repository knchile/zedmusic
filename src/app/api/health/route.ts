import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { getDb } from "@/db";
import { isConfigured, serviceStatus } from "@/lib/env";

/**
 * Health check for uptime monitors and post-deploy verification.
 * Reports which services are configured (booleans only — never values) and whether
 * the database answers. Returns 503 when the database is unreachable.
 */
export async function GET() {
  await connection();
  const services = serviceStatus();
  let database: "ok" | "unconfigured" | "error" = "unconfigured";
  if (isConfigured("database")) {
    try {
      await getDb().execute(sql`select 1`);
      database = "ok";
    } catch {
      database = "error";
    }
  }
  const status = database === "ok" ? 200 : 503;
  return Response.json(
    { status: database === "ok" ? "ok" : "degraded", database, services, time: new Date().toISOString() },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
