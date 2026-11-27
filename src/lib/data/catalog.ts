import "server-only";
import { and, asc, count, desc, eq, inArray, isNotNull, or, type SQL, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { getDb, schema } from "@/db";
import { getEnv, isConfigured } from "@/lib/env";
import { mediaUrl } from "@/lib/storage";

/**
 * Public catalogue reads. Only `published` content from `active` artists is ever
 * returned. Demo rows are hidden unless ALLOW_DEMO_DATA is on outside production.
 */

const { artists: a, releases: r, tracks: t, genres: g } = schema;

function showDemo() {
  const env = getEnv();
  return env.ALLOW_DEMO_DATA && env.NODE_ENV !== "production";
}

function visibleArtist(): SQL {
  return showDemo() ? eq(a.state, "active") : and(eq(a.state, "active"), eq(a.isDemo, false))!;
}
function visibleTrack(): SQL {
  return and(eq(t.status, "published"), showDemo() ? sql`true` : eq(t.isDemo, false))!;
}
function visibleRelease(): SQL {
  return and(eq(r.status, "published"), showDemo() ? sql`true` : eq(r.isDemo, false))!;
}

export type { PlayableTrack } from "@/lib/types/catalog";
import type { PlayableTrack } from "@/lib/types/catalog";

const trackColumns = {
  id: t.id,
  title: t.title,
  slug: t.slug,
  featuring: t.featuring,
  artistId: a.id,
  artistName: a.name,
  artistSlug: a.slug,
  releaseTitle: r.title,
  releaseSlug: r.slug,
  trackArtwork: t.artworkKey,
  releaseArtwork: r.artworkKey,
  durationMs: t.durationMs,
  isExplicit: t.isExplicit,
};

type TrackRow = { [K in keyof typeof trackColumns]: unknown };
function toPlayable(row: TrackRow): PlayableTrack {
  return {
    id: row.id as string,
    title: row.title as string,
    slug: row.slug as string,
    featuring: (row.featuring as string | null) ?? null,
    artistId: row.artistId as string,
    artistName: row.artistName as string,
    artistSlug: row.artistSlug as string,
    releaseTitle: (row.releaseTitle as string | null) ?? null,
    releaseSlug: (row.releaseSlug as string | null) ?? null,
    artworkUrl: mediaUrl((row.trackArtwork as string | null) ?? (row.releaseArtwork as string | null)),
    durationMs: (row.durationMs as number | null) ?? 0,
    isExplicit: !!row.isExplicit,
  };
}

function trackQuery() {
  return getDb()
    .select(trackColumns)
    .from(t)
    .innerJoin(a, eq(a.id, t.artistId))
    .leftJoin(r, eq(r.id, t.releaseId));
}

export type ReleaseCard = {
  id: string;
  slug: string;
  title: string;
  type: "single" | "ep" | "album";
  releaseDate: string | null;
  artworkUrl: string | null;
  artistName: string;
  artistSlug: string;
};

function releaseQuery() {
  return getDb()
    .select({
      id: r.id,
      slug: r.slug,
      title: r.title,
      type: r.type,
      releaseDate: r.releaseDate,
      artworkKey: r.artworkKey,
      artistName: a.name,
      artistSlug: a.slug,
      publishedAt: r.publishedAt,
    })
    .from(r)
    .innerJoin(a, eq(a.id, r.artistId));
}
const toReleaseCard = (x: Awaited<ReturnType<ReturnType<typeof releaseQuery>["execute"]>>[number]): ReleaseCard => ({
  id: x.id,
  slug: x.slug,
  title: x.title,
  type: x.type,
  releaseDate: x.releaseDate,
  artworkUrl: mediaUrl(x.artworkKey),
  artistName: x.artistName,
  artistSlug: x.artistSlug,
});

export type ArtistCard = {
  id: string;
  slug: string;
  name: string;
  location: string | null;
  avatarUrl: string | null;
  verified: boolean;
};

// ---------------------------------------------------------------------------

export async function getNewReleases(limit = 24, offset = 0): Promise<ReleaseCard[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog", "new-releases");
  if (!isConfigured("database")) return [];
  const rows = await releaseQuery()
    .where(and(visibleRelease(), visibleArtist()))
    .orderBy(desc(r.releaseDate), desc(r.publishedAt))
    .limit(limit)
    .offset(offset);
  return rows.map(toReleaseCard);
}

export async function getRecentTracks(limit = 12): Promise<PlayableTrack[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  if (!isConfigured("database")) return [];
  const rows = await trackQuery().where(and(visibleTrack(), visibleArtist())).orderBy(desc(t.publishedAt)).limit(limit);
  return rows.map(toPlayable);
}

/** Artists with at least one published track. */
export async function listArtists(opts: { limit?: number; offset?: number; emergingOnly?: boolean; verifiedFirst?: boolean } = {}): Promise<ArtistCard[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog", "artists");
  if (!isConfigured("database")) return [];
  const { limit = 48, offset = 0, emergingOnly = false, verifiedFirst = false } = opts;
  const rows = await getDb()
    .select({
      id: a.id,
      slug: a.slug,
      name: a.name,
      location: a.location,
      avatarKey: a.avatarKey,
      verificationStatus: a.verificationStatus,
      latest: sql<Date>`max(${t.publishedAt})`.as("latest"),
    })
    .from(a)
    .innerJoin(t, and(eq(t.artistId, a.id), visibleTrack()))
    .where(and(visibleArtist(), emergingOnly ? eq(a.isEmerging, true) : undefined))
    .groupBy(a.id)
    .orderBy(...(verifiedFirst ? [sql`(${a.verificationStatus} = 'verified') desc`] : []), desc(sql`latest`), asc(a.name))
    .limit(limit)
    .offset(offset);
  return rows.map((x) => ({
    id: x.id,
    slug: x.slug,
    name: x.name,
    location: x.location,
    avatarUrl: mediaUrl(x.avatarKey),
    verified: x.verificationStatus === "verified",
  }));
}

export async function getArtistPage(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog", `artist-slug:${slug}`);
  if (!isConfigured("database")) return null;
  const db = getDb();
  const artist = await db.query.artists.findFirst({ where: and(eq(a.slug, slug), visibleArtist()) });
  if (!artist) return null;
  cacheTag(`artist:${artist.id}`);
  const [genre, releases, topTracks, [followers]] = await Promise.all([
    artist.primaryGenreId ? db.query.genres.findFirst({ where: eq(g.id, artist.primaryGenreId) }) : null,
    releaseQuery().where(and(eq(r.artistId, artist.id), visibleRelease())).orderBy(desc(r.releaseDate), desc(r.publishedAt)),
    // Popularity ranking arrives with analytics (Phase 3); until then, newest first.
    trackQuery().where(and(eq(t.artistId, artist.id), visibleTrack())).orderBy(desc(t.publishedAt)).limit(10),
    db.select({ n: count() }).from(schema.follows).where(eq(schema.follows.artistId, artist.id)),
  ]);
  const appearsOn = await trackQuery()
    .innerJoin(schema.trackCredits, eq(schema.trackCredits.trackId, t.id))
    .where(and(eq(schema.trackCredits.artistId, artist.id), eq(schema.trackCredits.role, "featured"), visibleTrack()))
    .limit(10);
  if (releases.length === 0 && topTracks.length === 0) return null; // no public content yet
  return {
    artist: {
      id: artist.id,
      slug: artist.slug,
      name: artist.name,
      bio: artist.bio,
      location: artist.location,
      verified: artist.verificationStatus === "verified",
      avatarUrl: mediaUrl(artist.avatarKey),
      coverUrl: mediaUrl(artist.coverKey),
      socialLinks: artist.socialLinks,
      genre: genre ? { slug: genre.slug, name: genre.name } : null,
    },
    followers: followers?.n ?? 0,
    releases: releases.map(toReleaseCard),
    topTracks: topTracks.map(toPlayable),
    appearsOn: appearsOn.map(toPlayable),
  };
}

export async function getReleasePage(artistSlug: string, releaseSlug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog", `artist-slug:${artistSlug}`);
  if (!isConfigured("database")) return null;
  const [row] = await releaseQuery()
    .where(and(eq(a.slug, artistSlug), eq(r.slug, releaseSlug), visibleRelease(), visibleArtist()))
    .limit(1);
  if (!row) return null;
  const db = getDb();
  const [release, tracks] = await Promise.all([
    db.query.releases.findFirst({ where: eq(r.id, row.id) }),
    trackQuery().where(and(eq(t.releaseId, row.id), visibleTrack())).orderBy(asc(t.trackNumber)),
  ]);
  const more = await releaseQuery()
    .where(and(eq(a.slug, artistSlug), visibleRelease(), sql`${r.id} <> ${row.id}`))
    .orderBy(desc(r.releaseDate))
    .limit(6);
  return {
    release: { ...toReleaseCard(row), description: release?.description ?? null, copyrightLine: release?.copyrightLine ?? null },
    tracks: tracks.map(toPlayable),
    more: more.map(toReleaseCard),
  };
}

export async function getTrackPage(artistSlug: string, trackSlug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog", `artist-slug:${artistSlug}`);
  if (!isConfigured("database")) return null;
  const [row] = await trackQuery()
    .where(and(eq(a.slug, artistSlug), eq(t.slug, trackSlug), visibleTrack(), visibleArtist()))
    .limit(1);
  if (!row) return null;
  const db = getDb();
  const [track, credits] = await Promise.all([
    db.query.tracks.findFirst({ where: eq(t.id, row.id) }),
    db.select().from(schema.trackCredits).where(eq(schema.trackCredits.trackId, row.id)).orderBy(asc(schema.trackCredits.position)),
  ]);
  const genre = track?.genreId ? await db.query.genres.findFirst({ where: eq(g.id, track.genreId) }) : null;
  return {
    track: toPlayable(row),
    lyrics: track?.lyrics ?? null,
    releaseDate: track?.releaseDate ?? null,
    copyrightLine: track?.copyrightLine ?? null,
    isrc: track?.isrc ?? null,
    genre: genre ? { slug: genre.slug, name: genre.name } : null,
    credits: credits.map((c) => ({ name: c.name, role: c.role })),
  };
}

export async function getGenrePage(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog", "genres");
  if (!isConfigured("database")) return null;
  const genre = await getDb().query.genres.findFirst({ where: and(eq(g.slug, slug), eq(g.isActive, true)) });
  if (!genre) return null;
  const tracks = await trackQuery()
    .where(and(eq(t.genreId, genre.id), visibleTrack(), visibleArtist()))
    .orderBy(desc(t.publishedAt))
    .limit(50);
  return { genre: { name: genre.name, slug: genre.slug, description: genre.description }, tracks: tracks.map(toPlayable) };
}

/** Genres that have at least one published track, with counts. */
export async function getGenresWithCounts() {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog", "genres");
  if (!isConfigured("database")) return [];
  return getDb()
    .select({ slug: g.slug, name: g.name, tracks: count(t.id) })
    .from(g)
    .leftJoin(t, and(eq(t.genreId, g.id), visibleTrack()))
    .where(eq(g.isActive, true))
    .groupBy(g.id)
    .orderBy(asc(g.sortOrder));
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export type SearchFilters = { genre?: string; year?: number; sort?: "relevance" | "newest" };

/** Escape user input for LIKE patterns. */
export function likeEscape(q: string) {
  return q.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Full-text + trigram search across artists, releases and tracks (titles and
 * featured artists). Results ranked by FTS rank, then similarity.
 */
export async function searchCatalog(rawQuery: string, filters: SearchFilters = {}) {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog", "search");
  const q = rawQuery.trim().slice(0, 100);
  if (q.length < 2 || !isConfigured("database")) return { artists: [], releases: [], tracks: [] };
  const db = getDb();
  const ts = sql`websearch_to_tsquery('simple', ${q})`;
  const like = `%${likeEscape(q)}%`;

  const genreId = filters.genre ? (await db.query.genres.findFirst({ where: eq(g.slug, filters.genre) }))?.id : undefined;
  const yearCond = (col: typeof t.releaseDate | typeof r.releaseDate) =>
    filters.year ? sql`extract(year from ${col}) = ${filters.year}` : undefined;

  const [artistRows, releaseRows, trackRows] = await Promise.all([
    db
      .select({ id: a.id, slug: a.slug, name: a.name, location: a.location, avatarKey: a.avatarKey, verificationStatus: a.verificationStatus })
      .from(a)
      .where(
        and(
          visibleArtist(),
          or(sql`${a.searchVector} @@ ${ts}`, sql`${a.name} % ${q}`, sql`${a.name} ilike ${like}`),
          // Only artists with public music.
          sql`exists (select 1 from ${t} where ${t.artistId} = ${a.id} and ${visibleTrack()})`,
          genreId ? eq(a.primaryGenreId, genreId) : undefined,
        ),
      )
      .orderBy(desc(sql`ts_rank(${a.searchVector}, ${ts}) + similarity(${a.name}, ${q})`))
      .limit(8),
    releaseQuery()
      .where(
        and(
          visibleRelease(),
          visibleArtist(),
          or(sql`${r.searchVector} @@ ${ts}`, sql`${r.title} % ${q}`, sql`${r.title} ilike ${like}`),
          yearCond(r.releaseDate),
        ),
      )
      .orderBy(...(filters.sort === "newest" ? [desc(r.releaseDate)] : [desc(sql`ts_rank(${r.searchVector}, ${ts}) + similarity(${r.title}, ${q})`)]))
      .limit(12),
    trackQuery()
      .where(
        and(
          visibleTrack(),
          visibleArtist(),
          or(
            sql`${t.searchVector} @@ ${ts}`,
            sql`${t.title} % ${q}`,
            sql`${t.title} ilike ${like}`,
            sql`${a.name} ilike ${like}`,
            sql`${t.featuring} ilike ${like}`,
          ),
          genreId ? eq(t.genreId, genreId) : undefined,
          yearCond(t.releaseDate),
        ),
      )
      .orderBy(
        ...(filters.sort === "newest"
          ? [desc(t.publishedAt)]
          : [desc(sql`ts_rank(${t.searchVector}, ${ts}) + similarity(${t.title}, ${q}) + similarity(${a.name}, ${q})`)]),
      )
      .limit(20),
  ]);

  return {
    artists: artistRows.map((x) => ({ id: x.id, slug: x.slug, name: x.name, location: x.location, avatarUrl: mediaUrl(x.avatarKey), verified: x.verificationStatus === "verified" })),
    releases: releaseRows.map(toReleaseCard),
    tracks: trackRows.map(toPlayable),
  };
}

/** Load playable tracks by id, preserving order (used by the player and playlists). */
export async function getPlayableTracks(ids: string[]): Promise<PlayableTrack[]> {
  if (ids.length === 0 || !isConfigured("database")) return [];
  const rows = await trackQuery().where(and(inArray(t.id, ids), visibleTrack(), visibleArtist()));
  const byId = new Map(rows.map((x) => [x.id, toPlayable(x)]));
  return ids.map((id) => byId.get(id)).filter((x): x is PlayableTrack => !!x);
}

export async function getSitemapEntries() {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  if (!isConfigured("database")) return { artists: [], releases: [] };
  const db = getDb();
  const [artists, releases] = await Promise.all([
    db.selectDistinct({ slug: a.slug, updatedAt: a.updatedAt }).from(a).innerJoin(t, and(eq(t.artistId, a.id), visibleTrack())).where(visibleArtist()).limit(5000),
    releaseQuery().where(and(visibleRelease(), visibleArtist(), isNotNull(r.publishedAt))).limit(10000),
  ]);
  return { artists, releases: releases.map((x) => ({ artistSlug: x.artistSlug, slug: x.slug, publishedAt: x.publishedAt })) };
}
