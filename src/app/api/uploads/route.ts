import { z } from "zod";
import { authorizeArtist } from "@/lib/auth/session";
import { authzError, handle, jsonError, readJson } from "@/lib/http";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { LIMITS, isSha256Hex } from "@/lib/storage/policy";
import { createUpload } from "@/lib/uploads/service";

const Body = z.object({
  kind: z.enum(["audio", "artwork", "avatar", "cover"]),
  artistId: z.uuid(),
  filename: z.string().min(1).max(255),
  mimeType: z.string().max(100).nullish(),
  size: z.number().int().positive(),
  sha256: z.string().refine(isSha256Hex, "Invalid hash").nullish(),
});

/** Step 1 of an upload: returns a presigned URL the browser PUTs the file to directly. */
export const POST = handle(async (request: Request) => {
  const parsed = Body.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(400, "Invalid upload request.");
  const input = parsed.data;

  const authz = await authorizeArtist(input.artistId, input.kind === "audio" ? "artist:upload" : "artist:edit-profile");
  if (!authz.ok) return authzError(authz.status);

  const rl = await consumeRateLimit(`upload:${authz.user.id}`, LIMITS.uploadsPerHour, 3600);
  if (!rl.allowed) return jsonError(429, "You've reached the hourly upload limit. Please try again later.");

  const result = await createUpload(authz.user.id, input);
  if (!result.ok) return jsonError(result.status, result.error, result.duplicateOf ? { duplicateOf: result.duplicateOf } : undefined);
  return Response.json(result, { status: 201 });
});
