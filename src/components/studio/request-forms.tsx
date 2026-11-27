"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/(site)/studio/actions";
import { Button } from "@/components/ui/button";
import { Alert, Field, Textarea } from "@/components/ui/primitives";

/** Shared form for verification and claim requests (message + evidence links). */
export function EvidenceForm({
  action,
  submitLabel,
  hiddenArtistId,
  messageLabel,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  submitLabel: string;
  hiddenArtistId?: string;
  messageLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const fe = state.fieldErrors ?? {};
  if (state.ok) return <Alert tone="success">{state.message}</Alert>;
  return (
    <form action={formAction} className="grid gap-4">
      {hiddenArtistId && <input type="hidden" name="artistId" value={hiddenArtistId} />}
      <Field label={messageLabel} htmlFor="message" error={fe.message}>
        <Textarea id="message" name="message" rows={4} maxLength={2000} required />
      </Field>
      <Field
        label="Evidence links"
        htmlFor="links"
        error={fe.links}
        hint="Official social media, press coverage, distributor pages — one per line, starting with https://"
      >
        <Textarea id="links" name="links" rows={3} placeholder="https://instagram.com/…" />
      </Field>
      {fe.artistId && <Alert tone="error">{fe.artistId}</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Submitting…" : submitLabel}
      </Button>
    </form>
  );
}
