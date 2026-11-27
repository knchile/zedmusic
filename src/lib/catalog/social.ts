import "server-only";
import { and, asc, count, desc, eq, max, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { slugify } from "@/lib/utils";

/** Likes, follows and playlists. Callers must pass an authenticated, active user id. */

const MAX_PLAYLISTS = 200;
const MAX_PLAYLIST_TRACKS = 1000;

async function trackIsPublic(trackId: string) {
  const [row] = await getDb()
    .select({ id: schema.tracks.id })
    .from(schema.tracks)
    .innerJoin(schema.artists, eq(schema.artists.id, schema.tracks.artistId))
    .where(and(eq(schema.tracks.id, trackId), eq(schema.tracks.status, "published"), eq(schema.artists.state, "active")))
    .limit(1);
  return !!row;
}

export async function setLike(userId: string, trackId: string, liked: boolean) {
  const db = getDb();
  if (liked) {
    if (!(await trackIsPublic(trackId))) return { ok: false as const, error: "Track not found." };
    await db.insert(schema.trackLikes).values({ userId, trackId }).onConflictDoNothing();
  } else {
    await db.delete(schema.trackLikes).where(and(eq(schema.trackLikes.userId, userId), eq(schema.trackLikes.trackId, trackId)));
  }
  return { ok: true as const, liked };
}

export async function setFollow(userId: string, artistId: string, following: boolean) {
  const db = getDb();
  if (following) {
    const artist = await db.query.artists.findFirst({ columns: { id: true }, where: and(eq(schema.artists.id, artistId), eq(schema.artists.state, "active")) });
    if (!artist) return { ok: false as const, error: "Artist not found." };
    await db.insert(schema.follows).values({ userId, artistId }).onConflictDoNothing();
  } else {
    await db.delete(schema.follows).where(and(eq(schema.follows.userId, userId), eq(schema.follows.artistId, artistId)));
  }
  return { ok: true as const, following };
}

export async function getLibraryState(userId: string) {
  const db = getDb();
  const [likes, follows, playlists] = await Promise.all([
    db.select({ id: schema.trackLikes.trackId }).from(schema.trackLikes).where(eq(schema.trackLikes.userId, userId)).orderBy(desc(schema.trackLikes.createdAt)).limit(5000),
    db.select({ id: schema.follows.artistId }).from(schema.follows).where(eq(schema.follows.userId, userId)).limit(5000),
    db.select({ id: schema.playlists.id, title: schema.playlists.title }).from(schema.playlists).where(eq(schema.playlists.ownerId, userId)).orderBy(desc(schema.playlists.updatedAt)),
  ]);
  return { likedTrackIds: likes.map((l) => l.id), followedArtistIds: follows.map((f) => f.id), playlists };
}

export async function createPlaylist(userId: string, title: string, isPublic: boolean, description?: string) {
  const db = getDb();
  const t = title.trim().slice(0, 100);
  if (t.length < 1) return { ok: false as const, error: "Give your playlist a name." };
  const owned = await db.$count(schema.playlists, eq(schema.playlists.ownerId, userId));
  if (owned >= MAX_PLAYLISTS) return { ok: false as const, error: "You've reached the playlist limit." };
  const base = slugify(t) || "playlist";
  const slug = `${base}-${crypto.randomUUID().slice(0, 6)}`;
  const [p] = await db
    .insert(schema.playlists)
    .values({ ownerId: userId, title: t, slug, isPublic, description: description?.trim().slice(0, 500) || null })
    .returning({ id: schema.playlists.id, title: schema.playlists.title });
  return { ok: true as const, playlist: p! };
}

async function ownedPlaylist(userId: string, playlistId: string) {
  const p = await getDb().query.playlists.findFirst({ where: eq(schema.playlists.id, playlistId) });
  return p && p.ownerId === userId ? p : null;
}

export async function addToPlaylist(userId: string, playlistId: string, trackId: string) {
  const db = getDb();
  if (!(await ownedPlaylist(userId, playlistId))) return { ok: false as const, error: "Playlist not found." };
  if (!(await trackIsPublic(trackId))) return { ok: false as const, error: "Track not found." };
  return db.transaction(async (tx) => {
    const [{ n }] = await tx.select({ n: count() }).from(schema.playlistTracks).where(eq(schema.playlistTracks.playlistId, playlistId));
    if (n >= MAX_PLAYLIST_TRACKS) return { ok: false as const, error: "This playlist is full." };
    const [{ pos }] = await tx.select({ pos: max(schema.playlistTracks.position) }).from(schema.playlistTracks).where(eq(schema.playlistTracks.playlistId, playlistId));
    const inserted = await tx
      .insert(schema.playlistTracks)
      .values({ playlistId, trackId, position: (pos ?? 0) + 1, addedById: userId })
      .onConflictDoNothing()
      .returning({ trackId: schema.playlistTracks.trackId });
    await tx.update(schema.playlists).set({ updatedAt: new Date() }).where(eq(schema.playlists.id, playlistId));
    return { ok: true as const, added: inserted.length > 0 };
  });
}

export async function removeFromPlaylist(userId: string, playlistId: string, trackId: string) {
  if (!(await ownedPlaylist(userId, playlistId))) return { ok: false as const, error: "Playlist not found." };
  await getDb()
    .delete(schema.playlistTracks)
    .where(and(eq(schema.playlistTracks.playlistId, playlistId), eq(schema.playlistTracks.trackId, trackId)));
  return { ok: true as const };
}

export async function updatePlaylist(userId: string, playlistId: string, patch: { title?: string; description?: string; isPublic?: boolean }) {
  if (!(await ownedPlaylist(userId, playlistId))) return { ok: false as const, error: "Playlist not found." };
  const title = patch.title?.trim().slice(0, 100);
  if (patch.title !== undefined && !title) return { ok: false as const, error: "Give your playlist a name." };
  await getDb()
    .update(schema.playlists)
    .set({
      ...(title ? { title } : {}),
      ...(patch.description !== undefined ? { description: patch.description.trim().slice(0, 500) || null } : {}),
      ...(patch.isPublic !== undefined ? { isPublic: patch.isPublic } : {}),
    })
    .where(eq(schema.playlists.id, playlistId));
  return { ok: true as const };
}

export async function deletePlaylist(userId: string, playlistId: string) {
  if (!(await ownedPlaylist(userId, playlistId))) return { ok: false as const, error: "Playlist not found." };
  await getDb().delete(schema.playlists).where(eq(schema.playlists.id, playlistId));
  return { ok: true as const };
}

/** A playlist is visible to its owner, or to anyone if public. Returns track ids in order. */
export async function getPlaylist(playlistId: string, viewerId: string | null) {
  const db = getDb();
  const p = await db.query.playlists.findFirst({ where: eq(schema.playlists.id, playlistId) });
  if (!p || (!p.isPublic && p.ownerId !== viewerId)) return null;
  const [owner, rows] = await Promise.all([
    db.query.users.findFirst({ columns: { name: true }, where: eq(schema.users.id, p.ownerId) }),
    db
      .select({ trackId: schema.playlistTracks.trackId })
      .from(schema.playlistTracks)
      .where(eq(schema.playlistTracks.playlistId, playlistId))
      .orderBy(asc(schema.playlistTracks.position)),
  ]);
  return { playlist: p, ownerName: owner?.name ?? "Listener", isOwner: p.ownerId === viewerId, trackIds: rows.map((r) => r.trackId) };
}

export async function listMyPlaylists(userId: string) {
  return getDb()
    .select({
      id: schema.playlists.id,
      title: schema.playlists.title,
      isPublic: schema.playlists.isPublic,
      updatedAt: schema.playlists.updatedAt,
      tracks: sql<number>`(select count(*)::int from ${schema.playlistTracks} where ${schema.playlistTracks.playlistId} = ${schema.playlists.id})`,
    })
    .from(schema.playlists)
    .where(eq(schema.playlists.ownerId, userId))
    .orderBy(desc(schema.playlists.updatedAt));
}

export async function listLikedTrackIds(userId: string, limit = 500) {
  const rows = await getDb()
    .select({ id: schema.trackLikes.trackId })
    .from(schema.trackLikes)
    .where(eq(schema.trackLikes.userId, userId))
    .orderBy(desc(schema.trackLikes.createdAt))
    .limit(limit);
  return rows.map((r) => r.id);
}

export async function listFollowedArtists(userId: string) {
  return getDb()
    .select({ id: schema.artists.id, slug: schema.artists.slug, name: schema.artists.name, avatarKey: schema.artists.avatarKey, verificationStatus: schema.artists.verificationStatus })
    .from(schema.follows)
    .innerJoin(schema.artists, eq(schema.artists.id, schema.follows.artistId))
    .where(and(eq(schema.follows.userId, userId), eq(schema.artists.state, "active")))
    .orderBy(desc(schema.follows.createdAt));
}
