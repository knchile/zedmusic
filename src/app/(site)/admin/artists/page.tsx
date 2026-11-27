import { UserCheck } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { decideArtistRequestAction } from "../actions";
import { DecisionForm } from "@/components/admin/decision-form";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/primitives";
import { requirePermission } from "@/lib/auth/session";
import { listPendingArtistRequests } from "@/lib/catalog/moderation";

export const metadata: Metadata = { title: "Artist requests", robots: { index: false } };

export default function ArtistRequestsPage() {
  return (
    <div className="grid gap-6">
      <h1 className="font-display text-3xl font-bold">Verification & claims</h1>
      <Suspense fallback={<Skeleton className="h-64" />}>
        <List />
      </Suspense>
    </div>
  );
}

async function List() {
  await requirePermission("admin:verify-artists", "/admin/artists");
  const reqs = await listPendingArtistRequests();
  if (reqs.length === 0) return <EmptyState icon={UserCheck} title="No pending requests" />;
  return (
    <ul className="grid gap-4">
      {reqs.map((r) => (
        <li key={r.id}>
          <Card className="grid gap-4 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={r.type === "claim" ? "orange" : "green"}>{r.type === "claim" ? "Profile claim" : "Verification"}</Badge>
              <h2 className="font-display text-lg font-semibold">{r.artistName}</h2>
              <span className="text-sm text-muted">
                requested by {r.requesterName} ({r.requesterEmail}) · {r.createdAt.toLocaleDateString("en-ZM")}
              </span>
            </div>
            {r.message && <p className="text-sm whitespace-pre-wrap">{r.message}</p>}
            {r.evidence.links && r.evidence.links.length > 0 && (
              <ul className="grid gap-1 text-sm">
                {r.evidence.links.map((l) => (
                  <li key={l}>
                    <a href={l} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-primary hover:underline">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted">
              Confirm through an official channel (e.g. a DM from the verified social account, or a call to a known
              manager) before approving. Email address alone is not proof.
            </p>
            <DecisionForm action={decideArtistRequestAction.bind(null, r.id)} />
          </Card>
        </li>
      ))}
    </ul>
  );
}
