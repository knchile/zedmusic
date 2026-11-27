"use client";

import { ChevronDown, ListMusic, Volume1, Volume2, VolumeX, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Artwork } from "@/components/catalog/artwork";
import { AddToPlaylistButton, LikeButton, ShareButton } from "@/components/social/buttons";
import { Toaster } from "@/components/ui/toast";
import { cn, formatDuration } from "@/lib/utils";
import { PlayPauseButton, SeekBar, TransportControls } from "./controls";
import { useCurrentTrack, usePlayer, usePlayerSelector } from "./hooks";
import { player } from "./store";

/**
 * Mounted once in the (site) layout. Owns the single <audio> element, global
 * keyboard shortcuts and Media Session integration, and renders the player UI.
 */
export function PlayerProvider() {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) player.attach(audioRef.current);
    player.registerMediaSessionHandlers();
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, [contenteditable=true]") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === "Space" && !el.closest("button, a")) {
        e.preventDefault();
        player.toggle();
      } else if (e.shiftKey && e.key === "N") player.next();
      else if (e.shiftKey && e.key === "P") player.previous();
      else if (e.key === "Escape") player.setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {/* playsInline keeps iOS from forcing fullscreen; no `controls` — we render our own. */}
      <audio ref={audioRef} playsInline />
      <PlayerBar />
      <ExpandedPlayer />
      <Toaster />
    </>
  );
}

function VolumeControl() {
  const volume = usePlayerSelector((s) => s.volume);
  const muted = usePlayerSelector((s) => s.muted);
  const Icon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => player.toggleMute()} aria-label={muted ? "Unmute" : "Mute"} className="grid size-9 place-items-center text-muted hover:text-foreground">
        <Icon className="size-[18px]" aria-hidden />
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={muted ? 0 : volume}
        onChange={(e) => player.setVolume(Number(e.target.value))}
        aria-label="Volume"
        className="h-1 w-24 cursor-pointer accent-foreground"
      />
    </div>
  );
}

function TrackMeta({ compact = false }: { compact?: boolean }) {
  const track = useCurrentTrack();
  if (!track) return null;
  return (
    <div className="min-w-0">
      <Link href={`/track/${track.artistSlug}/${track.slug}`} className={cn("block truncate font-semibold hover:underline", compact ? "text-sm" : "text-base")}>
        {track.title}
      </Link>
      <Link href={`/artist/${track.artistSlug}`} className="block truncate text-xs text-muted hover:text-foreground hover:underline">
        {track.artistName}
        {track.featuring ? `, ${track.featuring}` : ""}
      </Link>
    </div>
  );
}

function ErrorLine() {
  const error = usePlayerSelector((s) => s.error);
  if (!error) return null;
  return (
    <p role="alert" className="truncate text-xs text-danger">
      {error}
    </p>
  );
}

