/**
 * Pure queue logic for the player (unit-tested). The queue keeps the original
 * order; when shuffle is on, `order` is a permutation of queue indexes and
 * `position` points into it.
 */

export type RepeatMode = "off" | "all" | "one";

export type QueueState = {
  length: number;
  order: number[];
  position: number;
  repeat: RepeatMode;
};

export function identityOrder(n: number) {
  return Array.from({ length: n }, (_, i) => i);
}

/** Fisher–Yates shuffle that keeps `first` at the front (the currently playing track). */
export function shuffledOrder(n: number, first: number, random: () => number = Math.random) {
  const rest = identityOrder(n).filter((i) => i !== first);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [rest[i], rest[j]] = [rest[j]!, rest[i]!];
  }
  return first >= 0 && first < n ? [first, ...rest] : rest;
}

export function currentIndex(s: QueueState): number | null {
  return s.length === 0 ? null : (s.order[s.position] ?? null);
}

/**
 * Position after the current track ends (auto) or the user presses next (manual).
 * Returns null when playback should stop.
 */
export function nextPosition(s: QueueState, trigger: "auto" | "manual"): number | null {
  if (s.length === 0) return null;
  if (trigger === "auto" && s.repeat === "one") return s.position;
  if (s.position + 1 < s.order.length) return s.position + 1;
  return s.repeat === "all" || (trigger === "manual" && s.repeat === "one") ? 0 : null;
}

/** "Previous": restart the current track if more than 3s in, otherwise go back. */
export function previousPosition(s: QueueState, currentTimeSec: number): { position: number; restart: boolean } {
  if (currentTimeSec > 3 || s.length === 0) return { position: s.position, restart: true };
  if (s.position > 0) return { position: s.position - 1, restart: false };
  return s.repeat === "all" ? { position: s.order.length - 1, restart: false } : { position: 0, restart: true };
}

export function cycleRepeat(r: RepeatMode): RepeatMode {
  return r === "off" ? "all" : r === "all" ? "one" : "off";
}
