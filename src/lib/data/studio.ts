import "server-only";
import { asc, count, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

/** Private studio reads. Callers must authorise access to the artist first. */

export async function getStudioArtist(artistId: string) {
  return getDb().query.artists.findFirst({ where: eq(schema.artists.id, artistId) });
}

export async function listStudioReleases(artistId: string) {
  const db = getDb();
  return db
    .select({
      id: schema.releases.id,
      slug: schema.releases.slug,
      title: schema.releases.title,
      type: schema.releases.type,
      status: schema.releases.status,
      releaseDate: schema.releases.releaseDate,
      artworkKey: schema.releases.artworkKey,
      updatedAt: schema.releases.updatedAt,
      trackCount: count(schema.tracks.id),
    })
    .from(schema.releases)
    .leftJoin(schema.tracks, eq(schema.tracks.releaseId, schema.releases.id))
    .where(eq(schema.releases.artistId, artistId))
    .groupBy(schema.releases.id)
    .orderBy(desc(schema.releases.updatedAt));
}

export async function getStudioRelease(artistId: string, releaseId: string) {
  const db = getDb();
  const release = await db.query.releases.findFirst({ where: eq(schema.releases.id, releaseId) });
  if (!release || release.artistId !== artistId) return null;
  const tracks = await db
    .select()
    .from(schema.tracks)
    .where(eq(schema.tracks.releaseId, releaseId))
    .orderBy(asc(schema.tracks.trackNumber), asc(schema.tracks.createdAt));
  const submissions = await db
    .select()
    .from(schema.musicSubmissions)
    .where(eq(schema.musicSubmissions.releaseId, releaseId))
    .orderBy(desc(schema.musicSubmissions.createdAt))
    .limit(5);
  return { release, tracks, submissions };
}

export async function latestVerificationRequest(artistId: string) {
  const [row] = await getDb()
    .select()
    .from(schema.artistVerificationRequests)
    .where(eq(schema.artistVerificationRequests.artistId, artistId))
    .orderBy(desc(schema.artistVerificationRequests.createdAt))
    .limit(1);
  return row ?? null;
}
