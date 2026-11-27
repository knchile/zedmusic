import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "@/components/auth/sign-in-form";
import { Skeleton } from "@/components/ui/primitives";
import { isConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function SignInPage() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-1.5">
        <h1 className="font-display text-3xl font-bold">Welcome back</h1>
        <p className="text-sm text-muted">Sign in to your Zed Music Online account.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-80" />}>
        <SignInForm googleEnabled={isConfigured("google-auth")} />
      </Suspense>
    </div>
  );
}
