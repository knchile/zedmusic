"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/(site)/studio/actions";
import { Button } from "@/components/ui/button";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import type { SocialLinks } from "@/db/schema/catalog";
import { ImageUploadField } from "./image-upload";

type Genre = { id: string; name: string };

export type ArtistDefaults = {
  id?: string;
  name?: string;
  bio?: string | null;
  location?: string | null;
  primaryGenreId?: string | null;
  socialLinks?: SocialLinks;
  avatarUrl?: string | null;
  coverUrl?: string | null;
};

const socialFields: { key: keyof SocialLinks; label: string; placeholder: string }[] = [
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/…" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/…" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@…" },
  { key: "x", label: "X (Twitter)", placeholder: "https://x.com/…" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@…" },
  { key: "spotify", label: "Spotify", placeholder: "https://open.spotify.com/artist/…" },
  { key: "appleMusic", label: "Apple Music", placeholder: "https://music.apple.com/…" },
  { key: "audiomack", label: "Audiomack", placeholder: "https://audiomack.com/…" },
  { key: "boomplay", label: "Boomplay", placeholder: "https://www.boomplay.com/artists/…" },
  { key: "website", label: "Website", placeholder: "https://…" },
];

export function ArtistProfileForm({
  action,
  genres,
  defaults = {},
  mode,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  genres: Genre[];
  defaults?: ArtistDefaults;
  mode: "create" | "edit";
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="grid gap-8">
      {mode === "edit" && defaults.id && (
        <section className="grid gap-6">
          <ImageUploadField kind="cover" artistId={defaults.id} name="coverUploadId" label="Cover image" currentUrl={defaults.coverUrl} />
          <ImageUploadField kind="avatar" artistId={defaults.id} name="avatarUploadId" label="Profile photo" currentUrl={defaults.avatarUrl} />
        </section>
      )}

      <section className="grid gap-4">
        <Field label="Artist name" htmlFor="name" error={fe.name} hint="Exactly as you want it shown to listeners.">
          <Input id="name" name="name" defaultValue={defaults.name} required maxLength={80} aria-invalid={!!fe.name} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Location" htmlFor="location" error={fe.location} hint="e.g. Lusaka, Kitwe, Livingstone">
            <Input id="location" name="location" defaultValue={defaults.location ?? ""} maxLength={80} />
          </Field>
          <Field label="Main genre" htmlFor="primaryGenreId" error={fe.primaryGenreId}>
            <Select id="primaryGenreId" name="primaryGenreId" defaultValue={defaults.primaryGenreId ?? ""}>
              <option value="">Choose a genre</option>
              {genres.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Biography" htmlFor="bio" error={fe.bio} hint="Up to 2,000 characters.">
          <Textarea id="bio" name="bio" defaultValue={defaults.bio ?? ""} maxLength={2000} rows={6} />
        </Field>
      </section>

      <section className="grid gap-4">
        <h2 className="font-display text-lg font-semibold">Links</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {socialFields.map((s) => (
            <Field key={s.key} label={s.label} htmlFor={`social.${s.key}`} error={fe[`social.${s.key}`]}>
              <Input
                id={`social.${s.key}`}
                name={`social.${s.key}`}
                type="url"
                inputMode="url"
                placeholder={s.placeholder}
                defaultValue={defaults.socialLinks?.[s.key] ?? ""}
              />
            </Field>
          ))}
        </div>
      </section>

      {mode === "create" && (
        <div className="grid gap-1">
          <label className="flex items-start gap-2.5 text-sm text-muted">
            <input type="checkbox" name="confirm" className="mt-0.5 size-4 shrink-0 accent-primary" />
            I am this artist, or I&apos;m authorised to manage this artist&apos;s profile and music.
          </label>
          {fe.confirm && (
            <p className="text-sm text-danger" role="alert">
              {fe.confirm}
            </p>
          )}
        </div>
      )}

      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && state.message && <Alert tone="success">{state.message}</Alert>}
      {Object.keys(fe).length > 0 && <Alert tone="error">Please fix the highlighted fields.</Alert>}

      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-fit">
        {pending ? "Saving…" : mode === "create" ? "Create artist profile" : "Save profile"}
      </Button>
    </form>
  );
}
