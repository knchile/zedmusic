"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import {
  addToPlaylist,
  createPlaylist,
  deletePlaylist,
  removeFromPlaylist,
  setFollow,
  setLike,
  updatePlaylist,
} from "@/lib/catalog/social";
import { consumeRateLimit } from "@/lib/security/rate-limit";

type R<T = object> = ({ ok: true } & T) | { ok: false; error: string; signIn?: boolean };

const uuid = z.uuid();

async function actor(action: "listener:like" | "listener:follow" | "listener:playlist") {
  const user = await getCurrentUser();
  if (!user) return { error: { ok: false as const, error: "Sign in to do that.", signIn: true } };
  if (!can(user, action)) return { error: { ok: false as const, error: "Not allowed." } };
  const rl = await consumeRateLimit(`social:${user.id}`, 300, 3600);
  if (!rl.allowed) return { error: { ok: false as const, error: "You're doing that too often. Try again later." } };
  return { user };
}

export async function likeTrackAction(trackId: string, liked: boolean): Promise<R<{ liked: boolean }>> {
  if (!uuid.safeParse(trackId).success) return { ok: false, error: "Invalid track." };
  const a = await actor("listener:like");
  if ("error" in a) return a.error!;
  return setLike(a.user.id, trackId, liked);
}

export async function followArtistAction(artistId: string, following: boolean): Promise<R<{ following: boolean }>> {
  if (!uuid.safeParse(artistId).success) return { ok: false, error: "Invalid artist." };
  const a = await actor("listener:follow");
  if ("error" in a) return a.error!;
  return setFollow(a.user.id, artistId, following);
}

export async function createPlaylistAction(title: string, isPublic: boolean, trackId?: string): Promise<R<{ playlist: { id: string; title: string } }>> {
  const a = await actor("listener:playlist");
  if ("error" in a) return a.error!;
  const res = await createPlaylist(a.user.id, String(title), !!isPublic);
  if (!res.ok) return res;
  if (trackId && uuid.safeParse(trackId).success) await addToPlaylist(a.user.id, res.playlist.id, trackId);
  return res;
}

export async function addToPlaylistAction(playlistId: string, trackId: string): Promise<R<{ added: boolean }>> {
  if (!uuid.safeParse(playlistId).success || !uuid.safeParse(trackId).success) return { ok: false, error: "Invalid request." };
  const a = await actor("listener:playlist");
  if ("error" in a) return a.error!;
  return addToPlaylist(a.user.id, playlistId, trackId);
}

export async function removeFromPlaylistAction(playlistId: string, trackId: string): Promise<R> {
  if (!uuid.safeParse(playlistId).success || !uuid.safeParse(trackId).success) return { ok: false, error: "Invalid request." };
  const a = await actor("listener:playlist");
  if ("error" in a) return a.error!;
  return removeFromPlaylist(a.user.id, playlistId, trackId);
}

export async function updatePlaylistAction(playlistId: string, patch: { title?: string; description?: string; isPublic?: boolean }): Promise<R> {
  if (!uuid.safeParse(playlistId).success) return { ok: false, error: "Invalid playlist." };
  const a = await actor("listener:playlist");
  if ("error" in a) return a.error!;
  return updatePlaylist(a.user.id, playlistId, {
    title: typeof patch.title === "string" ? patch.title : undefined,
    description: typeof patch.description === "string" ? patch.description : undefined,
    isPublic: typeof patch.isPublic === "boolean" ? patch.isPublic : undefined,
  });
}

export async function deletePlaylistAction(playlistId: string): Promise<R> {
  if (!uuid.safeParse(playlistId).success) return { ok: false, error: "Invalid playlist." };
  const a = await actor("listener:playlist");
  if ("error" in a) return a.error!;
  return deletePlaylist(a.user.id, playlistId);
}
