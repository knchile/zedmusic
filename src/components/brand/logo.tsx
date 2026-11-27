import { cn } from "@/lib/utils";

/**
 * Brand mark: a green tile (the flag's field) carrying an equaliser whose last
 * three bars are the flag's red, black and orange stripes.
 * Solid fill (no <defs> ids) so multiple instances never clash when one is hidden.
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("size-8", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <rect width="48" height="48" rx="12" fill="#1f9e3a" />
      <rect x="6.5" y="21" width="5" height="14" rx="2.5" fill="#fff" />
      <rect x="14" y="14" width="5" height="21" rx="2.5" fill="#fff" />
      <rect x="21.5" y="18" width="5" height="17" rx="2.5" fill="#de2010" />
      <rect x="29" y="12" width="5" height="23" rx="2.5" fill="#0a0d0b" />
      <rect x="36.5" y="23" width="5" height="12" rx="2.5" fill="#ef7d00" />
    </svg>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[1.05rem] font-extrabold tracking-tight">Zed Music</span>
          <span className="text-[0.62rem] font-semibold tracking-[0.22em] text-muted uppercase">Online</span>
        </span>
      )}
    </span>
  );
}
