"use client";

import { LayoutDashboard, LogOut, Mic2, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { library } from "@/components/social/library-store";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

export type MenuUser = { name: string; email: string; image: string | null; isAdmin: boolean };

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function Avatar({ user, className }: { user: Pick<MenuUser, "name" | "image">; className?: string }) {
  return user.image ? (
    // eslint-disable-next-line @next/next/no-img-element -- OAuth avatars come from arbitrary hosts
    <img src={user.image} alt="" className={cn("size-9 rounded-full object-cover", className)} referrerPolicy="no-referrer" />
  ) : (
    <span
      aria-hidden
      className={cn(
        "grid size-9 place-items-center rounded-full bg-gradient-to-br from-flag-green to-primary text-sm font-bold text-white",
        className,
      )}
    >
      {initials(user.name) || "?"}
    </span>
  );
}

export function UserMenu({ user }: { user: MenuUser }) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleSignOut() {
    setSigningOut(true);
    await authClient.signOut();
    void library.load(true);
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  const itemClass =
    "flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-foreground hover:bg-surface-3 disabled:opacity-60";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="rounded-full ring-offset-2 ring-offset-background transition hover:ring-2 hover:ring-border-strong"
      >
        <span className="sr-only">Open account menu</span>
        <Avatar user={user} />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 animate-fade-up rounded-xl border border-border bg-surface-2 p-1.5 shadow-2xl shadow-black/50"
        >
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <div className="my-1 h-px bg-border" />
          <Link role="menuitem" href="/studio" className={itemClass} onClick={() => setOpen(false)}>
            <Mic2 className="size-4 text-muted" aria-hidden /> Artist studio
          </Link>
          <Link role="menuitem" href="/account" className={itemClass} onClick={() => setOpen(false)}>
            <Settings className="size-4 text-muted" aria-hidden /> Account settings
          </Link>
          {user.isAdmin && (
            <Link role="menuitem" href="/admin" className={itemClass} onClick={() => setOpen(false)}>
              <LayoutDashboard className="size-4 text-muted" aria-hidden /> Admin dashboard
            </Link>
          )}
          <div className="my-1 h-px bg-border" />
          <button role="menuitem" type="button" className={itemClass} onClick={handleSignOut} disabled={signingOut}>
            <LogOut className="size-4 text-muted" aria-hidden /> {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
