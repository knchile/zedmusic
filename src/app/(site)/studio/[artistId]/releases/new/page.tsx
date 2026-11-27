import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { createReleaseAction } from "../../../release-actions";
import { ReleaseForm } from "@/components/studio/release-forms";
import { Skeleton } from "@/components/ui/primitives";
import { requireArtistPermission } from "@/lib/auth/session";
import { getStudioArtist } from "@/lib/data/studio";

export const metadata: Metadata = { title: "New release", robots: { index: false } };

export default function NewReleasePage({ params }: PageProps<"/studio/[artistId]/releases/new">) {
  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <Suspense fallback={<Skeleton className="h-[36rem]" />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}

async function Content({ params }: Pick<PageProps<"/studio/[artistId]/releases/new">, "params">) {
  const { artistId } = await params;
  if (!z.uuid().safeParse(artistId).success) notFound();
  await requireArtistPermission(artistId, "artist:upload");
  const artist = await getStudioArtist(artistId);
  if (!artist) notFound();
  return (
    <>
      <header className="grid gap-2">
        <Link href={`/studio/${artistId}`} className="text-sm text-muted hover:text-foreground">← {artist.name}</Link>
        <h1 className="font-display text-3xl font-bold">New release</h1>
        <p className="text-muted">Start with the release details. You&apos;ll add tracks on the next screen.</p>
      </header>
      <ReleaseForm action={createReleaseAction.bind(null, artistId)} artistId={artistId} submitLabel="Create release" />
    </>
  );
}
