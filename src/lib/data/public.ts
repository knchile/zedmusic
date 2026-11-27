import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { getDb, schema } from "@/db";
import { isConfigured } from "@/lib/env";

/**
 * Public, cacheable reads. Each returns an empty result when the database isn't
 * configured so that pages render a clear empty state instead of crashing.
 * Invalidate with `revalidateTag(<tag>)` after admin changes.
 */

export async function getActiveGenres() {
  "use cache";
  cacheLife("hours");
  cacheTag("genres");
  if (!isConfigured("database")) return [];
  return getDb()
    .select({ id: schema.genres.id, slug: schema.genres.slug, name: schema.genres.name })
    .from(schema.genres)
    .where(eq(schema.genres.isActive, true))
    .orderBy(asc(schema.genres.sortOrder), asc(schema.genres.name));
}

export async function getActiveCharts() {
  "use cache";
  cacheLife("hours");
  cacheTag("charts");
  if (!isConfigured("database")) return [];
  return getDb()
    .select({
      id: schema.chartDefinitions.id,
      slug: schema.chartDefinitions.slug,
      name: schema.chartDefinitions.name,
      description: schema.chartDefinitions.description,
      periodType: schema.chartDefinitions.periodType,
      size: schema.chartDefinitions.size,
    })
    .from(schema.chartDefinitions)
    .where(eq(schema.chartDefinitions.isActive, true))
    .orderBy(asc(schema.chartDefinitions.sortOrder));
}

export type PublishedChart = {
  chart: { slug: string; name: string };
  period: { id: string; periodStart: string; periodEnd: string; publishedAt: Date | null };
  entries: {
    rank: number;
    previousRank: number | null;
    trackTitle: string;
    artistName: string;
    artworkKey: string | null;
    qualifiedStreams: number;
    periodsOnChart: number;
    isNewEntry: boolean;
    isReEntry: boolean;
  }[];
};

/** Latest published period of a chart, with its frozen entries. */
export async function getLatestPublishedChart(slug: string): Promise<PublishedChart | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("charts", `chart:${slug}`);
  if (!isConfigured("database")) return null;
  const db = getDb();
  const [row] = await db
    .select({
      chartSlug: schema.chartDefinitions.slug,
      chartName: schema.chartDefinitions.name,
      id: schema.chartPeriods.id,
      periodStart: schema.chartPeriods.periodStart,
      periodEnd: schema.chartPeriods.periodEnd,
      publishedAt: schema.chartPeriods.publishedAt,
    })
    .from(schema.chartPeriods)
    .innerJoin(schema.chartDefinitions, eq(schema.chartDefinitions.id, schema.chartPeriods.chartId))
    .where(and(eq(schema.chartDefinitions.slug, slug), eq(schema.chartPeriods.status, "published")))
    .orderBy(desc(schema.chartPeriods.periodEnd))
    .limit(1);
  if (!row) return null;

  const entries = await db
    .select({
      rank: schema.chartEntries.rank,
      previousRank: schema.chartEntries.previousRank,
      trackTitle: schema.chartEntries.trackTitle,
      artistName: schema.chartEntries.artistName,
      artworkKey: schema.chartEntries.artworkKey,
      qualifiedStreams: schema.chartEntries.qualifiedStreams,
      periodsOnChart: schema.chartEntries.periodsOnChart,
      isNewEntry: schema.chartEntries.isNewEntry,
      isReEntry: schema.chartEntries.isReEntry,
    })
    .from(schema.chartEntries)
    .where(eq(schema.chartEntries.periodId, row.id))
    .orderBy(asc(schema.chartEntries.rank));

  return {
    chart: { slug: row.chartSlug, name: row.chartName },
    period: { id: row.id, periodStart: row.periodStart, periodEnd: row.periodEnd, publishedAt: row.publishedAt },
    entries,
  };
}
