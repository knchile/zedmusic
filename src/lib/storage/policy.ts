/**
 * Upload policy: allowed types and limits. Pure and shared by client and server;
 * the server always re-validates.
 */

export const AUDIO_TYPES = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/flac": "flac",
  "audio/x-flac": "flac",
} as const;

export const IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export const LIMITS = {
  audioMaxBytes: 200 * 1024 * 1024,
  audioMinBytes: 32 * 1024,
  imageMaxBytes: 10 * 1024 * 1024,
  /** Release artwork: square, at least this many pixels per side. */
  artworkMinPx: 1000,
  avatarMinPx: 300,
  coverMinWidthPx: 1200,
  /** Uploads per user per hour. */
  uploadsPerHour: 60,
} as const;

export type UploadKind = "audio" | "artwork" | "avatar" | "cover";

/** Extension inference for browsers that report an empty/odd MIME type (common on Android). */
const EXT_TO_MIME: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  wav: "audio/wav",
  flac: "audio/flac",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function normaliseMime(filename: string, reported: string | null | undefined): string | null {
  const r = (reported ?? "").toLowerCase().trim();
  if (r && (r in AUDIO_TYPES || r in IMAGE_TYPES)) return r;
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  return EXT_TO_MIME[ext] ?? null;
}

export type ValidationResult = { ok: true; mimeType: string; ext: string } | { ok: false; error: string };

export function validateUpload(kind: UploadKind, input: { filename: string; mimeType?: string | null; size: number }): ValidationResult {
  const mime = normaliseMime(input.filename, input.mimeType);
  if (!Number.isSafeInteger(input.size) || input.size <= 0) return { ok: false, error: "The file is empty." };

  if (kind === "audio") {
    if (!mime || !(mime in AUDIO_TYPES)) return { ok: false, error: "Upload an MP3, M4A/AAC, WAV or FLAC file." };
    if (input.size > LIMITS.audioMaxBytes) return { ok: false, error: "Audio files must be 200 MB or smaller." };
    if (input.size < LIMITS.audioMinBytes) return { ok: false, error: "This file is too small to be a song." };
    return { ok: true, mimeType: mime, ext: AUDIO_TYPES[mime as keyof typeof AUDIO_TYPES] };
  }
  if (!mime || !(mime in IMAGE_TYPES)) return { ok: false, error: "Upload a JPG, PNG or WebP image." };
  if (input.size > LIMITS.imageMaxBytes) return { ok: false, error: "Images must be 10 MB or smaller." };
  return { ok: true, mimeType: mime, ext: IMAGE_TYPES[mime as keyof typeof IMAGE_TYPES] };
}

export function bucketFor(kind: UploadKind) {
  return kind === "audio" ? ("audio" as const) : ("media" as const);
}

/** Object key layout. ids are server-generated UUIDs, so keys are unguessable and collision-free. */
export function objectKey(kind: UploadKind, artistId: string, uploadId: string, ext: string) {
  const folder = { audio: "tracks", artwork: "artwork", avatar: "avatars", cover: "covers" }[kind];
  return `${folder}/${artistId}/${uploadId}.${ext}`;
}

export function isSha256Hex(v: unknown): v is string {
  return typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
}
