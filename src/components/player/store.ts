"use client";

import type { PlayableTrack } from "@/lib/types/catalog";
import {
  type RepeatMode,
  currentIndex,
  cycleRepeat,
  identityOrder,
  nextPosition,
  previousPosition,
  shuffledOrder,
} from "./queue";

export type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "error";

export type PlayerState = {
  queue: PlayableTrack[];
  order: number[];
  position: number;
  status: PlayerStatus;
  error: string | null;
  currentTime: number;
  duration: number;
  buffered: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  expanded: boolean;
  /** Where playback started (e.g. "artist", "release", "search"); forwarded to analytics in Phase 3. */
  context: string | null;
};

const STORAGE_KEY = "zm:player:v1";

const initial: PlayerState = {
  queue: [],
  order: [],
  position: 0,
  status: "idle",
  error: null,
  currentTime: 0,
  duration: 0,
  buffered: 0,
  volume: 1,
  muted: false,
  shuffle: false,
  repeat: "off",
  expanded: false,
  context: null,
};

type Listener = () => void;

/**
 * Single audio engine for the whole app. Lives at module scope so playback
 * continues across client-side navigation. Uses one HTMLAudioElement; source URLs
 * are short-lived presigned URLs fetched per track and refreshed on expiry.
 */
class PlayerStore {
  private state: PlayerState = initial;
  private listeners = new Set<Listener>();
  private audio: HTMLAudioElement | null = null;
  private loadToken = 0;
  private urlExpiresAt = 0;
  private restoredTime = 0;
  private lastPersist = 0;

  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  getSnapshot = () => this.state;
  getServerSnapshot = () => initial;

  private set(patch: Partial<PlayerState>) {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l();
  }

  get current(): PlayableTrack | null {
    const i = currentIndex({ ...this.state, length: this.state.queue.length });
    return i == null ? null : (this.state.queue[i] ?? null);
  }

  /** Attach to the <audio> element rendered by the PlayerProvider. */
  attach(audio: HTMLAudioElement) {
    if (this.audio === audio) return;
    this.audio = audio;
    audio.preload = "metadata";
    audio.volume = this.state.volume;
    audio.muted = this.state.muted;
    audio.addEventListener("play", () => this.set({ status: "playing", error: null }));
    audio.addEventListener("playing", () => this.set({ status: "playing" }));
    audio.addEventListener("pause", () => this.state.status !== "loading" && this.set({ status: "paused" }));
    audio.addEventListener("waiting", () => this.set({ status: "loading" }));
    audio.addEventListener("timeupdate", () => {
      this.set({ currentTime: audio.currentTime });
      if (Date.now() - this.lastPersist > 5000) this.persist();
    });
    audio.addEventListener("durationchange", () => Number.isFinite(audio.duration) && this.set({ duration: audio.duration }));
    audio.addEventListener("progress", () => {
      const b = audio.buffered;
      if (b.length) this.set({ buffered: b.end(b.length - 1) });
    });
    audio.addEventListener("ended", () => this.advance("auto"));
    audio.addEventListener("error", () => void this.onError());
    this.restore();
  }

  // --- public actions -------------------------------------------------------

  /** Replace the queue and start playing at `startIndex`. */
  playQueue(tracks: PlayableTrack[], startIndex = 0, context: string | null = null) {
    if (tracks.length === 0) return;
    const start = Math.max(0, Math.min(startIndex, tracks.length - 1));
    const order = this.state.shuffle ? shuffledOrder(tracks.length, start) : identityOrder(tracks.length);
    this.set({ queue: tracks, order, position: this.state.shuffle ? 0 : start, context });
    void this.load(true);
  }

  /** Toggle play/pause; if the given track is already current, just toggles. */
  toggle() {
    const a = this.audio;
    if (!a || !this.current) return;
    if (a.paused) void this.resume();
    else a.pause();
  }

  isCurrent(trackId: string) {
    return this.current?.id === trackId;
  }

  next() {
    this.advance("manual");
  }

