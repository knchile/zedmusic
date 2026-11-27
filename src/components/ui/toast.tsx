"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

type Toast = { id: number; message: string; action?: { label: string; href: string } };

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Show a short, non-blocking message (e.g. "Added to playlist"). */
export function toast(message: string, action?: Toast["action"]) {
  const t = { id: nextId++, message, action };
  toasts = [...toasts.slice(-2), t];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== t.id);
    emit();
  }, 3500);
}

export function signInToast(what: string) {
  toast(`Sign in to ${what}.`, { label: "Sign in", href: `/sign-in?next=${encodeURIComponent(location.pathname)}` });
}

export function Toaster() {
  const items = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => toasts,
    () => toasts,
  );
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-40 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-28">
      {items.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex animate-fade-up items-center gap-4 rounded-full border border-border-strong bg-surface-3 px-5 py-3 text-sm shadow-2xl shadow-black/50"
        >
          <span>{t.message}</span>
          {t.action && (
            <Link href={t.action.href} className="font-semibold text-primary hover:underline">
              {t.action.label}
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
