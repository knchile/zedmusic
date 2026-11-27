import "server-only";
import { and, eq, inArray, max, ne, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { audit } from "@/lib/audit";
import { UPLOAD_TERMS_VERSION } from "@/lib/legal";
import { readyUploads } from "@/lib/uploads/service";
import type { ReleaseInput, TrackInput } from "@/lib/validation/catalog";
import { splitCredits } from "@/lib/validation/catalog";
import { uniqueSlug } from "./artists";

/** Releases can be edited only before review, or after changes were requested. */
export const EDITABLE_STATUSES = ["draft", "rejected"] as const;
export const MAX_TRACKS = { single: 3, ep: 10, album: 40 } as const;

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export function isEditable(status: string) {
  return (EDITABLE_STATUSES as readonly string[]).includes(status);
}

async function resolveArtwork(artistId: string, uploadId: string | undefined) {
  if (!uploadId) return { key: undefined as string | undefined };
  const [u] = await readyUploads(artistId, [uploadId]);
  if (!u || u.kind !== "artwork") return { error: "The artwork upload wasn't found. Please upload it again." };
  return { key: u.objectKey };
}

export async function createRelease(actorId: string, artistId: string, input: ReleaseInput): Promise<Result<{ releaseId: string }>> {
  const art = await resolveArtwork(artistId, input.artworkUploadId);
  if ("error" in art) return { ok: false, error: art.error! };
  const db = getDb();
  return db.transaction(async (tx) => {
    const slug = await uniqueSlug(input.title, async (s) =>
      !!(await tx.query.releases.findFirst({ columns: { id: true }, where: and(eq(schema.releases.artistId, artistId), eq(schema.releases.slug, s)) })),
    );
    const [r] = await tx
      .insert(schema.releases)
      .values({
        artistId,
        slug,
        title: input.title,
        type: input.type,
        releaseDate: input.releaseDate,
        description: input.description,
        copyrightLine: input.copyrightLine,
        upc: input.upc,
        artworkKey: art.key,
      })
      .returning({ id: schema.releases.id });
    await audit({ actorId, action: "release.created", entityType: "release", entityId: r!.id }, tx);
    return { ok: true as const, releaseId: r!.id };
  });
}

async function loadEditableRelease(artistId: string, releaseId: string) {
  const release = await getDb().query.releases.findFirst({ where: eq(schema.releases.id, releaseId) });
  if (!release || release.artistId !== artistId) return { error: "Release not found." } as const;
  if (!isEditable(release.status)) return { error: "This release is in review or published and can't be changed." } as const;
  return { release } as const;
}

export async function updateRelease(actorId: string, artistId: string, releaseId: string, input: ReleaseInput): Promise<Result> {
  const loaded = await loadEditableRelease(artistId, releaseId);
  if ("error" in loaded) return { ok: false, error: loaded.error! };
  const art = await resolveArtwork(artistId, input.artworkUploadId);
  if ("error" in art) return { ok: false, error: art.error! };
  const count = await getDb().$count(schema.tracks, eq(schema.tracks.releaseId, releaseId));
  if (count > MAX_TRACKS[input.type]) return { ok: false, error: `A ${input.type === "ep" ? "EP" : input.type} can have at most ${MAX_TRACKS[input.type]} tracks.` };
  await getDb().transaction(async (tx) => {
    await tx
      .update(schema.releases)
      .set({
        title: input.title,
        type: input.type,
        releaseDate: input.releaseDate ?? null,
        description: input.description ?? null,
        copyrightLine: input.copyrightLine ?? null,
        upc: input.upc ?? null,
        ...(art.key ? { artworkKey: art.key } : {}),
      })
      .where(eq(schema.releases.id, releaseId));
    await audit({ actorId, action: "release.updated", entityType: "release", entityId: releaseId }, tx);
  });
  return { ok: true };
}

export async function addTrack(actorId: string, artistId: string, releaseId: string, input: TrackInput): Promise<Result<{ trackId: string }>> {
  const loaded = await loadEditableRelease(artistId, releaseId);
  if ("error" in loaded) return { ok: false, error: loaded.error! };
  const { release } = loaded;
  const db = getDb();

  const [upload] = await readyUploads(artistId, [input.audioUploadId]);
  if (!upload || upload.kind !== "audio") return { ok: false, error: "The audio upload wasn't found or isn't ready. Please upload it again." };
  const inUse = await db.query.tracks.findFirst({ columns: { id: true }, where: eq(schema.tracks.audioUploadId, upload.id) });
  if (inUse) return { ok: false, error: "This audio file is already attached to a track." };
  const durationMs = Number((upload.metadata as { durationMs?: number }).durationMs) || null;
  if (!durationMs) return { ok: false, error: "We couldn't read the length of this audio file." };

  const existing = await db.$count(schema.tracks, eq(schema.tracks.releaseId, releaseId));
  if (existing >= MAX_TRACKS[release.type]) return { ok: false, error: `This ${release.type === "ep" ? "EP" : release.type} already has the maximum number of tracks.` };

  return db.transaction(async (tx) => {
    const slug = await uniqueSlug(input.title, async (s) =>
      !!(await tx.query.tracks.findFirst({ columns: { id: true }, where: and(eq(schema.tracks.artistId, artistId), eq(schema.tracks.slug, s)) })),
    );
    const [{ n }] = await tx.select({ n: max(schema.tracks.trackNumber) }).from(schema.tracks).where(eq(schema.tracks.releaseId, releaseId));
    const [track] = await tx
      .insert(schema.tracks)
      .values({
        artistId,
        releaseId,
        trackNumber: (n ?? 0) + 1,
        slug,
        title: input.title,
        featuring: input.featuring,
        genreId: input.genreId,
        lyrics: input.lyrics,
        isrc: input.isrc,
        copyrightLine: input.copyrightLine ?? release.copyrightLine,
        isExplicit: input.isExplicit,
        releaseDate: release.releaseDate,
        audioUploadId: upload.id,
        streamKey: upload.objectKey,
        streamMimeType: upload.mimeType,
        durationMs,
        status: "draft",
      })
      .returning({ id: schema.tracks.id });
    await writeCredits(tx, track!.id, input);
    await audit({ actorId, action: "track.created", entityType: "track", entityId: track!.id, metadata: { releaseId } }, tx);
    return { ok: true as const, trackId: track!.id };
  });
}

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

async function writeCredits(tx: Tx, trackId: string, input: Pick<TrackInput, "featuring" | "producer" | "composer">) {
  await tx.delete(schema.trackCredits).where(eq(schema.trackCredits.trackId, trackId));
  const rows = [
    ...splitCredits(input.featuring).map((name, i) => ({ trackId, name, role: "featured" as const, position: i })),
    ...splitCredits(input.producer).map((name, i) => ({ trackId, name, role: "producer" as const, position: i })),
    ...splitCredits(input.composer).map((name, i) => ({ trackId, name, role: "composer" as const, position: i })),
  ];
  if (rows.length) await tx.insert(schema.trackCredits).values(rows);
}

export async function updateTrack(actorId: string, artistId: string, trackId: string, input: Omit<TrackInput, "audioUploadId">): Promise<Result> {
  const db = getDb();
  const track = await db.query.tracks.findFirst({ where: eq(schema.tracks.id, trackId) });
  if (!track || track.artistId !== artistId || !track.releaseId) return { ok: false, error: "Track not found." };
  const loaded = await loadEditableRelease(artistId, track.releaseId);
  if ("error" in loaded) return { ok: false, error: loaded.error! };
  await db.transaction(async (tx) => {
    await tx
      .update(schema.tracks)
      .set({
        title: input.title,
        featuring: input.featuring ?? null,
        genreId: input.genreId ?? null,
        lyrics: input.lyrics ?? null,
        isrc: input.isrc ?? null,
        copyrightLine: input.copyrightLine ?? null,
        isExplicit: input.isExplicit,
      })
      .where(eq(schema.tracks.id, trackId));
    await writeCredits(tx, trackId, input);
    await audit({ actorId, action: "track.updated", entityType: "track", entityId: trackId }, tx);
  });
  return { ok: true };
}

export async function deleteDraftTrack(actorId: string, artistId: string, trackId: string): Promise<Result> {
  const db = getDb();
  const track = await db.query.tracks.findFirst({ where: eq(schema.tracks.id, trackId) });
  if (!track || track.artistId !== artistId || !track.releaseId) return { ok: false, error: "Track not found." };
  if (track.publishedAt) return { ok: false, error: "Published tracks can't be deleted. Ask support to remove it." };
  const loaded = await loadEditableRelease(artistId, track.releaseId);
  if ("error" in loaded) return { ok: false, error: loaded.error! };
  await db.transaction(async (tx) => {
    await tx.delete(schema.tracks).where(eq(schema.tracks.id, trackId));
    // Close the gap in track numbers.
    await tx
      .update(schema.tracks)
      .set({ trackNumber: sql`${schema.tracks.trackNumber} - 1` })
      .where(and(eq(schema.tracks.releaseId, track.releaseId!), sql`${schema.tracks.trackNumber} > ${track.trackNumber ?? 0}`));
    await audit({ actorId, action: "track.deleted", entityType: "track", entityId: trackId }, tx);
  });
  return { ok: true };
}

export async function moveTrack(actorId: string, artistId: string, trackId: string, direction: "up" | "down"): Promise<Result> {
  const db = getDb();
  const track = await db.query.tracks.findFirst({ where: eq(schema.tracks.id, trackId) });
  if (!track || track.artistId !== artistId || !track.releaseId || track.trackNumber == null) return { ok: false, error: "Track not found." };
  const loaded = await loadEditableRelease(artistId, track.releaseId);
  if ("error" in loaded) return { ok: false, error: loaded.error! };
  const target = track.trackNumber + (direction === "up" ? -1 : 1);
  const other = await db.query.tracks.findFirst({ where: and(eq(schema.tracks.releaseId, track.releaseId), eq(schema.tracks.trackNumber, target)) });
  if (!other) return { ok: true };
  await db.transaction(async (tx) => {
    await tx.update(schema.tracks).set({ trackNumber: target }).where(eq(schema.tracks.id, track.id));
    await tx.update(schema.tracks).set({ trackNumber: track.trackNumber }).where(eq(schema.tracks.id, other.id));
  });
  void actorId;
  return { ok: true };
}

/** Problems that block submission. Pure-ish: takes loaded data so it can be unit-tested. */
export function submissionProblems(release: { type: "single" | "ep" | "album"; artworkKey: string | null; releaseDate: string | null }, trackCount: number) {
  const problems: string[] = [];
  if (!release.artworkKey) problems.push("Add release artwork.");
  if (!release.releaseDate) problems.push("Set a release date.");
  if (trackCount === 0) problems.push("Add at least one track.");
  if (release.type === "ep" && trackCount < 2) problems.push("An EP needs at least 2 tracks.");
  if (release.type === "album" && trackCount < 5) problems.push("An album needs at least 5 tracks.");
  if (trackCount > MAX_TRACKS[release.type]) problems.push(`Too many tracks for a ${release.type}.`);
  return problems;
}

export async function submitRelease(actorId: string, artistId: string, releaseId: string, rightsConfirmed: boolean): Promise<Result> {
  if (!rightsConfirmed) return { ok: false, error: "You must confirm you own or are authorised to distribute this music." };
  const loaded = await loadEditableRelease(artistId, releaseId);
  if ("error" in loaded) return { ok: false, error: loaded.error! };
  const db = getDb();
  const trackCount = await db.$count(schema.tracks, eq(schema.tracks.releaseId, releaseId));
  const problems = submissionProblems(loaded.release, trackCount);
  if (problems.length) return { ok: false, error: problems.join(" ") };

  await db.transaction(async (tx) => {
    await tx.update(schema.releases).set({ status: "pending_review" }).where(eq(schema.releases.id, releaseId));
    await tx
      .update(schema.tracks)
      .set({ status: "pending_review", rejectionReason: null })
      .where(and(eq(schema.tracks.releaseId, releaseId), inArray(schema.tracks.status, ["draft", "rejected"])));
    const [sub] = await tx
      .insert(schema.musicSubmissions)
      .values({
        artistId,
        releaseId,
        submittedById: actorId,
        rightsConfirmed: true,
        rightsConfirmedAt: new Date(),
        rightsStatementVersion: UPLOAD_TERMS_VERSION,
      })
      .returning({ id: schema.musicSubmissions.id });
    await audit({ actorId, action: "release.submitted", entityType: "release", entityId: releaseId, metadata: { submissionId: sub!.id } }, tx);
  });
  return { ok: true };
}

/** Owner withdraws a pending submission to make changes. */
export async function withdrawSubmission(actorId: string, artistId: string, releaseId: string): Promise<Result> {
  const db = getDb();
  const release = await db.query.releases.findFirst({ where: eq(schema.releases.id, releaseId) });
  if (!release || release.artistId !== artistId || release.status !== "pending_review") return { ok: false, error: "Nothing to withdraw." };
  await db.transaction(async (tx) => {
    await tx.update(schema.releases).set({ status: "draft" }).where(eq(schema.releases.id, releaseId));
    await tx.update(schema.tracks).set({ status: "draft" }).where(and(eq(schema.tracks.releaseId, releaseId), ne(schema.tracks.status, "published")));
    await tx
      .update(schema.musicSubmissions)
      .set({ status: "withdrawn" })
      .where(and(eq(schema.musicSubmissions.releaseId, releaseId), eq(schema.musicSubmissions.status, "pending")));
    await audit({ actorId, action: "release.withdrawn", entityType: "release", entityId: releaseId }, tx);
  });
  return { ok: true };
}
