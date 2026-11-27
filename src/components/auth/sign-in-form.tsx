"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, Field, Input } from "@/components/ui/primitives";
import { library } from "@/components/social/library-store";
import { authClient } from "@/lib/auth/client";
import { safeRedirectPath } from "@/lib/utils";
import { GoogleButton, OrDivider } from "./google-button";
import { PasswordInput } from "./password-input";

export function SignInForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeRedirectPath(params.get("next"), "/");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    setUnverified(false);
    const { error } = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
      rememberMe: form.get("remember") === "on",
      callbackURL: next,
    });
    setPending(false);
    if (error) {
      if (error.status === 403) {
        // Better Auth re-sends the verification email on sign-in (sendOnSignIn).
        setUnverified(true);
        return;
      }
      if (error.status === 429) {
        setError("Too many attempts. Please wait a minute and try again.");
        return;
      }
      setError("Incorrect email or password.");
      return;
    }
    void library.load(true);
    router.push(next);
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      {params.get("reset") === "1" && (
        <Alert tone="success" title="Password updated">
          Sign in with your new password.
        </Alert>
      )}
      {googleEnabled && (
        <>
          <GoogleButton callbackURL={next} />
          <OrDivider />
        </>
      )}
      <form onSubmit={onSubmit} className="grid gap-4" noValidate={false}>
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required />
        </Field>
        <Field label="Password" htmlFor="password">
          <PasswordInput id="password" name="password" autoComplete="current-password" required />
        </Field>
        <div className="flex items-center justify-between gap-4 text-sm">
          <label className="flex items-center gap-2 text-muted">
            <input type="checkbox" name="remember" defaultChecked className="size-4 accent-primary" />
            Keep me signed in
          </label>
          <Link href="/forgot-password" className="font-semibold text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        {error && <Alert tone="error">{error}</Alert>}
        {unverified && (
          <Alert tone="warning" title="Please confirm your email">
            We&apos;ve sent a new confirmation link to your inbox. Open it, then sign in again.
          </Alert>
        )}
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted">
        New to Zed Music Online?{" "}
        <Link href={`/sign-up${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
