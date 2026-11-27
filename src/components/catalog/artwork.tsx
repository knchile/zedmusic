import Image from "next/image";
import { Music2, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

/** Deterministic gradient for items without artwork (no fake imagery). */
function hueFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function Artwork({
  src,
  alt,
  seed,
  className,
  sizes = "200px",
  rounded = "md",
  priority,
  kind = "release",
}: {
  src: string | null;
  alt: string;
  seed: string;
  className?: string;
  sizes?: string;
  rounded?: "md" | "full";
  priority?: boolean;
  kind?: "release" | "artist";
}) {
  const radius = rounded === "full" ? "rounded-full" : "rounded-md";
  if (!src) {
    const hue = hueFor(seed);
    const Icon = kind === "artist" ? UserRound : Music2;
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn("relative grid aspect-square place-items-center overflow-hidden", radius, className)}
        style={{ background: `linear-gradient(135deg, hsl(${hue} 45% 28%), hsl(${(hue + 40) % 360} 40% 14%))` }}
      >
        <Icon className="size-1/3 text-white/40" aria-hidden />
      </div>
    );
  }
  // Local dev storage is served by an API route; skip the optimiser there.
  const unoptimized = src.startsWith("/api/");
  return (
    <div className={cn("relative aspect-square overflow-hidden bg-surface-3", radius, className)}>
      <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" priority={priority} unoptimized={unoptimized} />
    </div>
  );
}
