"use client";

import { useSyncExternalStore } from "react";
import { type PlayerState, player } from "./store";

export function usePlayer(): PlayerState {
  return useSyncExternalStore(player.subscribe, player.getSnapshot, player.getServerSnapshot);
}

/** Subscribe to a derived value only (avoids re-rendering on every timeupdate). */
export function usePlayerSelector<T>(select: (s: PlayerState) => T): T {
  return useSyncExternalStore(
    player.subscribe,
    () => select(player.getSnapshot()),
    () => select(player.getServerSnapshot()),
  );
}

export function useCurrentTrack() {
  return usePlayerSelector((s) => {
    const i = s.order[s.position];
    return i == null ? null : (s.queue[i] ?? null);
  });
}
