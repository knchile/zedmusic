import { Disc3 } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ReleaseGrid } from "@/components/catalog/cards";
import { Pagination, pageFrom } from "@/components/catalog/pagination";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { getNewReleases } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "New releases",
  description: "The latest singles, EPs and albums from Zambian artists.",
  alternates: { canonical: "/new-releases" },
};

const PER_PAGE = 30;

export default function NewReleasesPage({ searchParams }: PageProps<"/new-releases">) {
  return (
    <div className="mx-auto grid max-w-6xl gap-8">
      <header className="grid gap-1">
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">Fresh</p>
        <h1 className="font-display text-4xl font-extrabold">New releases</h1>
      </header>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: Pick<PageProps<"/new-releases">, "searchParams">) {
  const page = pageFrom((await searchParams).page);
  const rows = await getNewReleases(PER_PAGE + 1, (page - 1) * PER_PAGE);
  if (rows.length === 0)
    return (
      <EmptyState icon={Disc3} title={page > 1 ? "No more releases" : "No releases yet"}>
        New music appears here as soon as it&apos;s approved.
      </EmptyState>
    );
  return (
    <>
      <ReleaseGrid releases={rows.slice(0, PER_PAGE)} priority={page === 1} />
      <Pagination basePath="/new-releases" page={page} hasNext={rows.length > PER_PAGE} />
    </>
  );
}
