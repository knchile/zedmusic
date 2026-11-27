import { z } from "zod";

/** Validation for artist/release/track forms. Shared by server actions and tests. */

const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const httpsUrl = z
  .string()
  .trim()
  .max(300)
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => !v || /^https:\/\/[^\s]+\.[^\s]+$/i.test(v), "Enter a full link starting with https://");

export const SOCIAL_KEYS = ["website", "instagram", "facebook", "x", "tiktok", "youtube", "spotify", "appleMusic", "audiomack", "boomplay"] as const;

export const artistProfileSchema = z.object({
  name: trimmed(80).min(2, "Enter your artist name."),
  bio: optionalText(2000),
  location: optionalText(80),
  primaryGenreId: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined))
    .pipe(z.uuid().optional()),
  social: z.object(Object.fromEntries(SOCIAL_KEYS.map((k) => [k, httpsUrl])) as Record<(typeof SOCIAL_KEYS)[number], typeof httpsUrl>),
});
export type ArtistProfileInput = z.infer<typeof artistProfileSchema>;

const isoDate = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => !v || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))), "Enter a valid date.");

export const releaseSchema = z.object({
  title: trimmed(120).min(1, "Enter a title."),
  type: z.enum(["single", "ep", "album"]),
  releaseDate: isoDate,
  description: optionalText(2000),
  copyrightLine: optionalText(200),
  upc: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => !v || /^\d{12,13}$/.test(v), "UPC/EAN must be 12 or 13 digits."),
  artworkUploadId: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined))
    .pipe(z.uuid().optional()),
});
export type ReleaseInput = z.infer<typeof releaseSchema>;

/** ISRC: CC-XXX-YY-NNNNN (dashes optional), e.g. ZM-A1B-26-00001. */
export function normaliseIsrc(v: string) {
  return v.replace(/[-\s]/g, "").toUpperCase();
}
export function isValidIsrc(v: string) {
  return /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(normaliseIsrc(v));
}

export const trackSchema = z.object({
  title: trimmed(120).min(1, "Enter a title."),
  featuring: optionalText(200),
  producer: optionalText(200),
  composer: optionalText(200),
  genreId: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined))
    .pipe(z.uuid().optional()),
  isExplicit: z.boolean().default(false),
  lyrics: optionalText(20000),
  isrc: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? normaliseIsrc(v) : undefined))
    .refine((v) => !v || isValidIsrc(v), "ISRC should look like ZM-A1B-26-00001."),
  copyrightLine: optionalText(200),
  audioUploadId: z.uuid({ message: "Upload the audio file first." }),
});
export type TrackInput = z.infer<typeof trackSchema>;

/** Split "A, B & C" credit strings into names. */
export function splitCredits(v: string | undefined): string[] {
  if (!v) return [];
  return v
    .split(/,|&|\b(?:feat|ft)\b\.?|\band\b/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 20);
}

export type FieldErrors = Record<string, string>;

export function flattenErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
