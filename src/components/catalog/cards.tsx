import Link from "next/link";
import { VerifiedBadge, releaseTypeLabel } from "@/components/studio/status-badge";
import type { ArtistCard, ReleaseCard } from "@/lib/data/catalog";
import { Artwork } from "./artwork";

export function ReleaseGrid({ releases, showArtist = true, priority = false }: { releases: ReleaseCard[]; showArtist?: boolean; priority?: boolean }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {releases.map((r, i) => (
        <li key={r.id}>
          <Link href={`/release/${r.artistSlug}/${r.slug}`} className="group grid gap-2">
            <Artwork
              src={r.artworkUrl}
              alt={`${r.title} artwork`}
              seed={r.id}
              className="w-full shadow-lg shadow-black/30 transition group-hover:brightness-110"
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 200px"
              priority={priority && i < 4}
            />
            <span className="min-w-0">
              <span className="block truncate font-semibold group-hover:underline">{r.title}</span>
              <span className="block truncate text-sm text-muted">
                {showArtist ? r.artistName : releaseTypeLabel[r.type]}
                {showArtist ? "" : r.releaseDate ? ` · ${r.releaseDate.slice(0, 4)}` : ""}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Horizontal scroller for home-page rows (snap on mobile). */
export function ReleaseRow({ releases }: { releases: ReleaseCard[] }) {
  return (
    <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
      {releases.map((r) => (
        <li key={r.id} className="w-36 shrink-0 snap-start sm:w-44">
          <Link href={`/release/${r.artistSlug}/${r.slug}`} className="group grid gap-2">
            <Artwork src={r.artworkUrl} alt={`${r.title} artwork`} seed={r.id} className="w-full shadow-lg shadow-black/30" sizes="176px" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold group-hover:underline">{r.title}</span>
              <span className="block truncate text-xs text-muted">
                {r.artistName} · {releaseTypeLabel[r.type]}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function ArtistGrid({ artists, scroll = false }: { artists: ArtistCard[]; scroll?: boolean }) {
  return (
    <ul
      className={
        scroll
          ? "-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
          : "grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
      }
    >
      {artists.map((a) => (
        <li key={a.id} className={scroll ? "w-32 shrink-0 snap-start sm:w-40" : undefined}>
          <Link href={`/artist/${a.slug}`} className="group grid justify-items-center gap-2 text-center">
            <Artwork src={a.avatarUrl} alt={a.name} seed={a.id} rounded="full" kind="artist" className="w-full shadow-lg shadow-black/30" sizes="160px" />
            <span className="flex max-w-full items-center gap-1 font-semibold group-hover:underline">
              <span className="truncate">{a.name}</span>
              {a.verified && <VerifiedBadge />}
            </span>
            {a.location && <span className="-mt-1.5 truncate text-xs text-muted">{a.location}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function SectionHeader({ title, eyebrow, href, linkLabel = "See all" }: { title: string; eyebrow?: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-semibold tracking-[0.18em] text-accent uppercase">{eyebrow}</p>}
        <h2 className="font-display text-2xl font-bold sm:text-3xl">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="shrink-0 text-sm font-semibold whitespace-nowrap text-primary hover:underline">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