  previous() {
    const p = previousPosition(this.queueState(), this.audio?.currentTime ?? 0);
    if (p.restart) return this.seek(0);
    this.set({ position: p.position });
    void this.load(true);
  }

  seek(sec: number) {
    if (!this.audio) return;
    const d = this.state.duration || this.audio.duration || 0;
    this.audio.currentTime = Math.max(0, Math.min(sec, d || sec));
    this.set({ currentTime: this.audio.currentTime });
  }

  setVolume(v: number) {
    const volume = Math.max(0, Math.min(1, v));
    if (this.audio) {
      this.audio.volume = volume;
      this.audio.muted = volume === 0;
    }
    this.set({ volume, muted: volume === 0 });
    this.persist();
  }

  toggleMute() {
    const muted = !this.state.muted;
    if (this.audio) this.audio.muted = muted;
    this.set({ muted });
  }

  toggleShuffle() {
    const cur = currentIndex(this.queueState()) ?? 0;
    const shuffle = !this.state.shuffle;
    const order = shuffle ? shuffledOrder(this.state.queue.length, cur) : identityOrder(this.state.queue.length);
    this.set({ shuffle, order, position: shuffle ? 0 : cur });
    this.persist();
  }

  cycleRepeat() {
    this.set({ repeat: cycleRepeat(this.state.repeat) });
    this.persist();
  }

  /** Insert after the current track. */
  playNext(track: PlayableTrack) {
    if (!this.current) return this.playQueue([track]);
    const queue = [...this.state.queue, track];
    const newIdx = queue.length - 1;
    const order = [...this.state.order];
    order.splice(this.state.position + 1, 0, newIdx);
    this.set({ queue, order });
    this.persist();
  }

  addToQueue(track: PlayableTrack) {
    if (!this.current) return this.playQueue([track]);
    const queue = [...this.state.queue, track];
    this.set({ queue, order: [...this.state.order, queue.length - 1] });
    this.persist();
  }

  /** Remove the item at an order position (not the current one). */
  removeAt(position: number) {
    if (position === this.state.position) return;
    const idx = this.state.order[position];
    if (idx == null) return;
    const queue = this.state.queue.filter((_, i) => i !== idx);
    const order = this.state.order.filter((_, p) => p !== position).map((i) => (i > idx ? i - 1 : i));
    this.set({ queue, order, position: position < this.state.position ? this.state.position - 1 : this.state.position });
    this.persist();
  }

  jumpTo(position: number) {
    if (position < 0 || position >= this.state.order.length) return;
    this.set({ position });
    void this.load(true);
  }

  setExpanded(expanded: boolean) {
    this.set({ expanded });
  }

  clear() {
    this.audio?.pause();
    this.audio?.removeAttribute("src");
    this.set({ ...initial, volume: this.state.volume, muted: this.state.muted });
    this.persist();
  }

  // --- internals --------------------------------------------------------------

  private queueState() {
    return { length: this.state.queue.length, order: this.state.order, position: this.state.position, repeat: this.state.repeat };
  }

  private advance(trigger: "auto" | "manual") {
    const pos = nextPosition(this.queueState(), trigger);
    if (pos == null) {
      this.audio?.pause();
      this.seek(0);
      this.set({ status: "paused" });
      return;
    }
    if (pos === this.state.position && trigger === "auto") {
      this.seek(0);
      void this.resume();
      return;
    }
    this.set({ position: pos });
    void this.load(true);
  }

