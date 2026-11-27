"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto grid max-w-md justify-items-center gap-4 py-20 text-center">
      <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
      <p className="text-muted">
        We couldn&apos;t load this page. Please try again — if it keeps happening, the service may be
        temporarily unavailable.
      </p>
      {error.digest && <p className="text-xs text-muted-2">Reference: {error.digest}</p>}
      <Button onClick={reset}>
        <RotateCcw /> Try again
      </Button>
    </div>
  );
}
