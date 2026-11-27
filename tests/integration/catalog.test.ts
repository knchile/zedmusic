import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import { artistProfileSchema, trackSchema } from "@/lib/validation/catalog";
import { testDb } from "./helpers";

const profile = (name: string, extra: Record<string, unknown> = {}) => artistProfileSchema.parse({ name, social: {}, ...extra });
const trackInput = (v: Record<string, unknown>) => trackSchema.parse(v);

vi.mock("@/lib/email", () => ({ sendEmail: async () => ({ delivered: true }) }));

const { db, pool } = testDb();
type Mods = {
  artists: typeof import("@/lib/catalog/artists");
  releases: typeof import("@/lib/catalog/releases");
  moderation: typeof import("@/lib/catalog/moderation");
  social: typeof import("@/lib/catalog/social");
  uploads: typeof import("@/lib/uploads/service");
  session: typeof import("@/lib/auth/session");
  catalog: typeof import("@/lib/data/catalog");
  local: typeof import("@/lib/storage/local");
};
let m: Mods;

const now = Date.now();
const owner = { id: `owner-${now}`, name: "Owner", email: `owner-${now}@example.com`, role: "listener" as const, status: "active" as const, emailVerified: true, image: null };
const stranger = { id: `stranger-${now}`, name: "Stranger", email: `stranger-${now}@example.com`, role: "artist" as const, status: "active" as const, emailVerified: true, image: null };
const admin = { id: `admin-${now}`, name: "Admin", email: `admin-${now}@example.com`, role: "admin" as const, status: "active" as const, emailVerified: true, image: null };

/** Minimal valid 16-bit mono WAV of `secs` seconds (silence plus a unique marker byte). */
function wav(secs: number, marker: number) {
  const rate = 8000, n = rate * secs;
  const b = Buffer.alloc(44 + n * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVE", 8); b.write("fmt ", 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 2, 40);
  b.writeUInt16LE(marker, b.length - 2);
  return b;
}

/** Simulate the browser's direct PUT by writing the file where the local driver expects it. */
async function uploadAudio(userId: string, artistId: string, secs: number, marker: number, sha: string) {
  const file = wav(secs, marker);
  const created = await m.uploads.createUpload(userId, { kind: "audio", artistId, filename: "song.wav", mimeType: "audio/wav", size: file.length, sha256: sha });
  if (!created.ok) return created;
  const up = await db.query.uploads.findFirst({ where: eq(schema.uploads.id, created.uploadId) });
  const p = m.local.localPath("audio", up!.objectKey);
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, file);
  return m.uploads.completeUpload(userId, created.uploadId);
}

beforeAll(async () => {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.BETTER_AUTH_SECRET = "test-secret-test-secret-test-secret-123";
  m = {
    artists: await import("@/lib/catalog/artists"),
    releases: await import("@/lib/catalog/releases"),
    moderation: await import("@/lib/catalog/moderation"),
    social: await import("@/lib/catalog/social"),
    uploads: await import("@/lib/uploads/service"),
    session: await import("@/lib/auth/session"),
    catalog: await import("@/lib/data/catalog"),
    local: await import("@/lib/storage/local"),
  };
  await db.insert(schema.users).values([owner, stranger, admin].map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status, emailVerified: u.emailVerified })));
});

afterAll(async () => {
  await pool.end();
  const { getDb } = await import("@/db");
  await getDb().$client.end();
});

