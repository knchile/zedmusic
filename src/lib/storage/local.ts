import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, open, rm, stat } from "node:fs/promises";
import path from "node:path";
import type { BucketKind, StorageDriver } from "./types";

/**
 * Development-only storage that mimics presigned S3 URLs using the local filesystem.
 * Files live in `.data/storage/<bucket>/<key>` and are served by
 * /api/dev-storage/[...path] (which refuses to run in production).
 */
export const LOCAL_ROOT = path.join(process.cwd(), ".data", "storage");
const ROUTE = "/api/dev-storage";

export function localSecret() {
  return process.env.BETTER_AUTH_SECRET || "local-dev-storage-secret";
}

export function signLocal(op: "put" | "get", bucket: string, key: string, exp: number, extra = "") {
  return createHmac("sha256", localSecret()).update(`${op}\n${bucket}\n${key}\n${exp}\n${extra}`).digest("base64url");
}

export function verifyLocal(op: "put" | "get", bucket: string, key: string, exp: number, sig: string, extra = "") {
  if (!Number.isFinite(exp) || exp < Date.now() / 1000) return false;
  const expected = Buffer.from(signLocal(op, bucket, key, exp, extra));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Resolve a key to a path inside the bucket directory, rejecting traversal. */
export function localPath(bucket: BucketKind, key: string) {
  const base = path.join(LOCAL_ROOT, bucket);
  const full = path.normalize(path.join(base, key));
  if (!full.startsWith(base + path.sep)) throw new Error("Invalid object key");
  return full;
}

export function createLocalDriver(origin: string): StorageDriver {
  const url = (bucket: string, key: string, qs: URLSearchParams) =>
    `${origin}${ROUTE}/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}?${qs}`;

  return {
    name: "local",
    async presignPut(bucket, key, { contentType, size, expiresInSec = 900 }) {
      const exp = Math.floor(Date.now() / 1000) + expiresInSec;
      const extra = `${contentType}\n${size}`;
      const qs = new URLSearchParams({ op: "put", exp: String(exp), ct: contentType, size: String(size), sig: signLocal("put", bucket, key, exp, extra) });
      return { url: url(bucket, key, qs), headers: { "Content-Type": contentType } };
    },
    async presignGet(bucket, key, { expiresInSec = 3600 } = {}) {
      const exp = Math.floor(Date.now() / 1000) + expiresInSec;
      return url(bucket, key, new URLSearchParams({ op: "get", exp: String(exp), sig: signLocal("get", bucket, key, exp) }));
    },
    async head(bucket, key) {
      try {
        const s = await stat(localPath(bucket, key));
        return { size: s.size, contentType: null };
      } catch {
        return null;
      }
    },
    async getRange(bucket, key, start, end) {
      const fh = await open(localPath(bucket, key), "r");
      try {
        const length = end - start + 1;
        const buf = Buffer.alloc(length);
        const { bytesRead } = await fh.read(buf, 0, length, start);
        return new Uint8Array(buf.subarray(0, bytesRead));
      } finally {
        await fh.close();
      }
    },
    async delete(bucket, key) {
      await rm(localPath(bucket, key), { force: true });
    },
    publicUrl(key) {
      return `${ROUTE}/media/${key}`;
    },
  };
}

export async function ensureDir(file: string) {
  await mkdir(path.dirname(file), { recursive: true });
}
