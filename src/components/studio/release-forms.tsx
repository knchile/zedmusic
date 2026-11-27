"use client";

import { ArrowDown, ArrowUp, ChevronDown, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import type { FormState } from "@/app/(site)/studio/actions";
import { Button } from "@/components/ui/button";
import { Alert, Badge, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { formatDuration } from "@/lib/utils";
import { AudioUploadField } from "./audio-upload";
import { ImageUploadField } from "./image-upload";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;
type Genre = { id: string; name: string };

/** Refresh server data after a successful action. */
function useRefreshOnSuccess(state: FormState) {
  const router = useRouter();
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);
}

function Feedback({ state }: { state: FormState }) {
  const fe = state.fieldErrors ?? {};
  return (
    <>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && state.message && <Alert tone="success">{state.message}</Alert>}
      {Object.keys(fe).length > 0 && !state.error && <Alert tone="error">Please fix the highlighted fields.</Alert>}
    </>
  );
}

export type ReleaseDefaults = {
  title?: string;
  type?: "single" | "ep" | "album";
  releaseDate?: string | null;
  description?: string | null;
  copyrightLine?: string | null;
  upc?: string | null;
  artworkUrl?: string | null;
};

export function ReleaseForm({ action, artistId, defaults = {}, submitLabel }: { action: Action; artistId: string; defaults?: ReleaseDefaults; submitLabel: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  useRefreshOnSuccess(state);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="grid gap-6">
      <ImageUploadField kind="artwork" artistId={artistId} name="artworkUploadId" label="Artwork" currentUrl={defaults.artworkUrl} />
      <Field label="Title" htmlFor="title" error={fe.title}>
        <Input id="title" name="title" defaultValue={defaults.title} required maxLength={120} aria-invalid={!!fe.title} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type" htmlFor="type" error={fe.type} hint="Single: 1–3 tracks · EP: 2–10 · Album: 5–40">
          <Select id="type" name="type" defaultValue={defaults.type ?? "single"}>
            <option value="single">Single</option>
            <option value="ep">EP</option>
            <option value="album">Album</option>
          </Select>
        </Field>
        <Field label="Release date" htmlFor="releaseDate" error={fe.releaseDate}>
          <Input id="releaseDate" name="releaseDate" type="date" defaultValue={defaults.releaseDate ?? ""} />
        </Field>
      </div>
      <Field label="Description" htmlFor="description" error={fe.description}>
        <Textarea id="description" name="description" defaultValue={defaults.description ?? ""} maxLength={2000} rows={3} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Copyright line" htmlFor="copyrightLine" error={fe.copyrightLine} hint="e.g. ℗ 2026 Your Name">
          <Input id="copyrightLine" name="copyrightLine" defaultValue={defaults.copyrightLine ?? ""} maxLength={200} />
        </Field>
        <Field label="UPC / EAN (optional)" htmlFor="upc" error={fe.upc}>
          <Input id="upc" name="upc" inputMode="numeric" defaultValue={defaults.upc ?? ""} />
        </Field>
      </div>
      <Feedback state={state} />
      <Button type="submit" disabled={pending} className="w-full sm:w-fit">
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}

export type TrackDefaults = {
  title?: string;
  featuring?: string | null;
  producer?: string;
  composer?: string;
  genreId?: string | null;
  isExplicit?: boolean;
  lyrics?: string | null;
  isrc?: string | null;
  copyrightLine?: string | null;
};

function TrackFields({ genres, defaults = {}, fe, titleRef }: { genres: Genre[]; defaults?: TrackDefaults; fe: Record<string, string>; titleRef?: React.Ref<HTMLInputElement> }) {
  return (
    <>
      <Field label="Track title" htmlFor="t-title" error={fe.title}>
        <Input ref={titleRef} id="t-title" name="title" defaultValue={defaults.title} required maxLength={120} aria-invalid={!!fe.title} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Featured artists" htmlFor="t-feat" error={fe.featuring} hint="Separate names with commas">
          <Input id="t-feat" name="featuring" defaultValue={defaults.featuring ?? ""} maxLength={200} />
        </Field>
        <Field label="Genre" htmlFor="t-genre" error={fe.genreId}>
          <Select id="t-genre" name="genreId" defaultValue={defaults.genreId ?? ""}>
            <option value="">Choose a genre</option>
            {genres.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Producer(s)" htmlFor="t-prod" error={fe.producer}>
          <Input id="t-prod" name="producer" defaultValue={defaults.producer ?? ""} maxLength={200} />
        </Field>
        <Field label="Composer / songwriter(s)" htmlFor="t-comp" error={fe.composer}>
          <Input id="t-comp" name="composer" defaultValue={defaults.composer ?? ""} maxLength={200} />
        </Field>
        <Field label="ISRC (optional)" htmlFor="t-isrc" error={fe.isrc} hint="From your distributor, e.g. ZM-A1B-26-00001">
          <Input id="t-isrc" name="isrc" defaultValue={defaults.isrc ?? ""} maxLength={15} />
        </Field>
        <Field label="Copyright line" htmlFor="t-copy" error={fe.copyrightLine} hint="Defaults to the release's">
          <Input id="t-copy" name="copyrightLine" defaultValue={defaults.copyrightLine ?? ""} maxLength={200} />
        </Field>
      </div>
      <Field label="Lyrics (optional)" htmlFor="t-lyrics" error={fe.lyrics}>
        <Textarea id="t-lyrics" name="lyrics" defaultValue={defaults.lyrics ?? ""} rows={4} maxLength={20000} />
      </Field>
      <label className="flex items-center gap-2.5 text-sm">
        <input type="checkbox" name="isExplicit" defaultChecked={defaults.isExplicit} className="size-4 accent-primary" />
        Contains explicit content
      </label>
    </>
  );
}

export function AddTrackForm({ action, artistId, genres }: { action: Action; artistId: string; genres: Genre[] }) {
  const [formKey, setFormKey] = useState(0);
  const [state, formAction, pending] = useActionState(async (prev: FormState, fd: FormData) => {
    const res = await action(prev, fd);
    if (res.ok) setFormKey((k) => k + 1); // fresh form for the next track
    return res;
  }, {});
  useRefreshOnSuccess(state);
  const titleRef = useRef<HTMLInputElement>(null);
  const fe = state.fieldErrors ?? {};
  return (
    <form key={formKey} action={formAction} className="grid gap-5">
      <AudioUploadField
        artistId={artistId}
        onReady={(meta) => {
          if (titleRef.current && !titleRef.current.value && meta.tags?.title) titleRef.current.value = meta.tags.title;
        }}
      />
      {fe.audioUploadId && (
        <p className="text-sm text-danger" role="alert">
          {fe.audioUploadId}
        </p>
      )}
      <TrackFields genres={genres} fe={fe} titleRef={titleRef} />
      <Feedback state={state} />
      <Button type="submit" disabled={pending} className="w-full sm:w-fit">
        {pending ? "Adding…" : "Add track"}
      </Button>
    </form>
  );
}

export type TrackRowData = TrackDefaults & {
  id: string;
  trackNumber: number | null;
  title: string;
  durationMs: number | null;
  status: string;
};

export function TrackRow({
  track,
  genres,
  editable,
  isFirst,
  isLast,
  updateAction,
  deleteAction,
  moveAction,
}: {
  track: TrackRowData;
  genres: Genre[];
  editable: boolean;
  isFirst: boolean;
  isLast: boolean;
  updateAction: Action;
  deleteAction: () => Promise<FormState>;
  moveAction: (dir: "up" | "down") => Promise<FormState>;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateAction, {});
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  useRefreshOnSuccess(state);

  const run = (fn: () => Promise<FormState>) =>
    startTransition(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else router.refresh();
    });

  return (
    <li className="rounded-lg border border-border bg-surface">
      <div className="flex items-center gap-3 p-3">
        <span className="w-6 text-center text-sm text-muted tabular-nums">{track.trackNumber}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">
            {track.title}
            {track.featuring ? <span className="text-muted"> (feat. {track.featuring})</span> : null}
          </p>
          <p className="text-xs text-muted">
            {track.durationMs ? formatDuration(track.durationMs) : "—"}
            {track.isExplicit && (
              <Badge className="ml-2" tone="neutral">
                E
              </Badge>
            )}
          </p>
        </div>
        {editable && (
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" aria-label="Move up" disabled={isFirst || busy} onClick={() => run(() => moveAction("up"))}>
              <ArrowUp />
            </Button>
            <Button type="button" variant="ghost" size="icon" aria-label="Move down" disabled={isLast || busy} onClick={() => run(() => moveAction("down"))}>
              <ArrowDown />
            </Button>
            <Button type="button" variant="ghost" size="icon" aria-label={`Edit ${track.title}`} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              {open ? <ChevronDown /> : <Pencil />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Delete ${track.title}`}
              disabled={busy}
              onClick={() => {
                if (confirm(`Delete “${track.title}”? This can't be undone.`)) run(deleteAction);
              }}
            >
              <Trash2 />
            </Button>
          </div>
        )}
      </div>
      {error && <p className="px-3 pb-3 text-sm text-danger" role="alert">{error}</p>}
      {open && editable && (
        <form action={formAction} className="grid gap-4 border-t border-border p-4">
          <TrackFields genres={genres} defaults={track} fe={state.fieldErrors ?? {}} />
          <Feedback state={state} />
          <Button type="submit" size="sm" disabled={pending} className="w-fit">
            {pending ? "Saving…" : "Save track"}
          </Button>
        </form>
      )}
    </li>
  );
}

