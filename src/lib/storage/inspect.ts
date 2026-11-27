import "server-only";
import { tokenizer as rangeTokenizer, type IRangeRequestClient } from "@tokenizer/range";
import { parseFromTokenizer } from "music-metadata";
import sharp from "sharp";
import type { BucketKind, StorageDriver } from "./types";

export type AudioInfo = {
  durationMs: number | null;
  container?: string;
  codec?: string;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  lossless?: boolean;
  tags: { title?: string; artist?: string; album?: string; isrc?: string; year?: number };
};

/**
 * Read audio metadata using byte-range requests, so a 200 MB file is never
 * downloaded in full inside a serverless function.
 */
export async function inspectAudio(storage: StorageDriver, bucket: BucketKind, key: string, size: number, mimeType: string): Promise<AudioInfo> {
  const client: IRangeRequestClient = {
    async getHeadInfo() {
      return { size, mimeType, acceptPartialRequests: true };
    },
    async getResponse(_method, range) {
      const [start, end] = range ?? [0, size - 1];
      const bytes = await storage.getRange(bucket, key, start, Math.min(end, size - 1));
      return {
        size,
        mimeType,
        acceptPartialRequests: true,
        contentRange: { firstBytePosition: start, lastBytePosition: start + bytes.length - 1, instanceLength: size },
        arrayBuffer: async () => bytes,
      };
    },
    abort() {},
  };
  const tok = await rangeTokenizer(client, { initialChunkSize: 64 * 1024, minimumChunkSize: 32 * 1024 });
  const meta = await parseFromTokenizer(tok, { duration: true, skipCovers: true });
  const f = meta.format;
  return {
    durationMs: f.duration ? Math.round(f.duration * 1000) : null,
    container: f.container,
    codec: f.codec,
    bitrate: f.bitrate ? Math.round(f.bitrate) : undefined,
    sampleRate: f.sampleRate,
    channels: f.numberOfChannels,
    lossless: f.lossless,
    tags: {
      title: meta.common.title,
      artist: meta.common.artist,
      album: meta.common.album,
      isrc: meta.common.isrcs?.[0],
      year: meta.common.year,
    },
  };
}

export type ImageInfo = { width: number; height: number; format: string };

/** Images are ≤10 MB, so reading them whole is fine. */
export async function inspectImage(storage: StorageDriver, key: string, size: number): Promise<ImageInfo | null> {
  const bytes = await storage.getRange("media", key, 0, size - 1);
  try {
    const m = await sharp(bytes).metadata();
    if (!m.width || !m.height || !m.format) return null;
    return { width: m.width, height: m.height, format: m.format };
  } catch {
    return null;
  }
}
