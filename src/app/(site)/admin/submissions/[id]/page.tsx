import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { reviewSubmissionAction } from "../../actions";
import { DecisionForm } from "@/components/admin/decision-form";
import { Artwork } from "@/components/catalog/artwork";
import { releaseTypeLabel } from "@/components/studio/status-badge";
import { Alert, Badge, Card, Skeleton } from "@/components/ui/primitives";
import { requirePermission } from "@/lib/auth/session";
import { getSubmissionDetail } from "@/lib/catalog/moderation";
import { getStorage, mediaUrl } from "@/lib/storage";
import { formatDuration } from "@/lib/utils";

export const metadata: Metadata = { title: "Review submission", robots: { index: false } };

export default function ReviewPage({ params }: PageProps<"/admin/submissions/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: Pick<PageProps<"/admin/submissions/[id]">, "params">) {
  await requirePermission("admin:review-music", "/admin/submissions");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const d = await getSubmissionDetail(id);
  if (!d) notFound();
  const storage = getStorage();
  const previews = await Promise.all(
    d.tracks.map(async (t) => (storage && t.streamKey ? storage.presignGet("audio", t.streamKey, { expiresInSec: 3600 }) : null)),
  );

  return (
    <div className="grid gap-6">
      <Link href="/admin/submissions" className="text-sm text-muted hover:text-foreground">← Music review</Link>
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end">
        <Artwork src={mediaUrl(d.release.artworkKey)} alt="Release artwork" seed={d.release.id} className="size-44 shrink-0" sizes="176px" />
        <div className="grid gap-1">
          <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">{releaseTypeLabel[d.release.type]}</p>
          <h1 className="font-display text-3xl font-bold">{d.release.title}</h1>
          <p className="text-muted">
            {d.artist.name} {d.artist.verificationStatus === "verified" ? <Badge tone="green">Verified</Badge> : <Badge>Unverified</Badge>}
          </p>
          <p className="text-sm text-muted">
            Release date {d.release.releaseDate ?? "—"} · UPC {d.release.upc ?? "—"} · {d.release.copyrightLine ?? "No copyright line"}
          </p>
          <p className="text-sm text-muted">
            Submitted by {d.submitter?.name} ({d.submitter?.email}) · rights confirmed under terms {d.submission.rightsStatementVersion}
          </p>
        </div>
      </header>

      {d.submission.status !== "pending" && <Alert tone="info" title={`Already ${d.submission.status}`} />}

      <section className="grid gap-3">
        <h2 className="font-display text-xl font-semibold">Tracks</h2>
        <ol className="grid gap-2">
          {d.tracks.map((t, i) => {
            const up = d.uploads.find((u) => u.id === t.audioUploadId);
            const meta = (up?.metadata ?? {}) as { codec?: string; bitrate?: number; tags?: { title?: string; artist?: string } };
            return (
              <li key={t.id}>
                <Card className="grid gap-2 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold">
                      {t.trackNumber}. {t.title}
                      {t.featuring && <span className="text-muted"> (feat. {t.featuring})</span>}
                      {t.isExplicit && <Badge className="ml-2">Explicit</Badge>}
                    </p>
                    <p className="text-sm text-muted">
                      {t.durationMs ? formatDuration(t.durationMs) : "—"} · {meta.codec ?? up?.mimeType} {meta.bitrate ? `· ${Math.round(meta.bitrate / 1000)} kbps` : ""}
                    </p>
                  </div>
                  <p className="text-xs text-muted">
                    ISRC {t.isrc ?? "—"} · file “{up?.originalFilename}”
                    {meta.tags?.artist ? ` · embedded artist tag “${meta.tags.artist}”` : ""}
                  </p>
                  {previews[i] ? <audio controls preload="none" src={previews[i]!} className="w-full" /> : <p className="text-sm text-danger">Audio unavailable</p>}
                  {t.lyrics && (
                    <details className="text-sm text-muted">
                      <summary className="cursor-pointer">Lyrics</summary>
                      <p className="mt-2 whitespace-pre-wrap">{t.lyrics}</p>
                    </details>
                  )}
                </Card>
              </li>
            );
          })}
        </ol>
      </section>

      {d.submission.status === "pending" && (
        <Card className="grid gap-3 p-5">
          <h2 className="font-display text-xl font-semibold">Decision</h2>
          <p className="text-sm text-muted">
            Check: audio plays fully and matches the metadata; artwork has no third-party logos; the artist name matches
            the uploader; no obvious copyright issues (known commercial recordings uploaded by someone else).
          </p>
          <DecisionForm
            action={reviewSubmissionAction.bind(null, d.submission.id)}
            approveLabel="Approve & publish"
            rejectLabel="Request changes"
            redirectTo="/admin/submissions"
          />
        </Card>
      )}
    </div>
  );
}