export function SubmitPanel({ action, problems }: { action: Action; problems: string[] }) {
  const [state, formAction, pending] = useActionState(action, {});
  useRefreshOnSuccess(state);
  return (
    <form action={formAction} className="grid gap-4">
      {problems.length > 0 && (
        <Alert tone="warning" title="Before you can submit">
          <ul className="list-disc pl-5">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Alert>
      )}
      <label className="flex items-start gap-2.5 text-sm text-muted">
        <input type="checkbox" name="rights" required className="mt-0.5 size-4 shrink-0 accent-primary" />
        <span>
          I confirm that I own, or am authorised by all rights holders to distribute, this music, its artwork and any
          samples, and I accept the{" "}
          <Link href="/legal/upload-terms" target="_blank" className="font-semibold text-primary hover:underline">
            Artist Upload Terms
          </Link>
          .
        </span>
      </label>
      <Feedback state={state} />
      <Button type="submit" disabled={pending || problems.length > 0} className="w-full sm:w-fit">
        {pending ? "Submitting…" : "Submit for review"}
      </Button>
    </form>
  );
}

export function WithdrawButton({ action }: { action: () => Promise<FormState> }) {
  const [busy, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={() =>
        start(async () => {
          await action();
          router.refresh();
        })
      }
    >
      {busy ? "Withdrawing…" : "Withdraw to make changes"}
    </Button>
  );
}
