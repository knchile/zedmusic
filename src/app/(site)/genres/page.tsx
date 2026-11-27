import type { Metadata } from "next";
import Link from "next/link";
import { getGenresWithCounts } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Genres",
  description: "Explore Zambian music by genre — Zed hip hop, Kalindula, gospel, Afrobeats, Amapiano and more.",
  alternates: { canonical: "/genres" },
};

const tones = ["from-flag-green/50", "from-flag-orange/40", "from-flag-red/40", "from-primary/40"];

export default async function GenresPage() {
  const genres = await getGenresWithCounts();
  return (
    <div className="mx-auto grid max-w-6xl gap-8">
      <h1 className="font-display text-4xl font-extrabold">Genres</h1>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {genres.map((g, i) => (
          <li key={g.slug}>
            <Link
              href={`/genre/${g.slug}`}
              className={`flex aspect-[5/3] flex-col justify-between rounded-xl border border-border bg-gradient-to-br ${tones[i % tones.length]} to-surface p-4 transition hover:border-border-strong`}
            >
              <span className="font-display text-lg font-bold">{g.name}</span>
              <span className="text-xs text-muted">{g.tracks > 0 ? `${g.tracks} song${g.tracks === 1 ? "" : "s"}` : "No songs yet"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
