import { Search as SearchIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArtistGrid, ReleaseGrid } from "@/components/catalog/cards";
import { TrackList } from "@/components/catalog/track-list";
import { Button } from "@/components/ui/button";
import { EmptyState, Input, Select, Skeleton } from "@/components/ui/primitives";
import { getActiveGenres } from "@/lib/data/public";
import { getGenresWithCounts, searchCatalog } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Search",
  description: "Search Zambian artists, songs and albums.",
  alternates: { canonical: "/search" },
};

type SP = Awaited<PageProps<"/search">["searchParams"]>;
const one = (v: SP[string]) => (Array.isArray(v) ? v[0] : v) ?? "";

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <div className="mx-auto grid max-w-6xl gap-8">
      <h1 className="font-display text-4xl font-extrabold">Search</h1>
      <Suspense fallback={<Skeleton className="h-14" />}>
        <SearchForm searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SearchForm({ searchParams }: Pick<PageProps<"/search">, "searchParams">) {
  const sp = await searchParams;
  const genres = await getActiveGenres();
  await connection(); // the year list depends on the current date
  const thisYear = new Date().getFullYear();
  return (
    <form role="search" action="/search" className="grid gap-3">
      <div className="flex gap-2">
        <label htmlFor="q" className="sr-only">Search artists, songs and albums</label>
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" aria-hidden />
          <Input id="q" name="q" type="search" defaultValue={one(sp.q)} placeholder="Artists, songs, albums" className="pl-12" autoComplete="off" maxLength={100} />
        </div>
        <Button type="submit" size="lg">Search</Button>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:max-w-xl">
        <Select name="genre" defaultValue={one(sp.genre)} aria-label="Genre" className="h-10">
          <option value="">Any genre</option>
          {genres.map((g) => (
            <option key={g.id} value={g.slug}>{g.name}</option>
          ))}
        </Select>
        <Select name="year" defaultValue={one(sp.year)} aria-label="Release year" className="h-10">
          <option value="">Any year</option>
          {Array.from({ length: 30 }, (_, i) => thisYear - i).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </Select>
        <Select name="sort" defaultValue={one(sp.sort)} aria-label="Sort" className="h-10">
          <option value="">Best match</option>
          <option value="newest">Newest</option>
        </Select>
      </div>
    </form>
  );
}

async function Results({ searchParams }: Pick<PageProps<"/search">, "searchParams">) {
  const sp = await searchParams;
  const q = one(sp.q).trim();
  if (q.length < 2) return <BrowseGenres />;
  const year = Number(one(sp.year));
  const res = await searchCatalog(q, {
    genre: one(sp.genre) || undefined,
    year: Number.isInteger(year) && year > 1900 ? year : undefined,
    sort: one(sp.sort) === "newest" ? "newest" : "relevance",
  });
  const empty = !res.artists.length && !res.releases.length && !res.tracks.length;
  if (empty)
    return (
      <EmptyState icon={SearchIcon} title={`No results for “${q}”`}>
        Check the spelling, try fewer words, or remove filters.
      </EmptyState>
    );
  return (
    <div className="grid gap-10">
      {res.tracks.length > 0 && (
        <section aria-labelledby="r-songs">
          <h2 id="r-songs" className="mb-3 font-display text-2xl font-bold">Songs</h2>
          <TrackList tracks={res.tracks} context={`search:${q}`} />
        </section>
      )}
      {res.artists.length > 0 && (
        <section aria-labelledby="r-artists">
          <h2 id="r-artists" className="mb-4 font-display text-2xl font-bold">Artists</h2>
          <ArtistGrid artists={res.artists} scroll />
        </section>
      )}
      {res.releases.length > 0 && (
        <section aria-labelledby="r-releases">
          <h2 id="r-releases" className="mb-4 font-display text-2xl font-bold">Albums, EPs & singles</h2>
          <ReleaseGrid releases={res.releases} />
        </section>
      )}
    </div>
  );
}

async function BrowseGenres() {
  const genres = await getGenresWithCounts();
  return (
    <section aria-labelledby="browse">
      <h2 id="browse" className="mb-4 font-display text-2xl font-bold">Browse by genre</h2>
      <ul className="flex flex-wrap gap-2.5">
        {genres.map((g) => (
          <li key={g.slug}>
            <Link href={`/genre/${g.slug}`} className="inline-flex rounded-full border border-border bg-surface-2 px-4 py-2 text-sm font-medium hover:border-border-strong">
              {g.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
