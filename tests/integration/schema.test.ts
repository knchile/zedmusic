import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { seedReferenceData } from "@/db/seed";
import { pgErrorCode, testDb } from "./helpers";

const { db, pool } = testDb();
afterAll(() => pool.end());

let userId: string;
let artistId: string;
let trackId: string;

beforeAll(async () => {
  userId = `u_${Date.now()}`;
  await db.insert(schema.users).values({ id: userId, name: "Test", email: `${userId}@example.com` });
  const [artist] = await db.insert(schema.artists).values({ slug: `artist-${userId}`, name: "Test Artist" }).returning();
  artistId = artist!.id;
  const [track] = await db
    .insert(schema.tracks)
    .values({ artistId, slug: "song", title: "Song", durationMs: 180_000 })
    .returning();
  trackId = track!.id;
});

describe("migrations and reference data", () => {
  it("seeds reference data idempotently", async () => {
    const first = await seedReferenceData(db);
    const second = await seedReferenceData(db);
    expect(first.genres).toBeGreaterThan(0);
    expect(second).toEqual({ genres: 0, ruleSets: 0, charts: 0 });
    const active = await db.select().from(schema.streamRuleSets).where(eq(schema.streamRuleSets.isActive, true));
    expect(active).toHaveLength(1);
    expect(active[0]!.minListenSeconds).toBe(30);
  });

  it("maintains full-text search vectors automatically", async () => {
    const rows = await db.execute<{ id: string }>(
      sql`select id from artists where search_vector @@ plainto_tsquery('simple', 'test artist')`,
    );
    expect(rows.rows.map((r) => r.id)).toContain(artistId);
  });

  it("supports fuzzy (trigram) matching for misspelled names", async () => {
    const rows = await db.execute<{ id: string }>(sql`select id from artists where name % 'Tesst Artis'`);
    expect(rows.rows.map((r) => r.id)).toContain(artistId);
  });
});

describe("data integrity constraints", () => {
  it("rejects music submissions without a rights confirmation", async () => {
    const code = await pgErrorCode(() =>
      db.insert(schema.musicSubmissions).values({
        artistId,
        trackId,
        submittedById: userId,
        rightsConfirmed: false,
        rightsConfirmedAt: new Date(),
        rightsStatementVersion: "test",
      }),
    );
    expect(code).toBe("23514"); // check_violation
  });

  it("rejects non-positive track durations", async () => {
    const code = await pgErrorCode(() =>
      db.insert(schema.tracks).values({ artistId, slug: "bad", title: "Bad", durationMs: 0 }),
    );
    expect(code).toBe("23514");
  });

  it("prevents duplicate track slugs for the same artist", async () => {
    const code = await pgErrorCode(() => db.insert(schema.tracks).values({ artistId, slug: "song", title: "Again" }));
    expect(code).toBe("23505"); // unique_violation
  });

  it("allows only one open verification request per artist/requester/type", async () => {
    const values = { artistId, requesterId: userId, type: "verification" as const };
    await db.insert(schema.artistVerificationRequests).values(values);
    expect(await pgErrorCode(() => db.insert(schema.artistVerificationRequests).values(values))).toBe("23505");
    // Once reviewed, a new request is allowed.
    await db.update(schema.artistVerificationRequests).set({ status: "rejected" });
    expect(await pgErrorCode(() => db.insert(schema.artistVerificationRequests).values(values))).toBeNull();
  });

  it("prevents duplicate chart ranks, duplicate tracks in one chart, and two published charts per period", async () => {
    const [chart] = await db.select().from(schema.chartDefinitions).limit(1);
    const period = {
      chartId: chart!.id,
      periodStart: "2026-11-20",
      periodEnd: "2026-11-26",
      methodologySnapshot: {},
      dataCutoffAt: new Date(),
      status: "published" as const,
    };
    const [p1] = await db.insert(schema.chartPeriods).values(period).returning();
    // A second published revision for the same period is refused.
    expect(await pgErrorCode(() => db.insert(schema.chartPeriods).values({ ...period, revision: 2 }))).toBe("23505");

    const entry = {
      periodId: p1!.id,
      rank: 1,
      trackId,
      artistId,
      trackTitle: "Song",
      artistName: "Test Artist",
      score: "10",
      qualifiedStreams: 10,
      peakRank: 1,
    };
    await db.insert(schema.chartEntries).values(entry);
    expect(await pgErrorCode(() => db.insert(schema.chartEntries).values({ ...entry, rank: 2 }))).toBe("23505");

    const [other] = await db.insert(schema.tracks).values({ artistId, slug: "song-2", title: "Song 2" }).returning();
    expect(await pgErrorCode(() => db.insert(schema.chartEntries).values({ ...entry, trackId: other!.id }))).toBe("23505");
  });

  it("protects charted tracks from deletion (published history is immutable)", async () => {
    expect(await pgErrorCode(() => db.delete(schema.tracks).where(eq(schema.tracks.id, trackId)))).toBe("23503");
  });

  it("prevents importing the same external report file twice for an artist", async () => {
    const report = {
      artistId,
      platform: "youtube" as const,
      source: "csv_upload" as const,
      periodStart: "2026-10-01",
      periodEnd: "2026-10-31",
      granularity: "monthly" as const,
      fileSha256: "abc123",
    };
    await db.insert(schema.externalReports).values(report);
    expect(await pgErrorCode(() => db.insert(schema.externalReports).values(report))).toBe("23505");
  });
});