function PlayerBar() {
  const track = useCurrentTrack();
  const progress = usePlayerSelector((s) => (s.duration ? s.currentTime / s.duration : 0));
  const [queueOpen, setQueueOpen] = useState(false);
  if (!track) return null;
  return (
    <>
      {/* Mobile compact player — sits above the tab bar */}
      <div className="fixed inset-x-2 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 lg:hidden">
        <div className="relative overflow-hidden rounded-xl border border-border bg-surface-3/95 shadow-2xl shadow-black/60 backdrop-blur-xl">
          <div className="flex items-center gap-3 p-2 pr-3">
            <button type="button" onClick={() => player.setExpanded(true)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label="Open player">
              <Artwork src={track.artworkUrl} alt="" seed={track.id} className="size-11 shrink-0" sizes="44px" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{track.title}</span>
                <span className="block truncate text-xs text-muted">{track.artistName}</span>
              </span>
            </button>
            <LikeButton trackId={track.id} title={track.title} />
            <PlayPauseButton />
          </div>
          <div className="absolute inset-x-2 bottom-0 h-0.5 bg-white/10">
            <div className="h-full bg-primary" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Desktop player bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 hidden border-t border-border bg-background/95 backdrop-blur-xl lg:block" role="region" aria-label="Player">
        <div className="grid h-24 grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] items-center gap-6 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Artwork src={track.artworkUrl} alt="" seed={track.id} className="size-14 shrink-0" sizes="56px" />
            <TrackMeta />
            <LikeButton trackId={track.id} title={track.title} />
          </div>
          <div className="grid gap-1">
            <TransportControls />
            <SeekBar className="mx-auto max-w-2xl" />
            <ErrorLine />
          </div>
          <div className="flex items-center justify-end gap-1">
            <AddToPlaylistButton trackId={track.id} title={track.title} />
            <ShareButton path={`/track/${track.artistSlug}/${track.slug}`} title={`${track.title} — ${track.artistName}`} />
            <button
              type="button"
              aria-label="Queue"
              aria-pressed={queueOpen}
              onClick={() => setQueueOpen((v) => !v)}
              className={cn("grid size-10 place-items-center rounded-full text-muted hover:text-foreground", queueOpen && "text-primary")}
            >
              <ListMusic className="size-[18px]" aria-hidden />
            </button>
            <VolumeControl />
          </div>
        </div>
        {queueOpen && (
          <div className="absolute right-4 bottom-full mb-2 w-96">
            <QueuePanel onClose={() => setQueueOpen(false)} />
          </div>
        )}
      </div>
    </>
  );
}

function QueuePanel({ onClose }: { onClose?: () => void }) {
  const s = usePlayer();
  const items = s.order.map((idx, pos) => ({ pos, track: s.queue[idx]! })).filter((x) => x.track);
  return (
    <div className="grid max-h-[60vh] grid-rows-[auto_1fr] overflow-hidden rounded-xl border border-border bg-surface-2 shadow-2xl shadow-black/60">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-display font-semibold">Queue</h2>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => player.clear()} className="text-xs text-muted hover:text-foreground">
            Clear
          </button>
          {onClose && (
            <button type="button" onClick={onClose} aria-label="Close queue" className="text-muted hover:text-foreground">
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>
      <ol className="overflow-y-auto p-1.5">
        {items.map(({ pos, track }) => (
          <li key={`${pos}-${track.id}`} className={cn("group flex items-center gap-3 rounded-md px-2 py-1.5", pos === s.position && "bg-surface-3")}>
            <button type="button" onClick={() => player.jumpTo(pos)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <Artwork src={track.artworkUrl} alt="" seed={track.id} className="size-9 shrink-0" sizes="36px" />
              <span className="min-w-0">
                <span className={cn("block truncate text-sm", pos === s.position && "font-semibold text-primary")}>{track.title}</span>
                <span className="block truncate text-xs text-muted">{track.artistName}</span>
              </span>
            </button>
            <span className="text-xs text-muted tabular-nums">{formatDuration(track.durationMs)}</span>
            {pos !== s.position && (
              <button type="button" onClick={() => player.removeAt(pos)} aria-label={`Remove ${track.title} from queue`} className="text-muted opacity-0 group-hover:opacity-100 focus:opacity-100">
                <X className="size-4" />
              </button>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Full-screen player for phones. */
function ExpandedPlayer() {
  const expanded = usePlayerSelector((s) => s.expanded);
  const track = useCurrentTrack();
  const [showQueue, setShowQueue] = useState(false);
  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [expanded]);
  if (!expanded || !track) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="Now playing" className="fixed inset-0 z-50 flex flex-col bg-background lg:hidden">
      <div
        className="absolute inset-0 opacity-60"
        style={{ background: "radial-gradient(80% 50% at 50% 0%, color-mix(in srgb, var(--flag-green) 45%, transparent), transparent)" }}
        aria-hidden
      />
      <div className="relative flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button type="button" onClick={() => player.setExpanded(false)} aria-label="Close player" className="grid size-11 place-items-center rounded-full text-foreground">
          <ChevronDown className="size-7" />
        </button>
        <p className="truncate text-xs font-semibold tracking-wider text-muted uppercase">{track.releaseTitle ?? "Now playing"}</p>
        <button type="button" onClick={() => setShowQueue((v) => !v)} aria-label="Queue" aria-pressed={showQueue} className={cn("grid size-11 place-items-center rounded-full", showQueue ? "text-primary" : "text-foreground")}>
          <ListMusic className="size-6" />
        </button>
      </div>
      <div className="relative flex flex-1 flex-col justify-center gap-8 overflow-y-auto px-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
        {showQueue ? (
          <QueuePanel />
        ) : (
          <Artwork src={track.artworkUrl} alt={`${track.title} artwork`} seed={track.id} className="mx-auto w-full max-w-sm shadow-2xl shadow-black/60" sizes="(max-width: 640px) 90vw, 384px" priority />
        )}
        <div className="grid gap-5">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1" onClick={() => player.setExpanded(false)}>
              <TrackMeta />
            </div>
            <LikeButton trackId={track.id} title={track.title} />
          </div>
          <SeekBar />
          <ErrorLine />
          <TransportControls large />
          <div className="flex items-center justify-between">
            <AddToPlaylistButton trackId={track.id} title={track.title} align="left" />
            <ShareButton path={`/track/${track.artistSlug}/${track.slug}`} title={`${track.title} — ${track.artistName}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
