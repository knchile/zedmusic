"use server";

import { revalidateTag, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authorizeArtist, getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import {
  createArtistProfile,
  submitClaim,
  submitVerificationRequest,
  updateArtistProfile,
} from "@/lib/catalog/artists";
import { type FieldErrors, SOCIAL_KEYS, artistProfileSchema, flattenErrors } from "@/lib/validation/catalog";

export type FormState = { ok?: boolean; message?: string; error?: string; fieldErrors?: FieldErrors };

function parseArtistForm(fd: FormData) {
  return artistProfileSchema.safeParse({
    name: fd.get("name") ?? "",
    bio: fd.get("bio") ?? undefined,
    location: fd.get("location") ?? undefined,
    primaryGenreId: fd.get("primaryGenreId") ?? undefined,
    social: Object.fromEntries(SOCIAL_KEYS.map((k) => [k, fd.get(`social.${k}`) ?? undefined])),
  });
}

export async function createArtistAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };
  if (!can(user, "artist:register")) return { error: "Confirm your email address before creating an artist profile." };
  if (fd.get("confirm") !== "on") return { fieldErrors: { confirm: "Please confirm you are this artist or authorised to represent them." } };
  const parsed = parseArtistForm(fd);
  if (!parsed.success) return { fieldErrors: flattenErrors(parsed.error) };
  const result = await createArtistProfile(user, parsed.data);
  if (!result.ok) return { error: result.error };
  revalidateTag("artists", "max");
  redirect(`/studio/${result.artistId}?welcome=1`);
}

export async function updateArtistAction(artistId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const authz = await authorizeArtist(artistId, "artist:edit-profile");
  if (!authz.ok) return { error: "You don't have permission to edit this profile." };
  const parsed = parseArtistForm(fd);
  if (!parsed.success) return { fieldErrors: flattenErrors(parsed.error) };
  const str = (k: string) => (typeof fd.get(k) === "string" && fd.get(k) ? String(fd.get(k)) : undefined);
  const result = await updateArtistProfile(authz.user.id, artistId, parsed.data, {
    avatarUploadId: str("avatarUploadId"),
    coverUploadId: str("coverUploadId"),
  });
  if (!result.ok) return { error: result.error };
  updateTag(`artist:${artistId}`);
  revalidateTag("artists", "max");
  return { ok: true, message: "Profile saved." };
}

const linksSchema = z
  .string()
  .max(2000)
  .transform((s) =>
    s
      .split(/\s+/)
      .map((l) => l.trim())
      .filter(Boolean),
  )
  .pipe(z.array(z.url({ protocol: /^https$/ })).max(10));

export async function claimArtistAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };
  if (!can(user, "artist:register")) return { error: "Confirm your email address first." };
  const artistId = z.uuid().safeParse(fd.get("artistId"));
  const message = String(fd.get("message") ?? "").trim();
  const links = linksSchema.safeParse(String(fd.get("links") ?? ""));
  const errors: FieldErrors = {};
  if (!artistId.success) errors.artistId = "Choose the profile you're claiming.";
  if (message.length < 20) errors.message = "Tell us who you are and how we can confirm it (at least 20 characters).";
  if (!links.success) errors.links = "Add up to 10 https:// links, separated by spaces or new lines.";
  if (Object.keys(errors).length) return { fieldErrors: errors };
  const result = await submitClaim(user, artistId.data!, message.slice(0, 2000), links.data!);
  if (!result.ok) return { error: result.error };
  return { ok: true, message: "Claim submitted. Our team will review your evidence and email you." };
}

export async function requestVerificationAction(artistId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const authz = await authorizeArtist(artistId, "artist:manage-members");
  if (!authz.ok) return { error: "Only the profile owner can request verification." };
  const message = String(fd.get("message") ?? "").trim();
  const links = linksSchema.safeParse(String(fd.get("links") ?? ""));
  if (message.length < 20) return { fieldErrors: { message: "Explain how we can confirm your identity (at least 20 characters)." } };
  if (!links.success || links.data.length === 0) return { fieldErrors: { links: "Add at least one https:// link (e.g. your official social media)." } };
  const result = await submitVerificationRequest(authz.user, artistId, message.slice(0, 2000), links.data);
  if (!result.ok) return { error: result.error };
  updateTag(`artist:${artistId}`);
  return { ok: true, message: "Verification requested. We'll review it and email you." };
}
