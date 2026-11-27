import { Music } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PlayAllButton, TrackList } from "@/components/catalog/track-list";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { getGenrePage } from "@/lib/data/catalog";

type Props = PageProps<"/genre/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getGenrePage(slug);
  if (!data) return { title: "Genre not found", robots: { index: false } };
  return {
    title: `${data.genre.name} — Zambian music`,
    description: data.genre.description ?? `Stream ${data.genre.name} from Zambian artists.`,
    alternates: { canonical: `/genre/${slug}` },
  };
}

export default function GenrePage({ params }: Props) {
  return (
    <div className="mx-auto grid max-w-5xl gap-8">
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}

async function Content({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const data = await getGenrePage(slug);
  if (!data) notFound();
  return (
    <>
      <header className="grid gap-2">
        <Link href="/genres" className="text-sm text-muted hover:text-foreground">← Genres</Link>
        <h1 className="font-display text-4xl font-extrabold">{data.genre.name}</h1>
        {data.genre.description && <p className="text-muted">{data.genre.description}</p>}
      </header>
      {data.tracks.length === 0 ? (
        <EmptyState icon={Music} title="No songs in this genre yet" />
      ) : (
        <>
          <div>
            <PlayAllButton tracks={data.tracks} context={`genre:${slug}`} />
          </div>
          <TrackList tracks={data.tracks} context={`genre:${slug}`} />
        </>
      )}
    </>
  );
}
