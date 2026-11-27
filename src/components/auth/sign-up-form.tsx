"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, Field, Input } from "@/components/ui/primitives";
import { authClient } from "@/lib/auth/client";
import { safeRedirectPath } from "@/lib/utils";
import { type SignUpErrors as Errors, validateSignUp } from "@/lib/validation/auth";
import { GoogleButton, OrDivider } from "./google-button";
import { PasswordInput } from "./password-input";

export function SignUpForm({ googleEnabled }: { googleEnabled: boolean }) {
  const params = useSearchParams();
  const next = safeRedirectPath(params.get("next"), "/");
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const input = {
      name: String(f.get("name") ?? ""),
      email: String(f.get("email") ?? "").trim().toLowerCase(),
      password: String(f.get("password") ?? ""),
      confirm: String(f.get("confirm") ?? ""),
      terms: f.get("terms") === "on",
    };
    const v = validateSignUp(input);
    setErrors(v);
    if (Object.keys(v).length) return;

    setPending(true);
    const { error } = await authClient.signUp.email({
      name: input.name.trim(),
      email: input.email,
      password: input.password,
      callbackURL: next === "/" ? "/account?verified=1" : next,
    });
    setPending(false);
    if (error) {
      if (error.status === 429) setErrors({ form: "Too many attempts. Please try again in a few minutes." });
      else if (error.code === "USER_ALREADY_EXISTS" || error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL")
        setErrors({ email: "An account with this email already exists. Try signing in." });
      else if (error.code === "PASSWORD_COMPROMISED") setErrors({ password: "This password appears in known data breaches. Choose another." });
      else setErrors({ form: error.message ?? "We couldn't create your account. Please try again." });
      return;
    }
    setSentTo(input.email);
  }

  if (sentTo) {
    return (
      <div className="grid justify-items-center gap-4 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-primary/15">
          <MailCheck className="size-7 text-primary" aria-hidden />
        </span>
        <h1 className="font-display text-2xl font-bold">Check your email</h1>
        <p className="text-sm text-muted">
          We sent a confirmation link to <strong className="text-foreground">{sentTo}</strong>. Open it to
          activate your account. The link expires in 1 hour — check your spam folder if you don&apos;t see it.
        </p>
        <Button asChild variant="outline">
          <Link href="/sign-in">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {googleEnabled && (
        <>
          <GoogleButton callbackURL={next} />
          <OrDivider />
        </>
      )}
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <Field label="Name" htmlFor="name" error={errors.name} hint="Your name or artist name">
          <Input id="name" name="name" autoComplete="name" aria-invalid={!!errors.name} required />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email}>
          <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" aria-invalid={!!errors.email} required />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password} hint="At least 8 characters">
          <PasswordInput id="password" name="password" autoComplete="new-password" aria-invalid={!!errors.password} required />
        </Field>
        <Field label="Confirm password" htmlFor="confirm" error={errors.confirm}>
          <PasswordInput id="confirm" name="confirm" autoComplete="new-password" aria-invalid={!!errors.confirm} required />
        </Field>
        <div className="grid gap-1">
          <label className="flex items-start gap-2.5 text-sm text-muted">
            <input type="checkbox" name="terms" className="mt-0.5 size-4 shrink-0 accent-primary" aria-invalid={!!errors.terms} />
            <span>
              I agree to the{" "}
              <Link href="/legal/terms" target="_blank" className="font-semibold text-primary hover:underline">
                Terms of Use
              </Link>{" "}
              and{" "}
              <Link href="/legal/privacy" target="_blank" className="font-semibold text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          {errors.terms && (
            <p className="text-sm text-danger" role="alert">
              {errors.terms}
            </p>
          )}
        </div>
        {errors.form && <Alert tone="error">{errors.form}</Alert>}
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
