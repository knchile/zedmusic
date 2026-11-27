import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getLibraryState } from "@/lib/catalog/social";
import { handle } from "@/lib/http";

/** The signed-in listener's likes, follows and playlists, so static pages can show personal state. */
export const GET = handle(async () => {
  await connection();
  const user = await getCurrentUser();
  const headers = { "Cache-Control": "private, no-store" };
  if (!user) return Response.json({ signedIn: false }, { headers });
  return Response.json({ signedIn: true, ...(await getLibraryState(user.id)) }, { headers });
});
