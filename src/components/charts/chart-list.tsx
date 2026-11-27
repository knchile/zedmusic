import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import type { PublishedChart } from "@/lib/data/public";
import { formatCount } from "@/lib/utils";

export function Movement({ rank, previousRank, isNew, isReEntry }: { rank: number; previousRank: number | null; isNew: boolean; isReEntry: boolean }) {
  if (isNew) return <Badge tone="orange">NEW</Badge>;
  if (isReEntry) return <Badge tone="yellow">RE</Badge>;
  if (previousRank == null || previousRank === rank)
    return (
      <span className="inline-flex items-center text-muted" title="No change">
        <Minus className="size-4" aria-hidden />
        <span className="sr-only">No change</span>
      </span>
    );
  const up = previousRank > rank;
  const delta = Math.abs(previousRank - rank);
  return (
    <span
      className={up ? "inline-flex items-center gap-0.5 text-primary" : "inline-flex items-center gap-0.5 text-danger"}
      title={`${up ? "Up" : "Down"} ${delta} from #${previousRank}`}
    >
      {up ? <ArrowUp className="size-3.5" aria-hidden /> : <ArrowDown className="size-3.5" aria-hidden />}
      <span className="text-xs font-semibold">{delta}</span>
      <span className="sr-only">{up ? "up" : "down"} from number {previousRank}</span>
    </span>
  );
}

export function ChartList({ chart }: { chart: PublishedChart }) {
  return (
    <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
      {chart.entries.map((e) => (
        <li key={e.rank} className="grid grid-cols-[2.5rem_2.5rem_1fr_auto] items-center gap-3 px-3 py-3 sm:px-4">
          <span className="text-center font-display text-xl font-extrabold tabular-nums">{e.rank}</span>
          <span className="flex justify-center">
            <Movement rank={e.rank} previousRank={e.previousRank} isNew={e.isNewEntry} isReEntry={e.isReEntry} />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold">{e.trackTitle}</span>
            <span className="block truncate text-sm text-muted">{e.artistName}</span>
          </span>
          <span className="text-right text-xs text-muted">
            <span className="block font-semibold text-foreground tabular-nums">{formatCount(e.qualifiedStreams)}</span>
            {e.periodsOnChart} wk{e.periodsOnChart === 1 ? "" : "s"}
          </span>
        </li>
      ))}
    </ol>
  );
}
