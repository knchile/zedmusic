import "server-only";
import { unstable_rethrow } from "next/navigation";
import { ServiceUnavailableError } from "@/lib/env";

/** Consistent JSON error responses for route handlers. */
export function jsonError(status: number, error: string, extra?: Record<string, unknown>) {
  return Response.json({ error, ...extra }, { status, headers: { "Cache-Control": "no-store" } });
}

export function authzError(status: 401 | 403) {
  return status === 401 ? jsonError(401, "Please sign in.") : jsonError(403, "You don't have permission to do that.");
}

/** Wrap a handler so unexpected errors become 500/503 without leaking internals. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      // Let Next.js control-flow errors (prerender bail-outs, redirect, notFound) propagate.
      unstable_rethrow(err);
      if (err instanceof ServiceUnavailableError) return jsonError(503, "This feature is temporarily unavailable.");
      console.error("[api] unhandled error", err);
      return jsonError(500, "Something went wrong. Please try again.");
    }
  };
}

export async function readJson<T>(request: Request, maxBytes = 64 * 1024): Promise<T | null> {
  const len = Number(request.headers.get("content-length") ?? 0);
  if (len > maxBytes) return null;
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
