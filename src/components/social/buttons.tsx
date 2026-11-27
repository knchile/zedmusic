"use client";

import { Check, Heart, ListPlus, Plus, Share2, UserCheck, UserPlus } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { addToPlaylistAction, createPlaylistAction, followArtistAction, likeTrackAction } from "@/app/(site)/social-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/primitives";
import { signInToast, toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { library, useLibrary } from "./library-store";

export function LikeButton({ trackId, title, className, size = "icon" }: { trackId: string; title: string; className?: string; size?: "icon" | "sm" }) {
  const lib = useLibrary();
  const [pending, start] = useTransition();
  const liked = lib.liked.has(trackId);
  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      className={cn(liked && "text-primary hover:text-primary", className)}
      aria-pressed={liked}
      aria-label={liked ? `Remove ${title} from liked songs` : `Like ${title}`}
      disabled={pending}
      onClick={() => {
        if (lib.loaded && !lib.signedIn) return signInToast("like songs");
        library.setLiked(trackId, !liked); // optimistic
        start(async () => {
          const res = await likeTrackAction(trackId, !liked);
          if (!res.ok) {
            library.setLiked(trackId, liked);
            if ("signIn" in res && res.signIn) signInToast("like songs");
            else toast(res.error);
          } else toast(!liked ? "Added to Liked songs" : "Removed from Liked songs");
        });
      }}
    >
      <Heart className={cn(liked && "fill-current")} />
    </Button>
  );
}

export function FollowButton({ artistId, name }: { artistId: string; name: string }) {
  const lib = useLibrary();
  const [pending, start] = useTransition();
  const following = lib.following.has(artistId);
  return (
    <Button
      type="button"
      variant={following ? "secondary" : "outline"}
      size="sm"
      aria-pressed={following}
      disabled={pending}
      onClick={() => {
        if (lib.loaded && !lib.signedIn) return signInToast(`follow ${name}`);
        library.setFollowing(artistId, !following);
        start(async () => {
          const res = await followArtistAction(artistId, !following);
          if (!res.ok) {
            library.setFollowing(artistId, following);
            if ("signIn" in res && res.signIn) signInToast(`follow ${name}`);
            else toast(res.error);
          }
        });
      }}
    >
      {following ? <UserCheck /> : <UserPlus />}
      {following ? "Following" : "Follow"}
    </Button>
  );
}

/** Web Share API on phones; copies the link elsewhere. */
export function ShareButton({ path, title, text, className, size = "icon" }: { path: string; title: string; text?: string; className?: string; size?: "icon" | "sm" }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      className={className}
      aria-label={`Share ${title}`}
      onClick={async () => {
        const url = new URL(path, location.origin).toString();
        if (navigator.share) {
          try {
            await navigator.share({ title, text: text ?? title, url });
            return;
          } catch (err) {
            if ((err as DOMException).name === "AbortError") return;
          }
        }
        try {
          await navigator.clipboard.writeText(url);
          toast("Link copied");
        } catch {
          toast(url);
        }
      }}
    >
      <Share2 />
      {size === "sm" && "Share"}
    </Button>
  );
}

export function AddToPlaylistButton({ trackId, title, className, align = "right" }: { trackId: string; title: string; className?: string; align?: "left" | "right" }) {
  const lib = useLibrary();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const add = (playlistId: string, name: string) =>
    start(async () => {
      const res = await addToPlaylistAction(playlistId, trackId);
      setOpen(false);
      if (!res.ok) return toast(res.error);
      toast(res.added ? `Added to ${name}` : `Already in ${name}`, { label: "View", href: `/playlist/${playlistId}` });
    });

  return (
    <div ref={ref} className={cn("relative", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Add ${title} to a playlist`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => {
          if (lib.loaded && !lib.signedIn) return signInToast("create playlists");
          setOpen((v) => !v);
        }}
      >
        <ListPlus />
      </Button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className={cn(
            "absolute bottom-full z-50 mb-2 w-64 animate-fade-up rounded-xl border border-border bg-surface-2 p-1.5 shadow-2xl shadow-black/50",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          <p className="px-3 py-2 text-xs font-semibold text-muted uppercase">Add to playlist</p>
          {creating ? (
            <form
              className="grid gap-2 p-2"
              onSubmit={(e) => {
                e.preventDefault();
                const name = String(new FormData(e.currentTarget).get("name") ?? "").trim();
                if (!name) return;
                start(async () => {
                  const res = await createPlaylistAction(name, false, trackId);
                  if (!res.ok) return toast(res.error);
                  library.set({ playlists: [res.playlist, ...lib.playlists] });
                  setCreating(false);
                  setOpen(false);
                  toast(`Added to ${res.playlist.title}`, { label: "View", href: `/playlist/${res.playlist.id}` });
                });
              }}
            >
              <Input name="name" placeholder="Playlist name" maxLength={100} autoFocus className="h-10" />
              <Button type="submit" size="sm" disabled={pending}>
                <Check /> Create
              </Button>
            </form>
          ) : (
            <button role="menuitem" type="button" onClick={() => setCreating(true)} className="flex h-10 w-full items-center gap-2 rounded-md px-3 text-sm hover:bg-surface-3">
              <Plus className="size-4" aria-hidden /> New playlist
            </button>
          )}
          <div className="max-h-60 overflow-y-auto">
            {lib.playlists.map((p) => (
              <button
                key={p.id}
                role="menuitem"
                type="button"
                disabled={pending}
                onClick={() => add(p.id, p.title)}
                className="flex h-10 w-full items-center rounded-md px-3 text-left text-sm hover:bg-surface-3 disabled:opacity-60"
              >
                <span className="truncate">{p.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
