import { MapPin } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Artwork } from "@/components/catalog/artwork";
import { ReleaseGrid } from "@/components/catalog/cards";
import { PlayAllButton, TrackList } from "@/components/catalog/track-list";
import { JsonLd } from "@/components/content/json-ld";
import { FollowButton, ShareButton } from "@/components/social/buttons";
import { VerifiedBadge } from "@/components/studio/status-badge";
import { Skeleton } from "@/components/ui/primitives";
import { getArtistPage } from "@/lib/data/catalog";
import { siteConfig } from "@/lib/site";
import { formatCount } from "@/lib/utils";

type Props = PageProps<"/artist/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getArtistPage(slug);
  if (!data) return { title: "Artist not found", robots: { index: false } };
  const { artist } = data;
  const description = artist.bio?.slice(0, 160) ?? `Listen to ${artist.name}${artist.location ? ` from ${artist.location}` : ""} on ${siteConfig.name}.`;
  return {
    title: artist.name,
    description,
    alternates: { canonical: `/artist/${artist.slug}` },
    openGraph: { type: "profile", title: artist.name, description, images: artist.avatarUrl ? [artist.avatarUrl] : undefined },
  };
}

export default function ArtistPage({ params }: Props) {
  return (
    <Suspense fallback={<ArtistSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

const socialLabels: Record<string, string> = {
  website: "Website", instagram: "Instagram", facebook: "Facebook", x: "X", tiktok: "TikTok",
  youtube: "YouTube", spotify: "Spotify", appleMusic: "Apple Music", audiomack: "Audiomack", boomplay: "Boomplay",
};

async function Content({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const data = await getArtistPage(slug);
  if (!data) notFound();
  const { artist, followers, releases, topTracks, appearsOn } = data;
  const context = `artist:${artist.id}`;

  return (
    <div className="-mx-4 -mt-6 sm:-mx-6 lg:-mx-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "MusicGroup",
          name: artist.name,
          url: `${siteConfig.url}/artist/${artist.slug}`,
          ...(artist.avatarUrl ? { image: artist.avatarUrl } : {}),
          ...(artist.genre ? { genre: artist.genre.name } : {}),
          ...(artist.location ? { foundingLocation: artist.location } : {}),
          sameAs: Object.values(artist.socialLinks ?? {}),
        }}
      />
      <header className="relative isolate overflow-hidden">
        {artist.coverUrl ? (
          <Image src={artist.coverUrl} alt="" fill priority sizes="100vw" className="-z-10 object-cover opacity-50" unoptimized={artist.coverUrl.startsWith("/api/")} />
        ) : (
          <div className="glow-green absolute inset-0 -z-10" aria-hidden />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/60 to-transparent" aria-hidden />
        <div className="flex flex-col gap-5 px-4 pt-16 pb-8 sm:flex-row sm:items-end sm:px-6 lg:px-10 lg:pt-28">
          <Artwork src={artist.avatarUrl} alt={artist.name} seed={artist.id} rounded="full" kind="artist" className="size-32 shrink-0 ring-4 ring-background sm:size-44" sizes="176px" priority />
          <div className="grid min-w-0 gap-2">
            {artist.verified && (
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <VerifiedBadge /> Verified artist
              </p>
            )}
            <h1 className="font-display text-4xl leading-none font-extrabold break-words sm:text-6xl">{artist.name}</h1>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              {artist.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" aria-hidden /> {artist.location}
                </span>
              )}
              {artist.genre && (
                <Link href={`/genre/${artist.genre.slug}`} className="hover:text-foreground hover:underline">
                  {artist.genre.name}
                </Link>
              )}
              <span>
                {formatCount(followers)} follower{followers === 1 ? "" : "s"}
              </span>
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-12 px-4 sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-center gap-3">
          <PlayAllButton tracks={topTracks} context={context} />
          <FollowButton artistId={artist.id} name={artist.name} />
          <ShareButton path={`/artist/${artist.slug}`} title={artist.name} text={`Listen to ${artist.name} on Zed Music Online`} />
        </div>

        {topTracks.length > 0 && (
          <section aria-labelledby="popular">
            <h2 id="popular" className="mb-4 font-display text-2xl font-bold sm:text-3xl">Songs</h2>
            <TrackList tracks={topTracks} context={context} showArtist={false} />
          </section>
        )}

        {releases.length > 0 && (
          <section aria-labelledby="discography">
            <h2 id="discography" className="mb-4 font-display text-2xl font-bold sm:text-3xl">Discography</h2>
            <ReleaseGrid releases={releases} showArtist={false} />
          </section>
        )}

        {appearsOn.length > 0 && (
          <section aria-labelledby="appears">
            <h2 id="appears" className="mb-4 font-display text-2xl font-bold sm:text-3xl">Appears on</h2>
            <TrackList tracks={appearsOn} context={`appears:${artist.id}`} />
          </section>
        )}

        {(artist.bio || Object.keys(artist.socialLinks ?? {}).length > 0) && (
          <section aria-labelledby="about" className="grid max-w-3xl gap-4">
            <h2 id="about" className="font-display text-2xl font-bold sm:text-3xl">About</h2>
            {artist.bio && <p className="leading-relaxed whitespace-pre-line text-muted">{artist.bio}</p>}
            <ul className="flex flex-wrap gap-2">
              {Object.entries(artist.socialLinks ?? {}).map(([k, url]) => (
                <li key={k}>
                  <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex rounded-full border border-border px-3 py-1.5 text-sm hover:bg-surface-2">
                    {socialLabels[k] ?? k}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function ArtistSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="flex items-end gap-5 pt-16">
        <Skeleton className="size-36 rounded-full" />
        <Skeleton className="h-12 w-64" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
