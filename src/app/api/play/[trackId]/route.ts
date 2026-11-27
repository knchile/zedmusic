import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { getEnv } from "@/lib/env";
import { handle, jsonError } from "@/lib/http";
import { hmacId } from "@/lib/security/hash";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { getStorage } from "@/lib/storage";

/**
 * Returns a short-lived URL for streaming a published track directly from object
 * storage (Range requests supported, so seeking works on iOS and Android).
 * Phase 3 adds a server-issued play session here for stream counting.
 */
export const POST = handle(async (request: Request, ctx: RouteContext<"/api/play/[trackId]">) => {
  const { trackId } = await ctx.params;
  if (!z.uuid().safeParse(trackId).success) return jsonError(404, "Track not found.");

  const env = getEnv();
  const ip = request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await consumeRateLimit(`play:${hmacId(ip, env.ANALYTICS_HASH_SECRET ?? env.BETTER_AUTH_SECRET ?? "dev")}`, 600, 3600);
  if (!rl.allowed) return jsonError(429, "Too many requests. Please slow down.");

  const storage = getStorage();
  if (!storage) return jsonError(503, "Streaming is temporarily unavailable.");

  const [track] = await getDb()
    .select({ streamKey: schema.tracks.streamKey, mime: schema.tracks.streamMimeType, durationMs: schema.tracks.durationMs, isDemo: schema.tracks.isDemo })
    .from(schema.tracks)
    .innerJoin(schema.artists, eq(schema.artists.id, schema.tracks.artistId))
    .where(and(eq(schema.tracks.id, trackId), eq(schema.tracks.status, "published"), eq(schema.artists.state, "active")))
    .limit(1);
  if (!track?.streamKey) return jsonError(404, "This track isn't available.");
  if (track.isDemo && (env.NODE_ENV === "production" || !env.ALLOW_DEMO_DATA)) return jsonError(404, "This track isn't available.");

  const expiresInSec = 60 * 60;
  const url = await storage.presignGet("audio", track.streamKey, { expiresInSec });
  return Response.json(
    { url, mimeType: track.mime, durationMs: track.durationMs, expiresAt: Date.now() + expiresInSec * 1000 },
    { headers: { "Cache-Control": "private, no-store" } },
  );
});
