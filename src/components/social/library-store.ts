"use client";

import { useEffect, useSyncExternalStore } from "react";

export type LibraryState = {
  loaded: boolean;
  signedIn: boolean;
  liked: Set<string>;
  following: Set<string>;
  playlists: { id: string; title: string }[];
};

const initial: LibraryState = { loaded: false, signedIn: false, liked: new Set(), following: new Set(), playlists: [] };

/** Client cache of the viewer's personal library, loaded once from /api/me/state. */
class LibraryStore {
  private state = initial;
  private listeners = new Set<() => void>();
  private loading: Promise<void> | null = null;

  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  getSnapshot = () => this.state;
  getServerSnapshot = () => initial;

  set(patch: Partial<LibraryState>) {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l();
  }

  load(force = false) {
    if (this.loading && !force) return this.loading;
    this.loading = fetch("/api/me/state", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { signedIn: boolean; likedTrackIds?: string[]; followedArtistIds?: string[]; playlists?: { id: string; title: string }[] }) =>
        this.set({
          loaded: true,
          signedIn: d.signedIn,
          liked: new Set(d.likedTrackIds ?? []),
          following: new Set(d.followedArtistIds ?? []),
          playlists: d.playlists ?? [],
        }),
      )
      .catch(() => this.set({ loaded: true }));
    return this.loading;
  }

  setLiked(id: string, on: boolean) {
    const liked = new Set(this.state.liked);
    if (on) liked.add(id);
    else liked.delete(id);
    this.set({ liked });
  }

  setFollowing(id: string, on: boolean) {
    const following = new Set(this.state.following);
    if (on) following.add(id);
    else following.delete(id);
    this.set({ following });
  }
}

export const library = new LibraryStore();

export function useLibrary() {
  const state = useSyncExternalStore(library.subscribe, library.getSnapshot, library.getServerSnapshot);
  useEffect(() => {
    void library.load();
  }, []);
  return state;
}