describe("artist → upload → review → publish → listen", () => {
  let artistId: string;
  let releaseId: string;
  let trackId: string;
  const sha = "a".repeat(63) + String(now % 10);

  it("creates an artist profile owned by the user and upgrades them to artist", async () => {
    const res = await m.artists.createArtistProfile(owner, profile("Kalindula Kings", { location: "Kitwe" }));
    expect(res.ok).toBe(true);
    artistId = (res as { artistId: string }).artistId;
    const access = await m.session.getArtistAccess(owner.id, artistId);
    expect(access.memberRole).toBe("owner");
    expect((await db.query.users.findFirst({ where: eq(schema.users.id, owner.id) }))?.role).toBe("artist");
  });

  it("gives a different artist no access to this artist's private data", async () => {
    const access = await m.session.getArtistAccess(stranger.id, artistId);
    expect(access).toEqual({ memberRole: null, labelRole: null });
  });

  it("generates unique slugs for duplicate names", async () => {
    const res = await m.artists.createArtistProfile(stranger, profile("Kalindula Kings"));
    expect((res as { slug: string }).slug).toBe("kalindula-kings-2");
  });

  it("uploads audio, extracts duration server-side, and rejects duplicates", async () => {
    const done = await uploadAudio(owner.id, artistId, 70, 1, sha);
    expect(done.ok).toBe(true);
    expect((done as unknown as { metadata: { durationMs: number } }).metadata.durationMs).toBe(70_000);

    const [rel] = await db.insert(schema.releases).values({ artistId, slug: "first", title: "First", artworkKey: "artwork/x.jpg", releaseDate: "2026-11-20" }).returning();
    releaseId = rel!.id;
    const added = await m.releases.addTrack(owner.id, artistId, releaseId, trackInput({ title: "Mwana", audioUploadId: (done as unknown as { uploadId: string }).uploadId, featuring: "Guest A, Guest B", producer: "Prod" }));
    expect(added.ok).toBe(true);
    trackId = (added as { trackId: string }).trackId;

    const credits = await db.select().from(schema.trackCredits).where(eq(schema.trackCredits.trackId, trackId));
    expect(credits.map((c) => `${c.role}:${c.name}`).sort()).toEqual(["featured:Guest A", "featured:Guest B", "producer:Prod"]);

    // Same file (same hash) again → refused, both for the owner and for anyone else.
    const again = await m.uploads.createUpload(owner.id, { kind: "audio", artistId, filename: "song.wav", mimeType: "audio/wav", size: 200_000, sha256: sha });
    expect(again).toMatchObject({ ok: false, status: 409, duplicateOf: { sameArtist: true } });
  });

  it("rejects files that aren't really audio", async () => {
    const created = await m.uploads.createUpload(owner.id, { kind: "audio", artistId, filename: "fake.mp3", mimeType: "audio/mpeg", size: 50_000 });
    const up = await db.query.uploads.findFirst({ where: eq(schema.uploads.id, (created as { uploadId: string }).uploadId) });
    const p = m.local.localPath("audio", up!.objectKey);
    await mkdir(path.dirname(p), { recursive: true });
    await writeFile(p, Buffer.alloc(50_000, 7));
    const done = await m.uploads.completeUpload(owner.id, up!.id);
    expect(done.ok).toBe(false);
    expect((await db.query.uploads.findFirst({ where: eq(schema.uploads.id, up!.id) }))?.status).toBe("failed");
  });

  it("refuses to complete someone else's upload", async () => {
    const created = await m.uploads.createUpload(owner.id, { kind: "audio", artistId, filename: "x.mp3", mimeType: "audio/mpeg", size: 50_000 });
    const res = await m.uploads.completeUpload(stranger.id, (created as { uploadId: string }).uploadId);
    expect(res).toMatchObject({ ok: false, status: 404 });
  });

  it("is not public before review, and requires the rights confirmation to submit", async () => {
    expect(await m.catalog.getPlayableTracks([trackId])).toHaveLength(0);
    expect((await m.releases.submitRelease(owner.id, artistId, releaseId, false)).ok).toBe(false);
    const submitted = await m.releases.submitRelease(owner.id, artistId, releaseId, true);
    expect(submitted.ok).toBe(true);
    const sub = await db.query.musicSubmissions.findFirst({ where: eq(schema.musicSubmissions.releaseId, releaseId) });
    expect(sub).toMatchObject({ status: "pending", rightsConfirmed: true });
    expect(sub?.rightsStatementVersion).toBeTruthy();
    // Locked while in review.
    expect((await m.releases.updateTrack(owner.id, artistId, trackId, trackSchema.omit({ audioUploadId: true }).parse({ title: "Changed" }))).ok).toBe(false);
    expect(await m.catalog.getPlayableTracks([trackId])).toHaveLength(0);
  });

  it("rejection returns it to the artist with a reason; resubmission and approval publish it", async () => {
    const sub = await db.query.musicSubmissions.findFirst({ where: eq(schema.musicSubmissions.releaseId, releaseId) });
    expect((await m.moderation.rejectSubmission(admin.id, sub!.id, "short")).ok).toBe(false);
    expect((await m.moderation.rejectSubmission(admin.id, sub!.id, "Please fix the artwork — it contains a logo.")).ok).toBe(true);
    expect((await db.query.releases.findFirst({ where: eq(schema.releases.id, releaseId) }))?.status).toBe("rejected");
    const notes = await db.select().from(schema.notifications).where(eq(schema.notifications.userId, owner.id));
    expect(notes.some((n) => n.type === "release.rejected")).toBe(true);

    expect((await m.releases.submitRelease(owner.id, artistId, releaseId, true)).ok).toBe(true);
    const sub2 = await db.query.musicSubmissions.findFirst({ where: eq(schema.musicSubmissions.status, "pending") });
    expect((await m.moderation.approveSubmission(admin.id, sub2!.id)).ok).toBe(true);
    // A decision can only be made once.
    expect((await m.moderation.approveSubmission(admin.id, sub2!.id)).ok).toBe(false);

    const playable = await m.catalog.getPlayableTracks([trackId]);
    expect(playable).toHaveLength(1);
    expect(playable[0]).toMatchObject({ title: "Mwana", artistName: "Kalindula Kings", durationMs: 70_000 });
    const audits = await db.select().from(schema.auditLogs).where(eq(schema.auditLogs.entityId, releaseId));
    expect(audits.map((a) => a.action)).toEqual(expect.arrayContaining(["release.submitted", "release.rejected", "release.approved"]));
  });

  it("removed tracks disappear from the public catalogue", async () => {
    const extra = await uploadAudio(owner.id, artistId, 65, 2, "b".repeat(64));
    const [rel] = await db.insert(schema.releases).values({ artistId, slug: "second", title: "Second", status: "published", artworkKey: "a.jpg", releaseDate: "2026-01-01" }).returning();
    const [t] = await db
      .insert(schema.tracks)
      .values({ artistId, releaseId: rel!.id, slug: "gone", title: "Gone", status: "published", durationMs: 65_000, audioUploadId: (extra as unknown as { uploadId: string }).uploadId, streamKey: "k" })
      .returning();
    expect(await m.catalog.getPlayableTracks([t!.id])).toHaveLength(1);
    expect((await m.moderation.removeTrack(admin.id, t!.id, "Upheld copyright complaint")).ok).toBe(true);
    expect(await m.catalog.getPlayableTracks([t!.id])).toHaveLength(0);
  });

  it("listeners can like, follow and build playlists; only owners can edit them", async () => {
    expect((await m.social.setLike(stranger.id, trackId, true)).ok).toBe(true);
    expect((await m.social.setLike(stranger.id, trackId, true)).ok).toBe(true); // idempotent
    expect((await m.social.setFollow(stranger.id, artistId, true)).ok).toBe(true);
    const state = await m.social.getLibraryState(stranger.id);
    expect(state.likedTrackIds).toEqual([trackId]);
    expect(state.followedArtistIds).toEqual([artistId]);

    const pl = await m.social.createPlaylist(stranger.id, "Road trip", false);
    expect(pl.ok).toBe(true);
    const id = (pl as { playlist: { id: string } }).playlist.id;
    expect(await m.social.addToPlaylist(stranger.id, id, trackId)).toMatchObject({ ok: true, added: true });
    expect(await m.social.addToPlaylist(stranger.id, id, trackId)).toMatchObject({ ok: true, added: false });
    expect((await m.social.addToPlaylist(owner.id, id, trackId)).ok).toBe(false); // not the owner
    expect(await m.social.getPlaylist(id, owner.id)).toBeNull(); // private
    await m.social.updatePlaylist(stranger.id, id, { isPublic: true });
    expect((await m.social.getPlaylist(id, owner.id))?.trackIds).toEqual([trackId]);
  });

  it("claims of platform-created profiles grant ownership only after admin approval", async () => {
    const [platform] = await db.insert(schema.artists).values({ slug: `legend-${now}`, name: "Zambian Legend", origin: "platform_created" }).returning();
    expect((await m.artists.submitClaim(stranger, platform!.id, "I am the artist, contact my manager.", [])).ok).toBe(true);
    expect((await m.artists.submitClaim(stranger, platform!.id, "again", [])).ok).toBe(false);
    expect((await m.session.getArtistAccess(stranger.id, platform!.id)).memberRole).toBeNull();
    const req = await db.query.artistVerificationRequests.findFirst({ where: eq(schema.artistVerificationRequests.artistId, platform!.id) });
    expect((await m.moderation.decideArtistRequest(admin.id, req!.id, true, "Confirmed by phone")).ok).toBe(true);
    expect((await m.session.getArtistAccess(stranger.id, platform!.id)).memberRole).toBe("owner");
    // Self-registered profiles can't be claimed.
    expect((await m.artists.submitClaim(stranger, artistId, "mine", [])).ok).toBe(false);
  });
});
