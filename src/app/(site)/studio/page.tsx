import { Mic2, Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Artwork } from "@/components/catalog/artwork";
import { VerifiedBadge } from "@/components/studio/status-badge";
import { Button } from "@/components/ui/button";
import { Alert, Card, EmptyState, Skeleton } from "@/components/ui/primitives";
import { requireUser } from "@/lib/auth/session";
import { listManagedArtists } from "@/lib/catalog/artists";
import { mediaUrl } from "@/lib/storage";

export const metadata: Metadata = { title: "Artist studio", robots: { index: false } };

const roleLabel = { owner: "Owner", manager: "Manager", editor: "Editor", analyst: "Analyst" } as const;

export default function StudioPage() {
  return (
    <div className="mx-auto grid max-w-4xl gap-8">
      <header className="grid gap-1">
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">Artist studio</p>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Your artist profiles</h1>
      </header>
      <Suspense fallback={<Skeleton className="h-48" />}>
        <StudioHome />
      </Suspense>
    </div>
  );
}

async function StudioHome() {
  const user = await requireUser("/studio");
  const artists = await listManagedArtists(user.id);

  return (
    <div className="grid gap-6">
      {!user.emailVerified && (
        <Alert tone="warning" title="Confirm your email first">
          You need a confirmed email address to create or claim an artist profile. Check your inbox, or resend the
          link from <Link href="/account" className="font-semibold text-primary">Account settings</Link>.
        </Alert>
      )}

      {artists.length === 0 ? (
        <EmptyState icon={Mic2} title="Set up your artist profile">
          Create a profile to publish music, build a following and see how your songs perform. Already listed on Zed
          Music Online? Claim your existing profile instead.
        </EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {artists.map((a) => (
            <li key={a.id}>
              <Link href={`/studio/${a.id}`} className="block rounded-xl focus-visible:outline-offset-4">
                <Card className="flex items-center gap-4 p-4 transition hover:border-border-strong hover:bg-surface-2">
                  <Artwork src={mediaUrl(a.avatarKey)} alt="" seed={a.id} rounded="full" kind="artist" className="size-16 shrink-0" sizes="64px" />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate font-display text-lg font-semibold">
                      {a.name} {a.verificationStatus === "verified" && <VerifiedBadge />}
                    </p>
                    <p className="text-sm text-muted">{roleLabel[a.role]}</p>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {user.emailVerified && (
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/studio/new">
              <Plus /> Create artist profile
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/studio/claim">
              <Search /> Claim an existing profile
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
