"use client";

import { MoreHorizontal, Pause, Play } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCurrentTrack, usePlayerSelector } from "@/components/player/hooks";
import { player } from "@/components/player/store";
import { AddToPlaylistButton, LikeButton } from "@/components/social/buttons";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { PlayableTrack } from "@/lib/types/catalog";
import { cn, formatDuration } from "@/lib/utils";
import { Artwork } from "./artwork";

function Equalizer() {
  return (
    <span className="flex h-4 items-end gap-[2px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-[3px] animate-pulse rounded-sm bg-primary" style={{ height: `${[60, 100, 40][i]}%`, animationDelay: `${i * 150}ms` }} />
      ))}
    </span>
  );
}

/** Big "Play" button for a collection (release, artist top tracks, playlist). */
export function PlayAllButton({ tracks, context, label = "Play" }: { tracks: PlayableTrack[]; context: string; label?: string }) {
  const current = useCurrentTrack();
  const status = usePlayerSelector((s) => s.status);
  const ctx = usePlayerSelector((s) => s.context);
  const active = !!current && ctx === context && tracks.some((t) => t.id === current.id);
  const playing = active && (status === "playing" || status === "loading");
  return (
    <Button
      size="lg"
      disabled={tracks.length === 0}
      onClick={() => (active ? player.toggle() : player.playQueue(tracks, 0, context))}
      aria-label={playing ? "Pause" : label}
    >
      {playing ? <Pause className="fill-current" /> : <Play className="fill-current" />}
      {playing ? "Pause" : label}
    </Button>
  );
}

function RowMenu({ track }: { track: PlayableTrack }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const item = "flex h-10 w-full items-center rounded-md px-3 text-left text-sm hover:bg-surface-3";
  return (
    <div ref={ref} className="relative">
      <Button type="button" variant="ghost" size="icon" aria-label={`More options for ${track.title}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <MoreHorizontal />
      </Button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1 w-52 rounded-xl border border-border bg-surface-2 p-1.5 shadow-2xl shadow-black/50">
          <button role="menuitem" type="button" className={item} onClick={() => (player.playNext(track), setOpen(false), toast("Playing next"))}>
            Play next
          </button>
          <button role="menuitem" type="button" className={item} onClick={() => (player.addToQueue(track), setOpen(false), toast("Added to queue"))}>
            Add to queue
          </button>
          <Link role="menuitem" href={`/artist/${track.artistSlug}`} className={item}>
            Go to artist
          </Link>
          {track.releaseSlug && (
            <Link role="menuitem" href={`/release/${track.artistSlug}/${track.releaseSlug}`} className={item}>
              Go to release
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Track list with play/pause per row. Playing a row queues the whole list from
 * that row (so "next" continues through the album/playlist).
 */
export function TrackList({
  tracks,
  context,
  showArtwork = true,
  showNumbers = false,
  showArtist = true,
  extraAction,
}: {
  tracks: PlayableTrack[];
  context: string;
  showArtwork?: boolean;
  showNumbers?: boolean;
  showArtist?: boolean;
  extraAction?: (t: PlayableTrack) => React.ReactNode;
}) {
  const current = useCurrentTrack();
  const status = usePlayerSelector((s) => s.status);
  return (
    <ol className="grid">
      {tracks.map((t, i) => {
        const isCurrent = current?.id === t.id;
        const playing = isCurrent && (status === "playing" || status === "loading");
        return (
          <li
            key={`${t.id}-${i}`}
            className={cn("group grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-2", isCurrent && "bg-surface-2")}
          >
            <button
              type="button"
              onClick={() => (isCurrent ? player.toggle() : player.playQueue(tracks, i, context))}
              aria-label={playing ? `Pause ${t.title}` : `Play ${t.title}`}
              className="relative grid size-10 place-items-center"
            >
              {showArtwork ? (
                <>
                  <Artwork src={t.artworkUrl} alt="" seed={t.id} className="size-10" sizes="40px" />
                  <span className={cn("absolute inset-0 grid place-items-center rounded-md bg-black/55 opacity-0 transition group-hover:opacity-100", isCurrent && "opacity-100")}>
                    {playing ? <Pause className="size-4 fill-white text-white" /> : <Play className="size-4 fill-white text-white" />}
                  </span>
                </>
              ) : (
                <span className="text-sm text-muted tabular-nums">
                  <span className={cn("group-hover:hidden", isCurrent && "hidden")}>{showNumbers ? i + 1 : ""}</span>
                  <span className={cn("hidden group-hover:inline", isCurrent && "inline")}>
                    {playing ? <Equalizer /> : <Play className="size-4 fill-current" />}
                  </span>
                </span>
              )}
            </button>
            <div className="min-w-0">
              <Link href={`/track/${t.artistSlug}/${t.slug}`} className={cn("block truncate font-medium hover:underline", isCurrent && "text-primary")}>
                {t.title}
                {t.isExplicit && <span className="ml-2 rounded-sm bg-surface-3 px-1 text-[0.6rem] font-bold text-muted" title="Explicit">E</span>}
              </Link>
              {showArtist && (
                <Link href={`/artist/${t.artistSlug}`} className="block truncate text-sm text-muted hover:text-foreground hover:underline">
                  {t.artistName}
                  {t.featuring ? `, ${t.featuring}` : ""}
                </Link>
              )}
              {!showArtist && t.featuring && <p className="truncate text-sm text-muted">feat. {t.featuring}</p>}
            </div>
            <div className="flex items-center gap-0.5">
              <span className="hidden text-sm text-muted tabular-nums sm:inline">{formatDuration(t.durationMs)}</span>
              <LikeButton trackId={t.id} title={t.title} className="max-sm:hidden" />
              <AddToPlaylistButton trackId={t.id} title={t.title} className="max-sm:hidden" />
              {extraAction?.(t)}
              <RowMenu track={t} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
