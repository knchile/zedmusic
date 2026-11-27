"use client";

import { createSHA256 } from "hash-wasm";
import type { UploadKind } from "@/lib/storage/policy";

export type UploadProgress = { phase: "hashing" | "uploading" | "processing"; fraction: number };

export class UploadError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly data?: Record<string, unknown>,
  ) {
    super(message);
  }
}

/** Streaming SHA-256 in 4 MB chunks — keeps memory low on phones even for large WAVs. */
export async function sha256File(file: File, onProgress?: (f: number) => void, signal?: AbortSignal) {
  const hasher = await createSHA256();
  hasher.init();
  const chunk = 4 * 1024 * 1024;
  for (let offset = 0; offset < file.size; offset += chunk) {
    if (signal?.aborted) throw new UploadError("Upload cancelled.");
    const buf = new Uint8Array(await file.slice(offset, offset + chunk).arrayBuffer());
    hasher.update(buf);
    onProgress?.(Math.min(1, (offset + chunk) / file.size));
  }
  return hasher.digest("hex");
}

function putWithProgress(url: string, file: File, headers: Record<string, string>, onProgress: (f: number) => void, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new UploadError("The upload failed. Please try again.", xhr.status)));
    xhr.onerror = () => reject(new UploadError("Network error while uploading. Check your connection and try again."));
    xhr.onabort = () => reject(new UploadError("Upload cancelled."));
    signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(file);
  });
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new UploadError(String(data.error ?? "Something went wrong."), res.status, data);
  return data as T;
}

/**
 * Full upload: hash (audio only) → request presigned URL → PUT directly to storage
 * → ask the server to verify and inspect. Returns the server's upload id + metadata.
 */
export async function uploadFile(
  file: File,
  opts: { kind: UploadKind; artistId: string; onProgress?: (p: UploadProgress) => void; signal?: AbortSignal },
) {
  const report = opts.onProgress ?? (() => {});
  let sha256: string | undefined;
  if (opts.kind === "audio") {
    report({ phase: "hashing", fraction: 0 });
    sha256 = await sha256File(file, (f) => report({ phase: "hashing", fraction: f }), opts.signal);
  }
  const created = await postJson<{ uploadId: string; url: string; headers: Record<string, string> }>("/api/uploads", {
    kind: opts.kind,
    artistId: opts.artistId,
    filename: file.name,
    mimeType: file.type || null,
    size: file.size,
    sha256,
  });
  report({ phase: "uploading", fraction: 0 });
  await putWithProgress(created.url, file, created.headers, (f) => report({ phase: "uploading", fraction: f }), opts.signal);
  report({ phase: "processing", fraction: 1 });
  return postJson<{ uploadId: string; metadata: Record<string, unknown> }>(`/api/uploads/${created.uploadId}/complete`);
}
