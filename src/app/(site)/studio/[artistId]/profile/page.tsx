import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { updateArtistAction } from "../../actions";
import { ArtistProfileForm } from "@/components/studio/artist-profile-form";
import { Skeleton } from "@/components/ui/primitives";
import { requireArtistPermission } from "@/lib/auth/session";
import { getActiveGenres } from "@/lib/data/public";
import { getStudioArtist } from "@/lib/data/studio";
import { mediaUrl } from "@/lib/storage";

export const metadata: Metadata = { title: "Edit artist profile", robots: { index: false } };

export default function EditProfilePage({ params }: PageProps<"/studio/[artistId]/profile">) {
  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <Suspense fallback={<Skeleton className="h-[40rem]" />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}

async function Content({ params }: Pick<PageProps<"/studio/[artistId]/profile">, "params">) {
  const { artistId } = await params;
  if (!z.uuid().safeParse(artistId).success) notFound();
  await requireArtistPermission(artistId, "artist:edit-profile");
  const [artist, genres] = await Promise.all([getStudioArtist(artistId), getActiveGenres()]);
  if (!artist) notFound();
  return (
    <>
      <header className="grid gap-2">
        <Link href={`/studio/${artist.id}`} className="text-sm text-muted hover:text-foreground">← {artist.name}</Link>
        <h1 className="font-display text-3xl font-bold">Edit profile</h1>
      </header>
      <ArtistProfileForm
        mode="edit"
        action={updateArtistAction.bind(null, artist.id)}
        genres={genres}
        defaults={{
          id: artist.id,
          name: artist.name,
          bio: artist.bio,
          location: artist.location,
          primaryGenreId: artist.primaryGenreId,
          socialLinks: artist.socialLinks,
          avatarUrl: mediaUrl(artist.avatarKey),
          coverUrl: mediaUrl(artist.coverKey),
        }}
      />
    </>
  );
}
