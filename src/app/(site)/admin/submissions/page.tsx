import { Inbox } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Artwork } from "@/components/catalog/artwork";
import { releaseTypeLabel } from "@/components/studio/status-badge";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/primitives";
import { requirePermission } from "@/lib/auth/session";
import { listPendingSubmissions } from "@/lib/catalog/moderation";
import { mediaUrl } from "@/lib/storage";

export const metadata: Metadata = { title: "Music review", robots: { index: false } };

export default function SubmissionsPage() {
  return (
    <div className="grid gap-6">
      <h1 className="font-display text-3xl font-bold">Music review</h1>
      <Suspense fallback={<Skeleton className="h-64" />}>
        <List />
      </Suspense>
    </div>
  );
}

async function List() {
  await requirePermission("admin:review-music", "/admin/submissions");
  const subs = await listPendingSubmissions();
  if (subs.length === 0) return <EmptyState icon={Inbox} title="Nothing to review">New submissions will appear here, oldest first.</EmptyState>;
  return (
    <ul className="grid gap-2">
      {subs.map((s) => (
        <li key={s.id}>
          <Link href={`/admin/submissions/${s.id}`}>
            <Card className="flex items-center gap-4 p-3 transition hover:border-border-strong hover:bg-surface-2">
              <Artwork src={mediaUrl(s.artworkKey)} alt="" seed={s.releaseId} className="size-14 shrink-0" sizes="56px" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{s.releaseTitle}</p>
                <p className="truncate text-sm text-muted">
                  {s.artistName} · {releaseTypeLabel[s.releaseType]} · by {s.submitterEmail}
                </p>
              </div>
              <div className="grid justify-items-end gap-1 text-xs text-muted">
                {s.artistVerified === "verified" && <Badge tone="green">Verified artist</Badge>}
                <span>{s.createdAt.toLocaleString("en-ZM", { timeZone: "Africa/Lusaka" })}</span>
              </div>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
