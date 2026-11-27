import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/password-reset-forms";
import { Skeleton } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-1.5">
        <h1 className="font-display text-3xl font-bold">Choose a new password</h1>
        <p className="text-sm text-muted">For security, you&apos;ll be signed out on other devices.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-56" />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
