import { z } from "zod";

/**
 * Centralised, validated environment configuration.
 *
 * Design rules:
 * - Core variables (database, auth secret) are required for the app to run.
 * - Optional integrations (storage, email, OAuth, external platforms) may be
 *   absent. Features that depend on them must call `isConfigured()` and show an
 *   "unavailable" state instead of crashing.
 * - Secrets never leave the server: only variables prefixed NEXT_PUBLIC_ are
 *   exposed to the browser, and none of those are secret.
 */

const optionalString = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional();

const boolString = z
  .enum(["true", "false", "1", "0", ""])
  .optional()
  .transform((v) => v === "true" || v === "1");

export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // --- Core -----------------------------------------------------------------
  DATABASE_URL: optionalString,
  /** Direct (non-pooled) connection used for migrations. Falls back to DATABASE_URL. */
  DATABASE_URL_UNPOOLED: optionalString,
  BETTER_AUTH_SECRET: optionalString,
  /** Canonical public origin, e.g. https://www.zedmusic.online */
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

  // --- Social auth (optional) -----------------------------------------------
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,

  // --- Object storage: Cloudflare R2 / any S3-compatible service ---------------
  S3_ENDPOINT: optionalString,
  S3_REGION: z.string().default("auto"),
  S3_ACCESS_KEY_ID: optionalString,
  S3_SECRET_ACCESS_KEY: optionalString,
  /** Private bucket for original and streamable audio. Never public. */
  S3_AUDIO_BUCKET: optionalString,
  /** Bucket for artwork and profile images; served through a public CDN domain. */
  S3_MEDIA_BUCKET: optionalString,
  /** Public base URL of the media bucket, e.g. https://media.zedmusic.online */
  NEXT_PUBLIC_MEDIA_BASE_URL: optionalString,

  // --- Email ----------------------------------------------------------------
  RESEND_API_KEY: optionalString,
  EMAIL_FROM: z.string().default("Zed Music Online <no-reply@zedmusic.online>"),

  // --- Scheduled jobs ---------------------------------------------------------
  /** Shared secret Vercel Cron sends as `Authorization: Bearer <CRON_SECRET>`. */
  CRON_SECRET: optionalString,

  // --- Analytics / anti-fraud ---------------------------------------------------
  /** Secret used to hash IP addresses and device identifiers (never stored raw). */
  ANALYTICS_HASH_SECRET: optionalString,
  /** Secret used to sign play-session tokens issued to the player. */
  PLAY_TOKEN_SECRET: optionalString,

  // --- Encryption of third-party OAuth tokens at rest --------------------------
  /** 32-byte key, base64 encoded. Generate with `openssl rand -base64 32`. */
  TOKEN_ENCRYPTION_KEY: optionalString,

  // --- External platforms (all optional; see docs/EXTERNAL-INTEGRATIONS.md) ----
  YOUTUBE_API_KEY: optionalString,
  YOUTUBE_OAUTH_CLIENT_ID: optionalString,
  YOUTUBE_OAUTH_CLIENT_SECRET: optionalString,
  SPOTIFY_CLIENT_ID: optionalString,
  SPOTIFY_CLIENT_SECRET: optionalString,
  AUDIOMACK_CONSUMER_KEY: optionalString,
  AUDIOMACK_CONSUMER_SECRET: optionalString,

  // --- Feature flags ------------------------------------------------------------
  /** Allow `npm run db:seed -- --demo`. Refused when NODE_ENV=production. */
  ALLOW_DEMO_DATA: boolString,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

/** Parse once per process. Throws with a readable message on malformed values. */
export function getEnv(source: Record<string, string | undefined> = process.env): ServerEnv {
  if (cached && source === process.env) return cached;
  const parsed = serverEnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  if (source === process.env) cached = parsed.data;
  return parsed.data;
}

/** Reset the memoised env (tests only). */
export function resetEnvCache() {
  cached = undefined;
}

export type Service =
  | "database"
  | "auth"
  | "storage"
  | "media-cdn"
  | "email"
  | "google-auth"
  | "cron"
  | "analytics"
  | "token-encryption"
  | "youtube"
  | "spotify"
  | "audiomack";

const requirements: Record<Service, (keyof ServerEnv)[]> = {
  database: ["DATABASE_URL"],
  auth: ["DATABASE_URL", "BETTER_AUTH_SECRET"],
  storage: ["S3_ENDPOINT", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_AUDIO_BUCKET", "S3_MEDIA_BUCKET"],
  "media-cdn": ["NEXT_PUBLIC_MEDIA_BASE_URL"],
  email: ["RESEND_API_KEY"],
  "google-auth": ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  cron: ["CRON_SECRET"],
  analytics: ["ANALYTICS_HASH_SECRET", "PLAY_TOKEN_SECRET"],
  "token-encryption": ["TOKEN_ENCRYPTION_KEY"],
  youtube: ["YOUTUBE_API_KEY"],
  spotify: ["SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET"],
  audiomack: ["AUDIOMACK_CONSUMER_KEY", "AUDIOMACK_CONSUMER_SECRET"],
};

/** True when every variable a service needs is present. */
export function isConfigured(service: Service, env: ServerEnv = getEnv()): boolean {
  return requirements[service].every((key) => {
    const value = env[key];
    return value !== undefined && value !== "" && value !== false;
  });
}

/** Names of missing variables for a service (names only — never values). */
export function missingFor(service: Service, env: ServerEnv = getEnv()): string[] {
  return requirements[service].filter((key) => {
    const value = env[key];
    return value === undefined || value === "";
  });
}

export function serviceStatus(env: ServerEnv = getEnv()): Record<Service, boolean> {
  return Object.fromEntries(
    (Object.keys(requirements) as Service[]).map((s) => [s, isConfigured(s, env)]),
  ) as Record<Service, boolean>;
}

/** Throws a clear error for a required-but-missing service (server code paths only). */
export function assertConfigured(service: Service, env: ServerEnv = getEnv()): void {
  if (!isConfigured(service, env)) {
    throw new ServiceUnavailableError(service, missingFor(service, env));
  }
}

export class ServiceUnavailableError extends Error {
  constructor(
    public readonly service: Service,
    public readonly missing: string[],
  ) {
    super(`Service "${service}" is not configured. Missing: ${missing.join(", ")}`);
    this.name = "ServiceUnavailableError";
  }
}
