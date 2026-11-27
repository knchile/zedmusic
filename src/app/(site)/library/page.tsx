import { Heart, ListMusic } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArtistGrid } from "@/components/catalog/cards";
import { PlayAllButton, TrackList } from "@/components/catalog/track-list";
import { CreatePlaylistForm } from "@/components/social/playlist-controls";
import { Card, EmptyState, Skeleton } from "@/components/ui/primitives";
import { requireUser } from "@/lib/auth/session";
import { listFollowedArtists, listLikedTrackIds, listMyPlaylists } from "@/lib/catalog/social";
import { getPlayableTracks } from "@/lib/data/catalog";
import { mediaUrl } from "@/lib/storage";

export const metadata: Metadata = { title: "Your library", robots: { index: false } };

export default function LibraryPage() {
  return (
    <div className="mx-auto grid max-w-6xl gap-10">
      <h1 className="font-display text-4xl font-extrabold">Your library</h1>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const user = await requireUser("/library");
  const [likedIds, playlists, artists] = await Promise.all([listLikedTrackIds(user.id), listMyPlaylists(user.id), listFollowedArtists(user.id)]);
  const liked = await getPlayableTracks(likedIds);
  return (
    <>
      <section aria-labelledby="playlists" className="grid gap-4">
        <h2 id="playlists" className="font-display text-2xl font-bold">Playlists</h2>
        <div className="max-w-md"><CreatePlaylistForm /></div>
        {playlists.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {playlists.map((p) => (
              <li key={p.id}>
                <Link href={`/playlist/${p.id}`}>
                  <Card className="flex items-center gap-3 p-3 transition hover:border-border-strong hover:bg-surface-2">
                    <span className="grid size-12 shrink-0 place-items-center rounded-md bg-gradient-to-br from-flag-green to-surface-3">
                      <ListMusic className="size-5 text-white/80" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{p.title}</span>
                      <span className="block text-xs text-muted">{p.tracks} song{p.tracks === 1 ? "" : "s"} · {p.isPublic ? "Public" : "Private"}</span>
                    </span>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="liked" className="grid gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 id="liked" className="font-display text-2xl font-bold">Liked songs</h2>
          {liked.length > 0 && <PlayAllButton tracks={liked} context="liked" />}
        </div>
        {liked.length === 0 ? (
          <EmptyState icon={Heart} title="No liked songs yet">Tap the heart on any song to save it here.</EmptyState>
        ) : (
          <TrackList tracks={liked} context="liked" />
        )}
      </section>

      <section aria-labelledby="following" className="grid gap-4">
        <h2 id="following" className="font-display text-2xl font-bold">Artists you follow</h2>
        {artists.length === 0 ? (
          <p className="text-sm text-muted">You&apos;re not following anyone yet. <Link href="/artists" className="font-semibold text-primary">Discover artists</Link>.</p>
        ) : (
          <ArtistGrid
            artists={artists.map((a) => ({ id: a.id, slug: a.slug, name: a.name, location: null, avatarUrl: mediaUrl(a.avatarKey), verified: a.verificationStatus === "verified" }))}
          />
        )}
      </section>
    </>
  );
}
