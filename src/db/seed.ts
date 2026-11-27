import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { CHART_DEFINITIONS, GENRES, STREAM_RULES_V1 } from "./seed-data";

type Db = NodePgDatabase<typeof schema>;

/**
 * Apply reference data. Idempotent: existing rows are left untouched so admin
 * edits made in production are never overwritten.
 */
export async function seedReferenceData(db: Db) {
  return db.transaction(async (tx) => {
    const genres = await tx
      .insert(schema.genres)
      .values(GENRES.map((g, i) => ({ ...g, sortOrder: i })))
      .onConflictDoNothing({ target: schema.genres.slug })
      .returning({ id: schema.genres.id });

    // Only activate v1 if no rule set is active yet.
    const [{ active }] = await tx
      .select({ active: sql<number>`count(*)::int` })
      .from(schema.streamRuleSets)
      .where(sql`${schema.streamRuleSets.isActive} = true`);
    const rules = await tx
      .insert(schema.streamRuleSets)
      .values({ ...STREAM_RULES_V1, isActive: active === 0 })
      .onConflictDoNothing({ target: schema.streamRuleSets.version })
      .returning({ id: schema.streamRuleSets.id });

    const charts = await tx
      .insert(schema.chartDefinitions)
      .values(CHART_DEFINITIONS)
      .onConflictDoNothing({ target: schema.chartDefinitions.slug })
      .returning({ id: schema.chartDefinitions.id });

    return { genres: genres.length, ruleSets: rules.length, charts: charts.length };
  });
}
