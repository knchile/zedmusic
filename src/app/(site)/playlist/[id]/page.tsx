import { ListMusic } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { PlayAllButton } from "@/components/catalog/track-list";
import { ShareButton } from "@/components/social/buttons";
import { PlaylistOwnerControls } from "@/components/social/playlist-controls";
import { PlaylistTracks } from "@/components/social/playlist-tracks";
import { Badge, EmptyState, Skeleton } from "@/components/ui/primitives";
import { getCurrentUser } from "@/lib/auth/session";
import { getPlaylist } from "@/lib/catalog/social";
import { getPlayableTracks } from "@/lib/data/catalog";
import { formatDuration } from "@/lib/utils";

export const metadata: Metadata = { title: "Playlist" };

export default function PlaylistPage({ params }: PageProps<"/playlist/[id]">) {
  return (
    <div className="mx-auto grid max-w-5xl gap-8">
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}

async function Content({ params }: Pick<PageProps<"/playlist/[id]">, "params">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const user = await getCurrentUser();
  const data = await getPlaylist(id, user?.id ?? null);
  if (!data) notFound();
  const tracks = await getPlayableTracks(data.trackIds);
  const total = tracks.reduce((s, t) => s + t.durationMs, 0);
  const p = data.playlist;
  return (
    <>
      <header className="grid gap-3">
        <span className="grid size-28 place-items-center rounded-xl bg-gradient-to-br from-flag-green to-surface-3 shadow-xl shadow-black/40">
          <ListMusic className="size-10 text-white/80" aria-hidden />
        </span>
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">Playlist</p>
          <Badge>{p.isPublic ? "Public" : "Private"}</Badge>
        </div>
        <h1 className="font-display text-4xl font-extrabold break-words">{p.title}</h1>
        <p className="text-sm text-muted">
          {data.ownerName} · {tracks.length} song{tracks.length === 1 ? "" : "s"}
          {total > 0 && ` · ${formatDuration(total)}`}
        </p>
        {p.description && <p className="text-muted">{p.description}</p>}
      </header>
      <div className="flex flex-wrap items-center gap-3">
        <PlayAllButton tracks={tracks} context={`playlist:${p.id}`} />
        {p.isPublic && <ShareButton path={`/playlist/${p.id}`} title={p.title} />}
        {data.isOwner && <PlaylistOwnerControls id={p.id} title={p.title} isPublic={p.isPublic} />}
      </div>
      {tracks.length === 0 ? (
        <EmptyState icon={ListMusic} title="This playlist is empty">
          {data.isOwner ? "Use the add-to-playlist button on any song to add it here." : null}
        </EmptyState>
      ) : (
        <PlaylistTracks playlistId={p.id} tracks={tracks} isOwner={data.isOwner} />
      )}
    </>
  );
}