  private async fetchUrl(trackId: string) {
    const res = await fetch(`/api/play/${trackId}`, { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as { url?: string; expiresAt?: number; error?: string };
    if (!res.ok || !data.url) throw new Error(data.error ?? "This track can't be played right now.");
    return data as { url: string; expiresAt: number };
  }

  private async load(autoplay: boolean, startAt = 0) {
    const track = this.current;
    const a = this.audio;
    if (!track || !a) return;
    const token = ++this.loadToken;
    a.pause();
    this.set({ status: "loading", error: null, currentTime: startAt, duration: track.durationMs / 1000, buffered: 0 });
    this.updateMediaSession(track);
    try {
      const { url, expiresAt } = await this.fetchUrl(track.id);
      if (token !== this.loadToken) return; // a newer load started
      this.urlExpiresAt = expiresAt;
      a.src = url;
      if (startAt > 0) a.currentTime = startAt;
      if (autoplay) await this.resume();
      else this.set({ status: "paused" });
      this.persist();
    } catch (err) {
      if (token !== this.loadToken) return;
      this.set({ status: "error", error: (err as Error).message });
    }
  }

  private async resume() {
    const a = this.audio;
    if (!a) return;
    if (!a.src) return this.load(true, this.restoredTime);
    // Presigned URL about to expire: refresh it and continue from the same position.
    if (this.urlExpiresAt && Date.now() > this.urlExpiresAt - 60_000) return this.load(true, a.currentTime);
    try {
      await a.play();
    } catch (err) {
      // Autoplay restrictions (e.g. iOS before a user gesture) — stay paused, user can press play.
      if ((err as DOMException).name === "NotAllowedError") this.set({ status: "paused" });
      else if ((err as DOMException).name !== "AbortError") this.set({ status: "error", error: "Playback failed. Please try again." });
    }
  }

  private async onError() {
    const a = this.audio;
    if (!a?.src) return;
    // Most errors mid-play are expired/network URLs: retry once from the current position.
    if (this.state.status !== "error" && this.current) {
      const at = a.currentTime;
      await this.load(this.state.status === "playing" || this.state.status === "loading", at);
    }
  }

  private updateMediaSession(track: PlayableTrack) {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artistName,
      album: track.releaseTitle ?? "",
      artwork: track.artworkUrl
        ? [{ src: new URL(track.artworkUrl, location.origin).toString(), sizes: "512x512" }]
        : [{ src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }],
    });
  }

  registerMediaSessionHandlers() {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => void this.resume()],
      ["pause", () => this.audio?.pause()],
      ["nexttrack", () => this.next()],
      ["previoustrack", () => this.previous()],
      ["seekto", (d) => d.seekTime != null && this.seek(d.seekTime)],
      ["seekbackward", (d) => this.seek((this.audio?.currentTime ?? 0) - (d.seekOffset ?? 10))],
      ["seekforward", (d) => this.seek((this.audio?.currentTime ?? 0) + (d.seekOffset ?? 10))],
    ];
    for (const [action, h] of handlers) {
      try {
        ms.setActionHandler(action, h);
      } catch {
        /* unsupported action */
      }
    }
  }

  private persist() {
    this.lastPersist = Date.now();
    try {
      const { queue, order, position, volume, shuffle, repeat, currentTime, context } = this.state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ queue: queue.slice(0, 200), order, position, volume, shuffle, repeat, currentTime, context }));
    } catch {
      /* storage unavailable (private mode) */
    }
  }

  private restore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as Partial<PlayerState>;
      if (!Array.isArray(s.queue) || !Array.isArray(s.order)) return;
      const valid = s.order.length === s.queue.length && s.order.every((i) => typeof i === "number" && i >= 0 && i < s.queue!.length);
      if (!valid) return;
      this.restoredTime = typeof s.currentTime === "number" ? s.currentTime : 0;
      const volume = typeof s.volume === "number" ? Math.max(0, Math.min(1, s.volume)) : 1;
      if (this.audio) this.audio.volume = volume;
      this.set({
        queue: s.queue,
        order: s.order,
        position: Math.min(Math.max(0, s.position ?? 0), s.order.length - 1),
        volume,
        shuffle: !!s.shuffle,
        repeat: s.repeat === "all" || s.repeat === "one" ? s.repeat : "off",
        currentTime: this.restoredTime,
        context: s.context ?? null,
        status: s.queue.length ? "paused" : "idle",
      });
    } catch {
      /* ignore corrupt state */
    }
  }
}

export const player = new PlayerStore();
