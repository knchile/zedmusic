"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import type { FormState } from "@/app/(site)/studio/actions";
import { Button } from "@/components/ui/button";
import { Alert, Field, Textarea } from "@/components/ui/primitives";

/** Approve / reject with a note. Rejections require a note the requester will see. */
export function DecisionForm({
  action,
  approveLabel = "Approve",
  rejectLabel = "Reject",
  noteLabel = "Note",
  redirectTo,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  approveLabel?: string;
  rejectLabel?: string;
  noteLabel?: string;
  redirectTo?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const router = useRouter();
  useEffect(() => {
    if (state.ok) {
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    }
  }, [state, router, redirectTo]);
  if (state.ok) return <Alert tone="success">{state.message}</Alert>;
  return (
    <form action={formAction} className="grid gap-3">
      <Field label={noteLabel} htmlFor="note" hint="Required when rejecting. Shown to the artist.">
        <Textarea id="note" name="note" rows={3} maxLength={2000} />
      </Field>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="decision" value="approve" disabled={pending}>
          {approveLabel}
        </Button>
        <Button type="submit" name="decision" value="reject" variant="outline" disabled={pending}>
          {rejectLabel}
        </Button>
      </div>
    </form>
  );
}
