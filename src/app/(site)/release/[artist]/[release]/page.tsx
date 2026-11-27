import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Artwork } from "@/components/catalog/artwork";
import { ReleaseGrid } from "@/components/catalog/cards";
import { PlayAllButton, TrackList } from "@/components/catalog/track-list";
import { JsonLd } from "@/components/content/json-ld";
import { ShareButton } from "@/components/social/buttons";
import { releaseTypeLabel } from "@/components/studio/status-badge";
import { Skeleton } from "@/components/ui/primitives";
import { getReleasePage } from "@/lib/data/catalog";
import { siteConfig } from "@/lib/site";
import { formatDuration } from "@/lib/utils";

type Props = PageProps<"/release/[artist]/[release]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { artist, release } = await params;
  const data = await getReleasePage(artist, release);
  if (!data) return { title: "Release not found", robots: { index: false } };
  const r = data.release;
  const title = `${r.title} — ${r.artistName}`;
  const description = r.description?.slice(0, 160) ?? `${releaseTypeLabel[r.type]} by ${r.artistName}. Stream it on ${siteConfig.name}.`;
  return {
    title,
    description,
    alternates: { canonical: `/release/${r.artistSlug}/${r.slug}` },
    openGraph: { type: "music.album", title, description, images: r.artworkUrl ? [r.artworkUrl] : undefined },
  };
}

export default function ReleasePage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: Pick<Props, "params">) {
  const { artist, release } = await params;
  const data = await getReleasePage(artist, release);
  if (!data) notFound();
  const { release: r, tracks, more } = data;
  const total = tracks.reduce((s, t) => s + t.durationMs, 0);
  const context = `release:${r.id}`;
  return (
    <div className="mx-auto grid max-w-6xl gap-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "MusicAlbum",
          name: r.title,
          byArtist: { "@type": "MusicGroup", name: r.artistName, url: `${siteConfig.url}/artist/${r.artistSlug}` },
          ...(r.artworkUrl ? { image: r.artworkUrl } : {}),
          ...(r.releaseDate ? { datePublished: r.releaseDate } : {}),
          numTracks: tracks.length,
          track: tracks.map((t, i) => ({ "@type": "MusicRecording", position: i + 1, name: t.title, url: `${siteConfig.url}/track/${t.artistSlug}/${t.slug}` })),
        }}
      />
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end">
        <Artwork src={r.artworkUrl} alt={`${r.title} artwork`} seed={r.id} className="w-full max-w-72 shrink-0 shadow-2xl shadow-black/50 sm:size-60" sizes="(max-width: 640px) 80vw, 240px" priority />
        <div className="grid min-w-0 gap-2">
          <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">{releaseTypeLabel[r.type]}</p>
          <h1 className="font-display text-4xl leading-tight font-extrabold break-words sm:text-5xl">{r.title}</h1>
          <p className="text-sm text-muted">
            <Link href={`/artist/${r.artistSlug}`} className="font-semibold text-foreground hover:underline">
              {r.artistName}
            </Link>
            {r.releaseDate && ` · ${r.releaseDate.slice(0, 4)}`} · {tracks.length} song{tracks.length === 1 ? "" : "s"} · {formatDuration(total)}
          </p>
        </div>
      </header>
      <div className="flex items-center gap-3">
        <PlayAllButton tracks={tracks} context={context} />
        <ShareButton path={`/release/${r.artistSlug}/${r.slug}`} title={`${r.title} — ${r.artistName}`} />
      </div>
      <section aria-label="Tracks">
        <TrackList tracks={tracks} context={context} showArtwork={false} showNumbers showArtist={false} />
      </section>
      {(r.description || r.copyrightLine || r.releaseDate) && (
        <section className="grid max-w-3xl gap-2 text-sm text-muted">
          {r.description && <p className="leading-relaxed whitespace-pre-line">{r.description}</p>}
          {r.releaseDate && <p>Released {new Date(`${r.releaseDate}T00:00:00Z`).toLocaleDateString("en-ZM", { dateStyle: "long", timeZone: "UTC" })}</p>}
          {r.copyrightLine && <p>{r.copyrightLine}</p>}
        </section>
      )}
      {more.length > 0 && (
        <section aria-labelledby="more">
          <h2 id="more" className="mb-4 font-display text-2xl font-bold">More by {r.artistName}</h2>
          <ReleaseGrid releases={more} showArtist={false} />
        </section>
      )}
    </div>
  );
}
