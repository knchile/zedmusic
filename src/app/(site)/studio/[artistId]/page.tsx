import { BadgeCheck, ExternalLink, Pencil, Plus, Upload } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { requestVerificationAction } from "../actions";
import { Artwork } from "@/components/catalog/artwork";
import { EvidenceForm } from "@/components/studio/request-forms";
import { PublicationBadge, VerifiedBadge, releaseTypeLabel } from "@/components/studio/status-badge";
import { Button } from "@/components/ui/button";
import { Alert, Card, EmptyState, Skeleton } from "@/components/ui/primitives";
import { canOnArtist } from "@/lib/auth/permissions";
import { getArtistAccess, requireArtistPermission } from "@/lib/auth/session";
import { getStudioArtist, latestVerificationRequest, listStudioReleases } from "@/lib/data/studio";
import { mediaUrl } from "@/lib/storage";

export const metadata: Metadata = { title: "Artist studio", robots: { index: false } };

export default function StudioArtistPage({ params, searchParams }: PageProps<"/studio/[artistId]">) {
  return (
    <div className="mx-auto grid max-w-5xl gap-8">
      <Suspense fallback={<Skeleton className="h-72" />}>
        <Content params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ params, searchParams }: Pick<PageProps<"/studio/[artistId]">, "params" | "searchParams">) {
  const { artistId } = await params;
  if (!z.uuid().safeParse(artistId).success) notFound();
  const user = await requireArtistPermission(artistId, "artist:view-studio");
  const { welcome } = await searchParams;
  const [artist, releases, access, verification] = await Promise.all([
    getStudioArtist(artistId),
    listStudioReleases(artistId),
    user.role === "admin" ? Promise.resolve({}) : getArtistAccess(user.id, artistId),
    latestVerificationRequest(artistId),
  ]);
  if (!artist) notFound();
  const canUpload = canOnArtist(user, "artist:upload", access);
  const canEdit = canOnArtist(user, "artist:edit-profile", access);
  const isOwner = canOnArtist(user, "artist:manage-members", access);
  const hasPublished = releases.some((r) => r.status === "published");

  return (
    <>
      {welcome === "1" && (
        <Alert tone="success" title="Your artist profile is ready">
          Add a photo and cover image, then upload your first release. Nothing is public until a release is approved.
        </Alert>
      )}

      <header className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Artwork src={mediaUrl(artist.avatarKey)} alt="" seed={artist.id} rounded="full" kind="artist" className="size-24 shrink-0" sizes="96px" />
        <div className="grid min-w-0 flex-1 gap-1">
          <Link href="/studio" className="text-sm text-muted hover:text-foreground">← All profiles</Link>
          <h1 className="flex items-center gap-2 font-display text-3xl font-bold sm:text-4xl">
            <span className="truncate">{artist.name}</span>
            {artist.verificationStatus === "verified" && <VerifiedBadge />}
          </h1>
          {artist.location && <p className="text-muted">{artist.location}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/studio/${artist.id}/profile`}>
                <Pencil /> Edit profile
              </Link>
            </Button>
          )}
          {hasPublished && (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/artist/${artist.slug}`}>
                <ExternalLink /> Public page
              </Link>
            </Button>
          )}
        </div>
      </header>

      <section aria-labelledby="releases" className="grid gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 id="releases" className="font-display text-2xl font-bold">Releases</h2>
          {canUpload && (
            <Button asChild size="sm">
              <Link href={`/studio/${artist.id}/releases/new`}>
                <Plus /> New release
              </Link>
            </Button>
          )}
        </div>
        {releases.length === 0 ? (
          <EmptyState
            icon={Upload}
            title="No releases yet"
            action={
              canUpload && (
                <Button asChild>
                  <Link href={`/studio/${artist.id}/releases/new`}>Upload your first release</Link>
                </Button>
              )
            }
          >
            Upload a single, EP or album. Each release is reviewed by our team before it goes live — usually within 2
            working days.
          </EmptyState>
        ) : (
          <ul className="grid gap-2">
            {releases.map((r) => (
              <li key={r.id}>
                <Link href={`/studio/${artist.id}/releases/${r.id}`}>
                  <Card className="flex items-center gap-4 p-3 transition hover:border-border-strong hover:bg-surface-2">
                    <Artwork src={mediaUrl(r.artworkKey)} alt="" seed={r.id} className="size-14 shrink-0" sizes="56px" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{r.title}</p>
                      <p className="text-sm text-muted">
                        {releaseTypeLabel[r.type]} · {r.trackCount} track{r.trackCount === 1 ? "" : "s"}
                        {r.releaseDate ? ` · ${r.releaseDate}` : ""}
                      </p>
                    </div>
                    <PublicationBadge status={r.status} />
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="analytics" className="grid gap-3">
        <h2 id="analytics" className="font-display text-2xl font-bold">Analytics</h2>
        <Card className="p-5 text-sm text-muted">
          Streaming statistics appear here once listeners start playing your published music. The analytics dashboard
          is being built in the next release.
        </Card>
      </section>

      {isOwner && artist.verificationStatus !== "verified" && (
        <section aria-labelledby="verify" className="grid gap-3">
          <h2 id="verify" className="flex items-center gap-2 font-display text-2xl font-bold">
            <BadgeCheck className="size-6 text-primary" aria-hidden /> Get verified
          </h2>
          {verification?.status === "pending" ? (
            <Alert tone="info" title="Verification request in review">
              Submitted {verification.createdAt.toLocaleDateString("en-ZM")}. We&apos;ll email you when it&apos;s reviewed.
            </Alert>
          ) : (
            <Card className="grid gap-4 p-5">
              {verification?.status === "rejected" && (
                <Alert tone="warning" title="Your last request wasn't approved">
                  {verification.reviewNote ?? "Please provide stronger evidence and try again."}
                </Alert>
              )}
              <p className="text-sm text-muted">
                A verified badge tells listeners this is the official profile. Our team checks your identity against
                official channels — it isn&apos;t automatic.
              </p>
              <EvidenceForm
                action={requestVerificationAction.bind(null, artist.id)}
                submitLabel="Request verification"
                messageLabel="How can we confirm you're the artist?"
              />
            </Card>
          )}
        </section>
      )}
    </>
  );
}
