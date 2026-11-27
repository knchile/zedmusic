import { BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/primitives";

const pub = {
  draft: { label: "Draft", tone: "neutral" },
  processing: { label: "Processing", tone: "yellow" },
  pending_review: { label: "In review", tone: "orange" },
  published: { label: "Published", tone: "green" },
  rejected: { label: "Changes needed", tone: "red" },
  removed: { label: "Removed", tone: "red" },
} as const;

export function PublicationBadge({ status }: { status: keyof typeof pub }) {
  const s = pub[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <span className={className} title="Verified artist">
      <BadgeCheck className="size-5 fill-primary text-background" aria-hidden />
      <span className="sr-only">Verified artist</span>
    </span>
  );
}

export const releaseTypeLabel = { single: "Single", ep: "EP", album: "Album" } as const;
