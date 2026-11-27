/** Logical buckets. Audio is always private; media (artwork, avatars) is public via CDN. */
export type BucketKind = "audio" | "media";

export type ObjectInfo = { size: number; contentType: string | null };

export interface StorageDriver {
  readonly name: "r2" | "local";
  /** URL the browser PUTs the file to, with headers it must send. */
  presignPut(
    bucket: BucketKind,
    key: string,
    opts: { contentType: string; size: number; expiresInSec?: number },
  ): Promise<{ url: string; headers: Record<string, string> }>;
  /** Short-lived URL for reading a private object (supports HTTP Range). */
  presignGet(bucket: BucketKind, key: string, opts?: { expiresInSec?: number }): Promise<string>;
  head(bucket: BucketKind, key: string): Promise<ObjectInfo | null>;
  /** Read an inclusive byte range. */
  getRange(bucket: BucketKind, key: string, start: number, end: number): Promise<Uint8Array>;
  delete(bucket: BucketKind, key: string): Promise<void>;
  /** Public URL for a media object (no signature). */
  publicUrl(key: string): string;
}
