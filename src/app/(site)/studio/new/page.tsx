import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { createArtistAction } from "../actions";
import { ArtistProfileForm } from "@/components/studio/artist-profile-form";
import { Alert, Skeleton } from "@/components/ui/primitives";
import { requireUser } from "@/lib/auth/session";
import { getActiveGenres } from "@/lib/data/public";

export const metadata: Metadata = { title: "Create artist profile", robots: { index: false } };

export default function NewArtistPage() {
  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <header className="grid gap-2">
        <Link href="/studio" className="text-sm text-muted hover:text-foreground">← Artist studio</Link>
        <h1 className="font-display text-3xl font-bold">Create your artist profile</h1>
        <p className="text-muted">You can add photos, a cover image and more after creating it.</p>
      </header>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const user = await requireUser("/studio/new");
  if (!user.emailVerified) {
    return <Alert tone="warning" title="Confirm your email first">Open the confirmation link we emailed you, then come back.</Alert>;
  }
  const genres = await getActiveGenres();
  return <ArtistProfileForm mode="create" action={createArtistAction} genres={genres} />;
}
