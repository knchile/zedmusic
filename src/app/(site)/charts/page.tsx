import { BarChart3 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChartList } from "@/components/charts/chart-list";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { getActiveCharts, getLatestPublishedChart } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "Official Charts",
  description:
    "The official Zed Music Online Top 10 and genre charts, ranked by qualified streams with a published methodology.",
  alternates: { canonical: "/charts" },
};

const dateFmt = new Intl.DateTimeFormat("en-ZM", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lusaka" });

export default async function ChartsPage() {
  const charts = await getActiveCharts();
  const main = await getLatestPublishedChart("zmo-top-10");

  return (
    <div className="mx-auto grid max-w-4xl gap-10">
      <header className="grid gap-3">
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">Official charts</p>
        <h1 className="font-display text-4xl font-extrabold sm:text-5xl">Zed Music Online Top 10</h1>
        <p className="max-w-2xl text-muted">
          Ranked by qualified streams on Zed Music Online. Every chart has a fixed period, a data
          cut-off and a published methodology — and once published, it never changes.{" "}
          <Link href="/charts/methodology" className="font-semibold text-primary hover:underline">
            Read the methodology
          </Link>
          .
        </p>
      </header>

      <section aria-label="Current Top 10">
        {main && main.entries.length > 0 ? (
          <div className="grid gap-3">
            <p className="text-sm text-muted">
              Chart period {dateFmt.format(new Date(main.period.periodStart))} –{" "}
              {dateFmt.format(new Date(main.period.periodEnd))}
            </p>
            <ChartList chart={main} />
          </div>
        ) : (
          <EmptyState icon={BarChart3} title="No chart has been published yet">
            The first official Top 10 will be published after the catalogue opens and enough
            qualified listening has been recorded to rank songs fairly.
          </EmptyState>
        )}
      </section>

      {charts.length > 0 && (
        <section aria-labelledby="all-charts" className="grid gap-4">
          <h2 id="all-charts" className="font-display text-2xl font-bold">
            All charts
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {charts.map((c) => (
              <li key={c.id}>
                <Card className="grid h-full content-start gap-2 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-lg font-semibold">{c.name}</h3>
                    <Badge>{c.periodType === "weekly" ? "Weekly" : "Monthly"}</Badge>
                  </div>
                  {c.description && <p className="text-sm text-muted">{c.description}</p>}
                  <p className="text-xs text-muted-2">Awaiting first publication</p>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
