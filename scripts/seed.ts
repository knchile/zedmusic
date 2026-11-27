/**
 * Seed reference data (genres, stream rules v1, chart definitions).
 *   npm run db:seed
 *
 * Optional local demo catalogue (clearly labelled "Demo", flagged is_demo, synthesised
 * tones instead of music). Refused in production and when real object storage is set:
 *   ALLOW_DEMO_DATA=true npm run db:seed -- --demo
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { seedReferenceData } from "../src/db/seed";
import { scriptDb } from "./lib/db";

function toneWav(secs: number, freqs: number[]) {
  const rate = 22050, n = rate * secs;
  const b = Buffer.alloc(44 + n * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVE", 8); b.write("fmt ", 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const f = freqs[Math.floor((i / rate) * 2) % freqs.length]!;
    b.writeInt16LE(Math.round(Math.sin((2 * Math.PI * f * i) / rate) * 5000), 44 + i * 2);
  }
  return b;
}

async function seedDemo(db: ReturnType<typeof scriptDb>["db"], schema: ReturnType<typeof scriptDb>["schema"]) {
  if (process.env.NODE_ENV === "production" || process.env.ALLOW_DEMO_DATA !== "true") {
    throw new Error("Demo data requires ALLOW_DEMO_DATA=true and is never allowed in production.");
  }
  if (process.env.S3_ENDPOINT) throw new Error("Demo data is for local storage only; unset S3_ENDPOINT.");
  const genre = await db.query.genres.findFirst({ where: eq(schema.genres.slug, "afro-pop") });
  const root = path.join(process.cwd(), ".data", "storage", "audio");
  const scales = [[262, 330, 392], [294, 370, 440], [330, 415, 494]];
  for (let a = 1; a <= 3; a++) {
    const slug = `demo-artist-${a}`;
    if (await db.query.artists.findFirst({ where: eq(schema.artists.slug, slug) })) continue;
    const [artist] = await db
      .insert(schema.artists)
      .values({ slug, name: `Demo Artist ${a}`, bio: "Demonstration profile for local development. Not a real artist.", location: "Demo City", isDemo: true, origin: "platform_created", primaryGenreId: genre?.id })
      .returning();
    const [release] = await db
      .insert(schema.releases)
      .values({ artistId: artist!.id, slug: "demo-release", title: `Demo Release ${a}`, type: "ep", status: "published", publishedAt: new Date(), releaseDate: "2026-11-01", isDemo: true })
      .returning();
    for (let t = 1; t <= 2; t++) {
      const key = `tracks/${artist!.id}/demo-${t}.wav`;
      await mkdir(path.join(root, path.dirname(key)), { recursive: true });
      await writeFile(path.join(root, key), toneWav(65 + t * 5, scales[(a + t) % 3]!));
      await db.insert(schema.tracks).values({
        artistId: artist!.id, releaseId: release!.id, trackNumber: t, slug: `demo-track-${t}`, title: `Demo Track ${a}.${t}`,
        genreId: genre?.id, status: "published", publishedAt: new Date(), durationMs: (65 + t * 5) * 1000,
        streamKey: key, streamMimeType: "audio/wav", isDemo: true, releaseDate: "2026-11-01",
      });
    }
  }
  console.log("Demo catalogue ready (3 artists, flagged is_demo). Shown only when ALLOW_DEMO_DATA=true outside production.");
}

async function main() {
  const { db, pool, schema } = scriptDb();
  try {
    const result = await seedReferenceData(db);
    console.log(
      `Reference data applied: ${result.genres} genres, ${result.ruleSets} stream rule sets, ${result.charts} chart definitions inserted (existing rows unchanged).`,
    );
    if (process.argv.includes("--demo")) await seedDemo(db, schema);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
