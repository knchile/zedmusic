import "server-only";
import { and, eq, inArray, ne } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { inspectAudio, inspectImage } from "@/lib/storage/inspect";
import { getStorage } from "@/lib/storage";
import { LIMITS, type UploadKind, bucketFor, objectKey, validateUpload } from "@/lib/storage/policy";

export type CreateUploadInput = {
  kind: UploadKind;
  artistId: string;
  filename: string;
  mimeType?: string | null;
  size: number;
  sha256?: string | null;
};

export type CreateUploadResult =
  | { ok: true; uploadId: string; url: string; headers: Record<string, string> }
  | { ok: false; status: number; error: string; duplicateOf?: { trackId: string | null; sameArtist: boolean } };

/** Validate, check for duplicates, record the upload and return a presigned PUT URL. */
export async function createUpload(userId: string, input: CreateUploadInput): Promise<CreateUploadResult> {
  const storage = getStorage();
  if (!storage) return { ok: false, status: 503, error: "File uploads are not available yet." };
  const v = validateUpload(input.kind, input);
  if (!v.ok) return { ok: false, status: 400, error: v.error };

  const db = getDb();
  if (input.kind === "audio" && input.sha256) {
    // Same bytes already uploaded and attached to a live track?
    const [dup] = await db
      .select({ trackId: schema.tracks.id, artistId: schema.tracks.artistId })
      .from(schema.uploads)
      .innerJoin(schema.tracks, eq(schema.tracks.audioUploadId, schema.uploads.id))
      .where(and(eq(schema.uploads.sha256, input.sha256), ne(schema.tracks.status, "removed")))
      .limit(1);
    if (dup) {
      const sameArtist = dup.artistId === input.artistId;
      return {
        ok: false,
        status: 409,
        error: sameArtist
          ? "You've already uploaded this exact recording."
          : "This exact recording is already on Zed Music Online under another artist. If it's yours, contact support to resolve the attribution.",
        duplicateOf: { trackId: sameArtist ? dup.trackId : null, sameArtist },
      };
    }
  }

  const id = crypto.randomUUID();
  const bucket = bucketFor(input.kind);
  const key = objectKey(input.kind, input.artistId, id, v.ext);
  await db.insert(schema.uploads).values({
    id,
    userId,
    artistId: input.artistId,
    kind: input.kind,
    bucket,
    objectKey: key,
    originalFilename: input.filename.slice(0, 255),
    mimeType: v.mimeType,
    sizeBytes: input.size,
    sha256: input.sha256 ?? null,
  });
  const signed = await storage.presignPut(bucket, key, { contentType: v.mimeType, size: input.size });
  return { ok: true, uploadId: id, ...signed };
}

export type CompleteResult =
  | { ok: true; uploadId: string; kind: UploadKind; metadata: Record<string, unknown> }
  | { ok: false; status: number; error: string };

/** Verify the object landed, inspect it server-side and mark the upload ready (or failed). */
export async function completeUpload(userId: string, uploadId: string): Promise<CompleteResult> {
  const storage = getStorage();
  if (!storage) return { ok: false, status: 503, error: "File uploads are not available yet." };
  const db = getDb();
  const upload = await db.query.uploads.findFirst({ where: eq(schema.uploads.id, uploadId) });
  if (!upload || upload.userId !== userId) return { ok: false, status: 404, error: "Upload not found." };
  if (upload.status === "ready") return { ok: true, uploadId, kind: upload.kind as UploadKind, metadata: upload.metadata };
  if (upload.status !== "pending") return { ok: false, status: 409, error: "This upload can't be completed." };

  const fail = async (error: string, status = 422): Promise<CompleteResult> => {
    await db.update(schema.uploads).set({ status: "failed", error }).where(eq(schema.uploads.id, uploadId));
    await storage.delete(upload.bucket as "audio" | "media", upload.objectKey).catch(() => undefined);
    return { ok: false, status, error };
  };

  const info = await storage.head(upload.bucket as "audio" | "media", upload.objectKey);
  if (!info) return { ok: false, status: 409, error: "The file hasn't finished uploading. Please try again." };
  if (info.size !== upload.sizeBytes) return fail("The uploaded file size doesn't match. Please upload again.");

  await db.update(schema.uploads).set({ status: "processing" }).where(eq(schema.uploads.id, uploadId));
  let metadata: Record<string, unknown>;
  try {
    if (upload.kind === "audio") {
      const audio = await inspectAudio(storage, "audio", upload.objectKey, info.size, upload.mimeType);
      if (!audio.durationMs) return fail("We couldn't read this audio file. Check it plays correctly and upload again.");
      if (audio.durationMs < 10_000) return fail("Tracks must be at least 10 seconds long.");
      if (audio.durationMs > 4 * 60 * 60 * 1000) return fail("Tracks must be shorter than 4 hours.");
      metadata = audio as unknown as Record<string, unknown>;
    } else {
      const img = await inspectImage(storage, upload.objectKey, info.size);
      if (!img) return fail("We couldn't read this image. Upload a JPG, PNG or WebP.");
      if (upload.kind === "artwork") {
        if (img.width !== img.height) return fail("Artwork must be square.");
        if (img.width < LIMITS.artworkMinPx) return fail(`Artwork must be at least ${LIMITS.artworkMinPx}×${LIMITS.artworkMinPx} pixels.`);
      }
      if (upload.kind === "avatar" && Math.min(img.width, img.height) < LIMITS.avatarMinPx)
        return fail(`Profile photos must be at least ${LIMITS.avatarMinPx} pixels on each side.`);
      if (upload.kind === "cover" && img.width < LIMITS.coverMinWidthPx)
        return fail(`Cover images must be at least ${LIMITS.coverMinWidthPx} pixels wide.`);
      metadata = img;
    }
  } catch (err) {
    console.error("[uploads] inspection failed", uploadId, err);
    return fail("We couldn't process this file. Please try another file.");
  }

  await db.update(schema.uploads).set({ status: "ready", metadata, error: null }).where(eq(schema.uploads.id, uploadId));
  return { ok: true, uploadId, kind: upload.kind as UploadKind, metadata };
}

/** Load ready uploads owned by an artist, by id (used when attaching to tracks/profiles). */
export async function readyUploads(artistId: string, ids: string[]) {
  if (ids.length === 0) return [];
  return getDb()
    .select()
    .from(schema.uploads)
    .where(and(inArray(schema.uploads.id, ids), eq(schema.uploads.artistId, artistId), eq(schema.uploads.status, "ready")));
}
