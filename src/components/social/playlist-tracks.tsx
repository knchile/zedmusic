"use client";

import { TrackList } from "@/components/catalog/track-list";
import type { PlayableTrack } from "@/lib/types/catalog";
import { RemoveFromPlaylistButton } from "./playlist-controls";

/** Client wrapper so the owner-only remove button can be passed as a render prop. */
export function PlaylistTracks({ playlistId, tracks, isOwner }: { playlistId: string; tracks: PlayableTrack[]; isOwner: boolean }) {
  return (
    <TrackList
      tracks={tracks}
      context={`playlist:${playlistId}`}
      extraAction={isOwner ? (t) => <RemoveFromPlaylistButton playlistId={playlistId} trackId={t.id} title={t.title} /> : undefined}
    />
  );
}
