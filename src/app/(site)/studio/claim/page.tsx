import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { claimArtistAction } from "../actions";
import { EvidenceForm } from "@/components/studio/request-forms";
import { Button } from "@/components/ui/button";
import { Alert, Card, Input, Skeleton } from "@/components/ui/primitives";
import { requireUser } from "@/lib/auth/session";
import { searchClaimableArtists } from "@/lib/catalog/artists";

export const metadata: Metadata = { title: "Claim an artist profile", robots: { index: false } };

export default function ClaimPage({ searchParams }: PageProps<"/studio/claim">) {
  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <header className="grid gap-2">
        <Link href="/studio" className="text-sm text-muted hover:text-foreground">← Artist studio</Link>
        <h1 className="font-display text-3xl font-bold">Claim your artist profile</h1>
        <p className="text-muted">
          Some profiles are created by our editors. If one of them is you, claim it here. We verify every claim before
          granting access to the profile, its music or its statistics.
        </p>
      </header>
      <Suspense fallback={<Skeleton className="h-64" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: Pick<PageProps<"/studio/claim">, "searchParams">) {
  const user = await requireUser("/studio/claim");
  if (!user.emailVerified) return <Alert tone="warning" title="Confirm your email first" />;
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const selected = typeof sp.artist === "string" ? sp.artist : null;
  const results = q ? await searchClaimableArtists(q) : [];
  const chosen = results.find((r) => r.id === selected);

  return (
    <div className="grid gap-6">
      <form className="flex gap-2" role="search">
        <label htmlFor="q" className="sr-only">Artist name</label>
        <Input id="q" name="q" defaultValue={q} placeholder="Search by artist name" minLength={2} required />
        <Button type="submit">
          <Search /> Search
        </Button>
      </form>

      {q && results.length === 0 && (
        <Alert tone="info" title="No claimable profiles found">
          If you don&apos;t have a profile yet, <Link href="/studio/new" className="font-semibold text-primary">create one</Link>.
        </Alert>
      )}

      {results.length > 0 && !chosen && (
        <ul className="grid gap-2">
          {results.map((r) => (
            <li key={r.id}>
              <Card className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-semibold">{r.name}</p>
                  {r.location && <p className="text-sm text-muted">{r.location}</p>}
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/studio/claim?q=${encodeURIComponent(q)}&artist=${r.id}`}>This is me</Link>
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {chosen && (
        <Card className="grid gap-4 p-5">
          <h2 className="font-display text-xl font-semibold">Claim “{chosen.name}”</h2>
          <EvidenceForm
            action={claimArtistAction}
            hiddenArtistId={chosen.id}
            submitLabel="Submit claim"
            messageLabel="Who are you, and how can we confirm it?"
          />
        </Card>
      )}
    </div>
  );
}
