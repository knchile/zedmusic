import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { handle, jsonError } from "@/lib/http";
import { completeUpload } from "@/lib/uploads/service";

/** Step 2: the browser finished uploading; verify and inspect the file. */
export const POST = handle(async (_request: Request, ctx: RouteContext<"/api/uploads/[id]/complete">) => {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return jsonError(404, "Upload not found.");
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "Please sign in.");
  const result = await completeUpload(user.id, id);
  if (!result.ok) return jsonError(result.status, result.error);
  return Response.json(result);
});
