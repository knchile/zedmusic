import "server-only";
import { getEnv, isConfigured } from "@/lib/env";
import { createLocalDriver } from "./local";
import { createR2Driver } from "./r2";
import type { StorageDriver } from "./types";

export type { BucketKind, StorageDriver } from "./types";

let driver: StorageDriver | null | undefined;

/**
 * Active storage driver:
 * - R2 when S3_* variables are set;
 * - the local filesystem driver in development/test;
 * - null in production without R2 (uploads/playback show an "unavailable" state).
 */
export function getStorage(): StorageDriver | null {
  if (driver !== undefined) return driver;
  const env = getEnv();
  if (isConfigured("storage", env)) driver = createR2Driver(env);
  else if (env.NODE_ENV !== "production") driver = createLocalDriver(env.NEXT_PUBLIC_APP_URL.replace(/\/$/, ""));
  else driver = null;
  return driver;
}

/** Public URL for an artwork/avatar key, or null. Safe to call during rendering. */
export function mediaUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  const env = getEnv();
  if (env.NEXT_PUBLIC_MEDIA_BASE_URL) return `${env.NEXT_PUBLIC_MEDIA_BASE_URL.replace(/\/$/, "")}/${key}`;
  if (env.NODE_ENV !== "production") return `/api/dev-storage/media/${key}`;
  return null;
}
