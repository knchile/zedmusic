import { createReadStream, createWriteStream } from "node:fs";
import { rename, rm, stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { ensureDir, localPath, verifyLocal } from "@/lib/storage/local";
import type { BucketKind } from "@/lib/storage/types";

/**
 * Development-only stand-in for presigned R2 URLs (see src/lib/storage/local.ts).
 * Disabled in production and whenever real object storage is configured.
 */
const MIME: Record<string, string> = {
  mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac", wav: "audio/wav", flac: "audio/flac",
  jpg: "image/jpeg", png: "image/png", webp: "image/webp",
};

function parse(params: string[]): { bucket: BucketKind; key: string } | null {
  const [bucket, ...rest] = params;
  if ((bucket !== "audio" && bucket !== "media") || rest.length === 0) return null;
  return { bucket, key: rest.map(decodeURIComponent).join("/") };
}

function disabled() {
  return process.env.NODE_ENV === "production" || !!process.env.S3_ENDPOINT;
}

export async function PUT(request: Request, ctx: RouteContext<"/api/dev-storage/[...path]">) {
  if (disabled()) return new Response("Not found", { status: 404 });
  const target = parse((await ctx.params).path);
  if (!target) return new Response("Bad path", { status: 400 });
  const q = new URL(request.url).searchParams;
  const exp = Number(q.get("exp"));
  const ct = q.get("ct") ?? "";
  const size = Number(q.get("size"));
  if (q.get("op") !== "put" || !verifyLocal("put", target.bucket, target.key, exp, q.get("sig") ?? "", `${ct}\n${size}`)) {
    return new Response("Signature invalid or expired", { status: 403 });
  }
  if ((request.headers.get("content-type") ?? "") !== ct) return new Response("Content-Type mismatch", { status: 400 });
  if (!request.body) return new Response("Empty body", { status: 400 });

  const file = localPath(target.bucket, target.key);
  await ensureDir(file);
  const tmp = `${file}.part`;
  let written = 0;
  const limiter = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      written += chunk.byteLength;
      if (written > size) controller.error(new Error("Body larger than declared size"));
      else controller.enqueue(chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(request.body.pipeThrough(limiter) as never), createWriteStream(tmp));
    if (written !== size) throw new Error("Body size does not match declared size");
    await rename(tmp, file);
  } catch (err) {
    await rm(tmp, { force: true });
    return new Response((err as Error).message, { status: 400 });
  }
  return new Response(null, { status: 200, headers: { ETag: `"${written}"` } });
}

export async function GET(request: Request, ctx: RouteContext<"/api/dev-storage/[...path]">) {
  if (disabled()) return new Response("Not found", { status: 404 });
  const target = parse((await ctx.params).path);
  if (!target) return new Response("Bad path", { status: 400 });
  const q = new URL(request.url).searchParams;
  // Media is public (like the CDN bucket); audio requires a valid signature.
  if (target.bucket === "audio" && !verifyLocal("get", target.bucket, target.key, Number(q.get("exp")), q.get("sig") ?? "")) {
    return new Response("Signature invalid or expired", { status: 403 });
  }
  const file = localPath(target.bucket, target.key);
  let size: number;
  try {
    size = (await stat(file)).size;
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const type = MIME[target.key.split(".").pop() ?? ""] ?? "application/octet-stream";
  const base = { "Content-Type": type, "Accept-Ranges": "bytes", "Cache-Control": target.bucket === "media" ? "public, max-age=3600" : "private, no-store" };

  const range = request.headers.get("range");
  const m = range?.match(/^bytes=(\d*)-(\d*)$/);
  if (m && (m[1] || m[2])) {
    let start = m[1] ? Number(m[1]) : size - Number(m[2]);
    let end = m[1] && m[2] ? Number(m[2]) : size - 1;
    start = Math.max(0, start);
    end = Math.min(size - 1, end);
    if (start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    const stream = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: { ...base, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, {
    headers: { ...base, "Content-Length": String(size) },
  });
}
