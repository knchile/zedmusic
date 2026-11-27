"use client";

import { Globe, Lock, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createPlaylistAction, deletePlaylistAction, removeFromPlaylistAction, updatePlaylistAction } from "@/app/(site)/social-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { library } from "./library-store";

export function CreatePlaylistForm() {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const name = String(new FormData(form).get("name") ?? "").trim();
        if (!name) return;
        start(async () => {
          const res = await createPlaylistAction(name, false);
          if (!res.ok) return toast(res.error);
          form.reset();
          void library.load(true);
          router.push(`/playlist/${res.playlist.id}`);
        });
      }}
    >
      <label htmlFor="new-playlist" className="sr-only">New playlist name</label>
      <Input id="new-playlist" name="name" placeholder="New playlist name" maxLength={100} className="h-11" />
      <Button type="submit" disabled={pending}>
        <Plus /> Create
      </Button>
    </form>
  );
}

export function PlaylistOwnerControls({ id, title, isPublic }: { id: string; title: string; isPublic: boolean }) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, done?: () => void) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return toast(res.error ?? "Something went wrong.");
      done?.();
      void library.load(true);
      router.refresh();
    });
  return (
    <div className="flex flex-wrap items-center gap-2">
      {editing ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const t = String(new FormData(e.currentTarget).get("title") ?? "");
            run(() => updatePlaylistAction(id, { title: t }), () => setEditing(false));
          }}
        >
          <Input name="title" defaultValue={title} maxLength={100} className="h-10" aria-label="Playlist name" autoFocus />
          <Button type="submit" size="sm" disabled={pending}>Save</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
        </form>
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>Rename</Button>
      )}
      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(() => updatePlaylistAction(id, { isPublic: !isPublic }))}>
        {isPublic ? <Lock /> : <Globe />} {isPublic ? "Make private" : "Make public"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Delete “${title}”?`)) return;
          start(async () => {
            const res = await deletePlaylistAction(id);
            if (!res.ok) return toast(res.error);
            void library.load(true);
            router.push("/library");
          });
        }}
      >
        <Trash2 /> Delete
      </Button>
    </div>
  );
}

export function RemoveFromPlaylistButton({ playlistId, trackId, title }: { playlistId: string; trackId: string; title: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={`Remove ${title} from playlist`}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await removeFromPlaylistAction(playlistId, trackId);
          if (!res.ok) return toast(res.error);
          router.refresh();
        })
      }
    >
      <X />
    </Button>
  );
}
