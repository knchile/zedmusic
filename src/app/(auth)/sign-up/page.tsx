import type { Metadata } from "next";
import { Suspense } from "react";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { Skeleton } from "@/components/ui/primitives";
import { isConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a free Zed Music Online account to follow artists, build playlists and publish your music.",
};

export default function SignUpPage() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-1.5">
        <h1 className="font-display text-3xl font-bold">Create your account</h1>
        <p className="text-sm text-muted">Free for listeners and artists.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-[28rem]" />}>
        <SignUpForm googleEnabled={isConfigured("google-auth")} />
      </Suspense>
    </div>
  );
}
