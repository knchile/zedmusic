import { Mic2 } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ArtistGrid } from "@/components/catalog/cards";
import { Pagination, pageFrom } from "@/components/catalog/pagination";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { listArtists } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Artists",
  description: "Discover Zambian artists on Zed Music Online.",
  alternates: { canonical: "/artists" },
};

const PER_PAGE = 48;

export default function ArtistsPage({ searchParams }: PageProps<"/artists">) {
  return (
    <div className="mx-auto grid max-w-6xl gap-8">
      <header className="grid gap-1">
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">Discover</p>
        <h1 className="font-display text-4xl font-extrabold">Artists</h1>
      </header>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: Pick<PageProps<"/artists">, "searchParams">) {
  const page = pageFrom((await searchParams).page);
  const rows = await listArtists({ limit: PER_PAGE + 1, offset: (page - 1) * PER_PAGE, verifiedFirst: true });
  if (rows.length === 0) return <EmptyState icon={Mic2} title="No artists yet">Artists appear here once their first release is published.</EmptyState>;
  return (
    <>
      <ArtistGrid artists={rows.slice(0, PER_PAGE)} />
      <Pagination basePath="/artists" page={page} hasNext={rows.length > PER_PAGE} />
    </>
  );
}
