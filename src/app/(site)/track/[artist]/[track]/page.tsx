import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Artwork } from "@/components/catalog/artwork";
import { PlayAllButton } from "@/components/catalog/track-list";
import { JsonLd } from "@/components/content/json-ld";
import { AddToPlaylistButton, LikeButton, ShareButton } from "@/components/social/buttons";
import { Skeleton } from "@/components/ui/primitives";
import { getTrackPage } from "@/lib/data/catalog";
import { siteConfig } from "@/lib/site";
import { formatDuration } from "@/lib/utils";

type Props = PageProps<"/track/[artist]/[track]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { artist, track } = await params;
  const data = await getTrackPage(artist, track);
  if (!data) return { title: "Song not found", robots: { index: false } };
  const t = data.track;
  const title = `${t.title} — ${t.artistName}`;
  const description = `Listen to “${t.title}” by ${t.artistName}${t.featuring ? ` feat. ${t.featuring}` : ""} on ${siteConfig.name}.`;
  return {
    title,
    description,
    alternates: { canonical: `/track/${t.artistSlug}/${t.slug}` },
    openGraph: { type: "music.song", title, description, images: t.artworkUrl ? [t.artworkUrl] : undefined },
    twitter: { card: "summary_large_image" },
  };
}

export default function TrackPage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Content params={params} />
    </Suspense>
  );
}

const roleLabel = { primary: "Artist", featured: "Featuring", producer: "Producer", composer: "Composer", songwriter: "Songwriter", remixer: "Remixer" } as const;

async function Content({ params }: Pick<Props, "params">) {
  const { artist, track } = await params;
  const data = await getTrackPage(artist, track);
  if (!data) notFound();
  const { track: t, lyrics, credits, genre, releaseDate, copyrightLine, isrc } = data;
  const grouped = credits.reduce<Record<string, string[]>>((acc, c) => ((acc[c.role] ??= []).push(c.name), acc), {});
  return (
    <div className="mx-auto grid max-w-5xl gap-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "MusicRecording",
          name: t.title,
          duration: `PT${Math.floor(t.durationMs / 60000)}M${Math.round((t.durationMs % 60000) / 1000)}S`,
          byArtist: { "@type": "MusicGroup", name: t.artistName, url: `${siteConfig.url}/artist/${t.artistSlug}` },
          ...(isrc ? { isrcCode: isrc } : {}),
          ...(t.releaseTitle ? { inAlbum: { "@type": "MusicAlbum", name: t.releaseTitle } } : {}),
        }}
      />
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end">
        <Artwork src={t.artworkUrl} alt={`${t.title} artwork`} seed={t.id} className="w-full max-w-72 shrink-0 shadow-2xl shadow-black/50 sm:size-60" sizes="(max-width: 640px) 80vw, 240px" priority />
        <div className="grid min-w-0 gap-2">
          <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">Song</p>
          <h1 className="font-display text-4xl leading-tight font-extrabold break-words sm:text-5xl">{t.title}</h1>
          <p className="text-sm text-muted">
            <Link href={`/artist/${t.artistSlug}`} className="font-semibold text-foreground hover:underline">
              {t.artistName}
            </Link>
            {t.featuring && ` feat. ${t.featuring}`}
            {t.releaseTitle && t.releaseSlug && (
              <>
                {" · "}
                <Link href={`/release/${t.artistSlug}/${t.releaseSlug}`} className="hover:text-foreground hover:underline">
                  {t.releaseTitle}
                </Link>
              </>
            )}
            {" · "}
            {formatDuration(t.durationMs)}
            {t.isExplicit && " · Explicit"}
          </p>
        </div>
      </header>
      <div className="flex items-center gap-2">
        <PlayAllButton tracks={[t]} context={`track:${t.id}`} />
        <LikeButton trackId={t.id} title={t.title} />
        <AddToPlaylistButton trackId={t.id} title={t.title} align="left" />
        <ShareButton path={`/track/${t.artistSlug}/${t.slug}`} title={`${t.title} — ${t.artistName}`} />
      </div>
      <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
        <section aria-labelledby="lyrics">
          <h2 id="lyrics" className="mb-3 font-display text-2xl font-bold">Lyrics</h2>
          {lyrics ? <p className="leading-relaxed whitespace-pre-line text-muted">{lyrics}</p> : <p className="text-muted">Lyrics haven&apos;t been added for this song.</p>}
        </section>
        <section aria-labelledby="credits" className="grid content-start gap-3">
          <h2 id="credits" className="font-display text-2xl font-bold">Credits</h2>
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="text-muted">Artist</dt>
              <dd>{t.artistName}</dd>
            </div>
            {Object.entries(grouped).map(([role, names]) => (
              <div key={role}>
                <dt className="text-muted">{roleLabel[role as keyof typeof roleLabel] ?? role}</dt>
                <dd>{names.join(", ")}</dd>
              </div>
            ))}
            {genre && (
              <div>
                <dt className="text-muted">Genre</dt>
                <dd>
                  <Link href={`/genre/${genre.slug}`} className="hover:underline">{genre.name}</Link>
                </dd>
              </div>
            )}
            {releaseDate && (
              <div>
                <dt className="text-muted">Released</dt>
                <dd>{releaseDate}</dd>
              </div>
            )}
            {copyrightLine && (
              <div>
                <dt className="text-muted">Copyright</dt>
                <dd>{copyrightLine}</dd>
              </div>
            )}
          </dl>
        </section>
      </div>
    </div>
  );
}
