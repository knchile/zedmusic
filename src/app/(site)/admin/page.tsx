import { count, eq } from "drizzle-orm";
import { CheckCircle2, CircleSlash } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Alert, Card, Skeleton } from "@/components/ui/primitives";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth/session";
import { type Service, serviceStatus } from "@/lib/env";
import { formatCount } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <div className="mx-auto grid max-w-6xl gap-8">
      <header className="grid gap-1">
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">Administration</p>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Platform overview</h1>
      </header>
      <Suspense fallback={<OverviewSkeleton />}>
        <Overview />
      </Suspense>
    </div>
  );
}

async function Overview() {
  await requireAdmin("/admin");
  const db = getDb();
  const one = async (q: Promise<{ value: number }[]>) => (await q)[0]?.value ?? 0;

  const [users, artists, published, pendingSubmissions, pendingVerifications, openSignals] = await Promise.all([
    one(db.select({ value: count() }).from(schema.users)),
    one(db.select({ value: count() }).from(schema.artists).where(eq(schema.artists.isDemo, false))),
    one(db.select({ value: count() }).from(schema.tracks).where(eq(schema.tracks.status, "published"))),
    one(db.select({ value: count() }).from(schema.musicSubmissions).where(eq(schema.musicSubmissions.status, "pending"))),
    one(
      db
        .select({ value: count() })
        .from(schema.artistVerificationRequests)
        .where(eq(schema.artistVerificationRequests.status, "pending")),
    ),
    one(db.select({ value: count() }).from(schema.fraudSignals).where(eq(schema.fraudSignals.status, "open"))),
  ]);

  const stats = [
    { label: "Registered users", value: users },
    { label: "Artist profiles", value: artists },
    { label: "Published tracks", value: published },
    { label: "Pending submissions", value: pendingSubmissions, attention: pendingSubmissions > 0 },
    { label: "Pending verifications", value: pendingVerifications, attention: pendingVerifications > 0 },
    { label: "Open fraud signals", value: openSignals, attention: openSignals > 0 },
  ];

  const services = serviceStatus();
  const serviceLabels: Record<Service, string> = {
    database: "Database (Neon)",
    auth: "Authentication",
    storage: "Object storage (R2)",
    "media-cdn": "Media CDN domain",
    email: "Email (Resend)",
    "google-auth": "Google sign-in",
    cron: "Scheduled jobs",
    analytics: "Stream analytics secrets",
    "token-encryption": "OAuth token encryption",
    youtube: "YouTube Data API",
    spotify: "Spotify Web API",
    audiomack: "Audiomack API",
  };

  return (
    <div className="grid gap-8">
      <section aria-label="Key figures" className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="grid gap-1 p-5">
            <p className="text-sm text-muted">{s.label}</p>
            <p className={`font-display text-3xl font-bold tabular-nums ${s.attention ? "text-accent" : ""}`}>
              {formatCount(s.value, "full")}
            </p>
          </Card>
        ))}
      </section>

      <section aria-labelledby="services" className="grid gap-4">
        <h2 id="services" className="font-display text-xl font-semibold">
          Service configuration
        </h2>
        {!services.email && (
          <Alert tone="warning" title="Email is not configured">
            Verification and password-reset emails cannot be delivered, so new users can&apos;t finish
            signing up. Set RESEND_API_KEY.
          </Alert>
        )}
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(services) as Service[]).map((key) => (
            <li key={key} className="flex items-center gap-2.5 rounded-lg border border-border bg-surface px-4 py-3 text-sm">
              {services[key] ? (
                <CheckCircle2 className="size-4 text-primary" aria-hidden />
              ) : (
                <CircleSlash className="size-4 text-muted-2" aria-hidden />
              )}
              <span className={services[key] ? "" : "text-muted"}>{serviceLabels[key]}</span>
              <span className="sr-only">{services[key] ? "configured" : "not configured"}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-sm text-muted">
        Review queues, verification, chart management and moderation tools arrive in the following
        phases.
      </p>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  );
}
