import { inArray } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import {
  addTrackAction,
  deleteTrackAction,
  moveTrackAction,
  submitReleaseAction,
  updateReleaseAction,
  updateTrackAction,
  withdrawReleaseAction,
} from "../../../release-actions";
import { Artwork } from "@/components/catalog/artwork";
import { AddTrackForm, ReleaseForm, SubmitPanel, TrackRow, WithdrawButton } from "@/components/studio/release-forms";
import { PublicationBadge, releaseTypeLabel } from "@/components/studio/status-badge";
import { Alert, Card, Skeleton } from "@/components/ui/primitives";
import { getDb, schema } from "@/db";
import { canOnArtist } from "@/lib/auth/permissions";
import { getArtistAccess, requireArtistPermission } from "@/lib/auth/session";
import { MAX_TRACKS, isEditable, submissionProblems } from "@/lib/catalog/releases";
import { getActiveGenres } from "@/lib/data/public";
import { getStudioArtist, getStudioRelease } from "@/lib/data/studio";
import { mediaUrl } from "@/lib/storage";

export const metadata: Metadata = { title: "Manage release", robots: { index: false } };

type Props = PageProps<"/studio/[artistId]/releases/[releaseId]">;

export default function ReleasePage({ params }: Props) {
  return (
    <div className="mx-auto grid max-w-4xl gap-8">
      <Suspense fallback={<Skeleton className="h-[40rem]" />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}

async function Content({ params }: Pick<Props, "params">) {
  const { artistId, releaseId } = await params;
  if (!z.uuid().safeParse(artistId).success || !z.uuid().safeParse(releaseId).success) notFound();
  const user = await requireArtistPermission(artistId, "artist:view-studio");
  const [artist, data, genres, access] = await Promise.all([
    getStudioArtist(artistId),
    getStudioRelease(artistId, releaseId),
    getActiveGenres(),
    user.role === "admin" ? Promise.resolve({}) : getArtistAccess(user.id, artistId),
  ]);
  if (!artist || !data) notFound();
  const { release, tracks, submissions } = data;

  const credits = tracks.length
    ? await getDb().select().from(schema.trackCredits).where(inArray(schema.trackCredits.trackId, tracks.map((t) => t.id)))
    : [];
  const creditString = (trackId: string, role: "producer" | "composer") =>
    credits
      .filter((c) => c.trackId === trackId && c.role === role)
      .sort((a, b) => a.position - b.position)
      .map((c) => c.name)
      .join(", ");

  const canUpload = canOnArtist(user, "artist:upload", access);
  const canSubmit = canOnArtist(user, "artist:submit-for-review", access);
  const editable = isEditable(release.status) && canUpload;
  const problems = submissionProblems(release, tracks.length);
  const lastReview = submissions.find((s) => s.status === "rejected" || s.status === "changes_requested");

  return (
    <>
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end">
        <Artwork src={mediaUrl(release.artworkKey)} alt="" seed={release.id} className="size-36 shrink-0 shadow-xl shadow-black/40" sizes="144px" />
        <div className="grid min-w-0 gap-2">
          <Link href={`/studio/${artist.id}`} className="text-sm text-muted hover:text-foreground">← {artist.name}</Link>
          <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">{releaseTypeLabel[release.type]}</p>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">{release.title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <PublicationBadge status={release.status} />
            {release.releaseDate && <span>Release date {release.releaseDate}</span>}
          </div>
        </div>
      </header>

      {release.status === "pending_review" && (
        <Alert tone="info" title="In review">
          <div className="grid gap-3">
            <p>Our team is reviewing this release. You&apos;ll get an email when it&apos;s approved or if changes are needed.</p>
            {canSubmit && <div><WithdrawButton action={withdrawReleaseAction.bind(null, artistId, releaseId)} /></div>}
          </div>
        </Alert>
      )}
      {release.status === "rejected" && (
        <Alert tone="warning" title="Changes needed">
          {lastReview?.reviewNote ?? "Please review your release details and resubmit."}
        </Alert>
      )}
      {release.status === "published" && (
        <Alert tone="success" title="Published">
          This release is live.{" "}
          <Link className="font-semibold text-primary" href={`/release/${artist.slug}/${release.slug}`}>View it</Link>. To change a
          published release, contact support.
        </Alert>
      )}

      <section aria-labelledby="tracks" className="grid gap-4">
        <h2 id="tracks" className="font-display text-2xl font-bold">
          Tracks <span className="text-base font-normal text-muted">({tracks.length}/{MAX_TRACKS[release.type]})</span>
        </h2>
        {tracks.length > 0 ? (
          <ol className="grid gap-2">
            {tracks.map((t, i) => (
              <TrackRow
                key={t.id}
                track={{ ...t, producer: creditString(t.id, "producer"), composer: creditString(t.id, "composer") }}
                genres={genres}
                editable={editable}
                isFirst={i === 0}
                isLast={i === tracks.length - 1}
                updateAction={updateTrackAction.bind(null, artistId, t.id)}
                deleteAction={deleteTrackAction.bind(null, artistId, t.id)}
                moveAction={moveTrackAction.bind(null, artistId, t.id)}
              />
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted">No tracks yet.</p>
        )}
        {editable && tracks.length < MAX_TRACKS[release.type] && (
          <Card className="grid gap-4 p-5">
            <h3 className="font-display text-lg font-semibold">Add a track</h3>
            <AddTrackForm action={addTrackAction.bind(null, artistId, releaseId)} artistId={artistId} genres={genres} />
          </Card>
        )}
      </section>

      {editable && (
        <section aria-labelledby="details" className="grid gap-4">
          <h2 id="details" className="font-display text-2xl font-bold">Release details</h2>
          <Card className="p-5">
            <ReleaseForm
              action={updateReleaseAction.bind(null, artistId, releaseId)}
              artistId={artistId}
              submitLabel="Save details"
              defaults={{ ...release, artworkUrl: mediaUrl(release.artworkKey) }}
            />
          </Card>
        </section>
      )}

      {editable && canSubmit && (
        <section aria-labelledby="submit" className="grid gap-4">
          <h2 id="submit" className="font-display text-2xl font-bold">Submit for review</h2>
          <Card className="p-5">
            <SubmitPanel action={submitReleaseAction.bind(null, artistId, releaseId)} problems={problems} />
          </Card>
        </section>
      )}
    </>
  );
}
