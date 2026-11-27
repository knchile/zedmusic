import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { ServerEnv } from "@/lib/env";
import type { BucketKind, StorageDriver } from "./types";

/** Cloudflare R2 (or any S3-compatible service). */
export function createR2Driver(env: ServerEnv): StorageDriver {
  const client = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    credentials: { accessKeyId: env.S3_ACCESS_KEY_ID!, secretAccessKey: env.S3_SECRET_ACCESS_KEY! },
    // R2 doesn't support the newer default checksum headers on presigned PUTs.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  const bucketName = (b: BucketKind) => (b === "audio" ? env.S3_AUDIO_BUCKET! : env.S3_MEDIA_BUCKET!);

  return {
    name: "r2",
    async presignPut(bucket, key, { contentType, size, expiresInSec = 900 }) {
      const cmd = new PutObjectCommand({
        Bucket: bucketName(bucket),
        Key: key,
        ContentType: contentType,
        ContentLength: size,
        CacheControl: bucket === "media" ? "public, max-age=31536000, immutable" : "private, max-age=0",
      });
      const url = await getSignedUrl(client, cmd, {
        expiresIn: expiresInSec,
        signableHeaders: new Set(["content-type", "content-length"]),
      });
      return { url, headers: { "Content-Type": contentType } };
    },
    async presignGet(bucket, key, { expiresInSec = 3600 } = {}) {
      return getSignedUrl(client, new GetObjectCommand({ Bucket: bucketName(bucket), Key: key }), {
        expiresIn: expiresInSec,
      });
    },
    async head(bucket, key) {
      try {
        const r = await client.send(new HeadObjectCommand({ Bucket: bucketName(bucket), Key: key }));
        return { size: r.ContentLength ?? 0, contentType: r.ContentType ?? null };
      } catch (err) {
        const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
        if (status === 404) return null;
        throw err;
      }
    },
    async getRange(bucket, key, start, end) {
      const r = await client.send(
        new GetObjectCommand({ Bucket: bucketName(bucket), Key: key, Range: `bytes=${start}-${end}` }),
      );
      return new Uint8Array(await r.Body!.transformToByteArray());
    },
    async delete(bucket, key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucketName(bucket), Key: key }));
    },
    publicUrl(key) {
      return `${env.NEXT_PUBLIC_MEDIA_BASE_URL!.replace(/\/$/, "")}/${key}`;
    },
  };
}
