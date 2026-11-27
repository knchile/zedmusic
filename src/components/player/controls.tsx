"use client";

import { Loader2, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from "lucide-react";
import { useState } from "react";
import { cn, formatDuration } from "@/lib/utils";
import { usePlayerSelector } from "./hooks";
import { player } from "./store";

export function PlayPauseButton({ className, size = "md" }: { className?: string; size?: "md" | "lg" }) {
  const status = usePlayerSelector((s) => s.status);
  const playing = status === "playing";
  const loading = status === "loading";
  return (
    <button
      type="button"
      onClick={() => player.toggle()}
      aria-label={playing ? "Pause" : "Play"}
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-foreground text-background transition hover:scale-105 active:scale-95",
        size === "lg" ? "size-16" : "size-10",
        className,
      )}
    >
      {loading ? (
        <Loader2 className={cn("animate-spin", size === "lg" ? "size-7" : "size-5")} aria-hidden />
      ) : playing ? (
        <Pause className={cn("fill-current", size === "lg" ? "size-7" : "size-5")} aria-hidden />
      ) : (
        <Play className={cn("translate-x-px fill-current", size === "lg" ? "size-7" : "size-5")} aria-hidden />
      )}
    </button>
  );
}

const iconBtn = "grid size-10 shrink-0 place-items-center rounded-full text-muted transition hover:text-foreground disabled:opacity-40";

export function TransportControls({ large = false }: { large?: boolean }) {
  const shuffle = usePlayerSelector((s) => s.shuffle);
  const repeat = usePlayerSelector((s) => s.repeat);
  const hasQueue = usePlayerSelector((s) => s.queue.length > 0);
  const RepeatIcon = repeat === "one" ? Repeat1 : Repeat;
  const iconSize = large ? "size-6" : "size-[18px]";
  return (
    <div className={cn("flex items-center justify-center", large ? "gap-5" : "gap-2")}>
      <button type="button" className={cn(iconBtn, shuffle && "text-primary hover:text-primary")} aria-pressed={shuffle} aria-label="Shuffle" onClick={() => player.toggleShuffle()} disabled={!hasQueue}>
        <Shuffle className={iconSize} aria-hidden />
      </button>
      <button type="button" className={cn(iconBtn, "text-foreground")} aria-label="Previous" onClick={() => player.previous()} disabled={!hasQueue}>
        <SkipBack className={cn(iconSize, "fill-current")} aria-hidden />
      </button>
      <PlayPauseButton size={large ? "lg" : "md"} />
      <button type="button" className={cn(iconBtn, "text-foreground")} aria-label="Next" onClick={() => player.next()} disabled={!hasQueue}>
        <SkipForward className={cn(iconSize, "fill-current")} aria-hidden />
      </button>
      <button
        type="button"
        className={cn(iconBtn, repeat !== "off" && "text-primary hover:text-primary")}
        aria-label={repeat === "off" ? "Repeat: off" : repeat === "all" ? "Repeat: all" : "Repeat: one"}
        onClick={() => player.cycleRepeat()}
        disabled={!hasQueue}
      >
        <RepeatIcon className={iconSize} aria-hidden />
      </button>
    </div>
  );
}

/** Accessible seek bar (native range input) with elapsed/total times. */
export function SeekBar({ className }: { className?: string }) {
  const currentTime = usePlayerSelector((s) => s.currentTime);
  const duration = usePlayerSelector((s) => s.duration);
  const buffered = usePlayerSelector((s) => s.buffered);
  const [drag, setDrag] = useState<number | null>(null);
  const value = drag ?? currentTime;
  const max = duration || 0;
  const pct = max ? (value / max) * 100 : 0;
  const bufPct = max ? Math.min(100, (buffered / max) * 100) : 0;
  return (
    <div className={cn("flex w-full items-center gap-3 text-[0.7rem] text-muted tabular-nums", className)}>
      <span className="w-10 text-right">{formatDuration(value * 1000)}</span>
      <div className="group relative flex h-4 flex-1 items-center">
        <div className="absolute inset-x-0 h-1 overflow-hidden rounded-full bg-surface-3">
          <div className="absolute inset-y-0 left-0 bg-border-strong" style={{ width: `${bufPct}%` }} />
          <div className="absolute inset-y-0 left-0 bg-foreground group-hover:bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <input
          type="range"
          min={0}
          max={max || 1}
          step={0.1}
          value={Math.min(value, max || 1)}
          aria-label="Seek"
          aria-valuetext={`${formatDuration(value * 1000)} of ${formatDuration(max * 1000)}`}
          onChange={(e) => setDrag(Number(e.target.value))}
          onPointerUp={() => {
            if (drag != null) player.seek(drag);
            setDrag(null);
          }}
          onKeyUp={() => {
            if (drag != null) player.seek(drag);
            setDrag(null);
          }}
          className="absolute inset-0 w-full cursor-pointer opacity-0"
          disabled={!max}
        />
      </div>
      <span className="w-10">{formatDuration(max * 1000)}</span>
    </div>
  );
}
