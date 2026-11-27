"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { authorizeArtist } from "@/lib/auth/session";
import {
  addTrack,
  createRelease,
  deleteDraftTrack,
  moveTrack,
  submitRelease,
  updateRelease,
  updateTrack,
  withdrawSubmission,
} from "@/lib/catalog/releases";
import { flattenErrors, releaseSchema, trackSchema } from "@/lib/validation/catalog";
import type { FormState } from "./actions";

const str = (fd: FormData, k: string) => (typeof fd.get(k) === "string" ? String(fd.get(k)) : undefined);

function parseRelease(fd: FormData) {
  return releaseSchema.safeParse({
    title: str(fd, "title") ?? "",
    type: str(fd, "type"),
    releaseDate: str(fd, "releaseDate"),
    description: str(fd, "description"),
    copyrightLine: str(fd, "copyrightLine"),
    upc: str(fd, "upc"),
    artworkUploadId: str(fd, "artworkUploadId"),
  });
}

function parseTrack(fd: FormData) {
  return trackSchema.safeParse({
    title: str(fd, "title") ?? "",
    featuring: str(fd, "featuring"),
    producer: str(fd, "producer"),
    composer: str(fd, "composer"),
    genreId: str(fd, "genreId"),
    isExplicit: fd.get("isExplicit") === "on",
    lyrics: str(fd, "lyrics"),
    isrc: str(fd, "isrc"),
    copyrightLine: str(fd, "copyrightLine"),
    audioUploadId: str(fd, "audioUploadId") ?? "",
  });
}

async function guard(artistId: string) {
  const authz = await authorizeArtist(artistId, "artist:upload");
  return authz.ok ? authz.user : null;
}

export async function createReleaseAction(artistId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const user = await guard(artistId);
  if (!user) return { error: "You don't have permission to upload for this artist." };
  const parsed = parseRelease(fd);
  if (!parsed.success) return { fieldErrors: flattenErrors(parsed.error) };
  const res = await createRelease(user.id, artistId, parsed.data);
  if (!res.ok) return { error: res.error };
  redirect(`/studio/${artistId}/releases/${res.releaseId}`);
}

export async function updateReleaseAction(artistId: string, releaseId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const user = await guard(artistId);
  if (!user) return { error: "You don't have permission to edit this release." };
  const parsed = parseRelease(fd);
  if (!parsed.success) return { fieldErrors: flattenErrors(parsed.error) };
  const res = await updateRelease(user.id, artistId, releaseId, parsed.data);
  if (!res.ok) return { error: res.error };
  return { ok: true, message: "Release details saved." };
}

export async function addTrackAction(artistId: string, releaseId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const user = await guard(artistId);
  if (!user) return { error: "You don't have permission to upload for this artist." };
  const parsed = parseTrack(fd);
  if (!parsed.success) return { fieldErrors: flattenErrors(parsed.error) };
  const res = await addTrack(user.id, artistId, releaseId, parsed.data);
  if (!res.ok) return { error: res.error };
  return { ok: true, message: "Track added." };
}

export async function updateTrackAction(artistId: string, trackId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const user = await guard(artistId);
  if (!user) return { error: "You don't have permission to edit this track." };
  const parsed = trackSchema.omit({ audioUploadId: true }).safeParse({
    title: str(fd, "title") ?? "",
    featuring: str(fd, "featuring"),
    producer: str(fd, "producer"),
    composer: str(fd, "composer"),
    genreId: str(fd, "genreId"),
    isExplicit: fd.get("isExplicit") === "on",
    lyrics: str(fd, "lyrics"),
    isrc: str(fd, "isrc"),
    copyrightLine: str(fd, "copyrightLine"),
  });
  if (!parsed.success) return { fieldErrors: flattenErrors(parsed.error) };
  const res = await updateTrack(user.id, artistId, trackId, parsed.data);
  if (!res.ok) return { error: res.error };
  return { ok: true, message: "Track saved." };
}

export async function deleteTrackAction(artistId: string, trackId: string): Promise<FormState> {
  const user = await guard(artistId);
  if (!user) return { error: "You don't have permission to delete this track." };
  const res = await deleteDraftTrack(user.id, artistId, trackId);
  return res.ok ? { ok: true } : { error: res.error };
}

export async function moveTrackAction(artistId: string, trackId: string, direction: "up" | "down"): Promise<FormState> {
  const user = await guard(artistId);
  if (!user) return { error: "You don't have permission to reorder tracks." };
  const res = await moveTrack(user.id, artistId, trackId, direction);
  return res.ok ? { ok: true } : { error: res.error };
}

export async function submitReleaseAction(artistId: string, releaseId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const authz = await authorizeArtist(artistId, "artist:submit-for-review");
  if (!authz.ok) return { error: "Only the artist owner or manager can submit music for review." };
  const res = await submitRelease(authz.user.id, artistId, releaseId, fd.get("rights") === "on");
  if (!res.ok) return { error: res.error };
  updateTag("admin:submissions");
  return { ok: true, message: "Submitted for review. We'll email you when it's approved." };
}

export async function withdrawReleaseAction(artistId: string, releaseId: string): Promise<FormState> {
  const authz = await authorizeArtist(artistId, "artist:submit-for-review");
  if (!authz.ok) return { error: "You don't have permission to withdraw this submission." };
  const res = await withdrawSubmission(authz.user.id, artistId, releaseId);
  return res.ok ? { ok: true } : { error: res.error };
}
