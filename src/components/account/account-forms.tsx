"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Alert, Card, Field, Input } from "@/components/ui/primitives";
import { authClient } from "@/lib/auth/client";

type Status = { tone: "success" | "error"; message: string } | null;

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="grid gap-5 p-5 sm:p-6">
      <div className="grid gap-1">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      {children}
    </Card>
  );
}

export function ProfileForm({ name }: { name: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get("name") ?? "").trim();
    if (value.length < 2) return setStatus({ tone: "error", message: "Enter your name." });
    setPending(true);
    const { error } = await authClient.updateUser({ name: value });
    setPending(false);
    setStatus(error ? { tone: "error", message: "Couldn't save your name. Try again." } : { tone: "success", message: "Saved." });
    if (!error) router.refresh();
  }

  return (
    <Section title="Profile">
      <form onSubmit={onSubmit} className="grid gap-4 sm:max-w-md">
        <Field label="Display name" htmlFor="name">
          <Input id="name" name="name" defaultValue={name} autoComplete="name" required />
        </Field>
        {status && <Alert tone={status.tone}>{status.message}</Alert>}
        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </Section>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  if (!hasPassword) {
    return (
      <Section title="Password" description="You sign in with Google. To add a password, use “Forgot password” on the sign-in page.">
        <span />
      </Section>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const currentPassword = String(f.get("current") ?? "");
    const newPassword = String(f.get("new") ?? "");
    if (newPassword.length < 8) return setStatus({ tone: "error", message: "New password must be at least 8 characters." });
    if (newPassword !== String(f.get("confirm") ?? "")) return setStatus({ tone: "error", message: "New passwords don't match." });
    setPending(true);
    const { error } = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
    setPending(false);
    if (error) return setStatus({ tone: "error", message: error.status === 400 ? "Current password is incorrect." : "Couldn't change your password." });
    form.reset();
    setStatus({ tone: "success", message: "Password changed. Other devices have been signed out." });
  }

  return (
    <Section title="Password" description="Changing your password signs you out on other devices.">
      <form onSubmit={onSubmit} className="grid gap-4 sm:max-w-md">
        <Field label="Current password" htmlFor="current">
          <PasswordInput id="current" name="current" autoComplete="current-password" required />
        </Field>
        <Field label="New password" htmlFor="new" hint="At least 8 characters">
          <PasswordInput id="new" name="new" autoComplete="new-password" required />
        </Field>
        <Field label="Confirm new password" htmlFor="confirm">
          <PasswordInput id="confirm" name="confirm" autoComplete="new-password" required />
        </Field>
        {status && <Alert tone={status.tone}>{status.message}</Alert>}
        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? "Updating…" : "Update password"}
        </Button>
      </form>
    </Section>
  );
}

export function SessionsForm() {
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  return (
    <Section title="Devices" description="Signed in somewhere you don't recognise? Sign out everywhere else.">
      {status && <Alert tone={status.tone}>{status.message}</Alert>}
      <Button
        variant="outline"
        className="w-fit"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          const { error } = await authClient.revokeOtherSessions();
          setPending(false);
          setStatus(error ? { tone: "error", message: "Something went wrong." } : { tone: "success", message: "Signed out of all other devices." });
        }}
      >
        {pending ? "Signing out…" : "Sign out other devices"}
      </Button>
    </Section>
  );
}

export function ResendVerification({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  return (
    <Alert tone="warning" title="Confirm your email address">
      <div className="grid gap-3">
        <p>Some features (like registering as an artist) need a confirmed email.</p>
        <Button
          size="sm"
          variant="secondary"
          className="w-fit"
          disabled={state === "sending" || state === "sent"}
          onClick={async () => {
            setState("sending");
            const { error } = await authClient.sendVerificationEmail({ email, callbackURL: "/account?verified=1" });
            setState(error ? "error" : "sent");
          }}
        >
          {state === "sent" ? "Email sent" : state === "sending" ? "Sending…" : "Resend confirmation email"}
        </Button>
        {state === "error" && <p className="text-danger">Couldn&apos;t send the email. Try again later.</p>}
      </div>
    </Alert>
  );
}
