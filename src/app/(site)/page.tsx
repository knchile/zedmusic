import { BarChart3, ShieldCheck, Upload, LineChart, Headphones, Trophy } from "lucide-react";
import Link from "next/link";
import { ArtistGrid, ReleaseRow, SectionHeader as CatalogHeader } from "@/components/catalog/cards";
import { TrackList } from "@/components/catalog/track-list";
import { ChartList } from "@/components/charts/chart-list";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { getNewReleases, getRecentTracks, listArtists } from "@/lib/data/catalog";
import { getActiveGenres, getLatestPublishedChart } from "@/lib/data/public";

export default function HomePage() {
  return (
    <div className="mx-auto grid max-w-6xl gap-14">
      <Hero />
      <NewReleasesSection />
      <TopTenSection />
      <RecentTracksSection />
      <ArtistsRow title="Featured artists" eyebrow="Spotlight" verifiedFirst />
      <ArtistsRow title="Emerging artists" eyebrow="Ones to watch" emergingOnly />
      <GenresSection />
      <ArtistsSection />
      <TrustSection />
    </div>
  );
}

function Hero() {
  return (
    <section className="glow-green relative overflow-hidden rounded-xl border border-border px-5 py-12 sm:px-10 sm:py-16">
      <div className="flag-stripe absolute top-0 right-0 h-full w-2 opacity-90" aria-hidden />
      <div className="grid max-w-2xl animate-fade-up gap-5">
        <Badge tone="green" className="w-fit">
          🇿🇲 Proudly Zambian
        </Badge>
        <h1 className="font-display text-4xl leading-[1.05] font-extrabold sm:text-6xl">
          The home of <span className="text-primary">Zambian</span> music.
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-muted sm:text-lg">
          Stream the artists shaping the sound of Zambia, follow your favourites, and see who&apos;s
          really leading — with official charts built on transparent, verified streaming data.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/charts">
              <Trophy /> View the charts
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/sign-up">Create a free account</Link>
          </Button>
        </div>
      </div>
      <Equaliser />
    </section>
  );
}

/** Decorative equaliser using the flag colours. Pure CSS, no fake content. */
function Equaliser() {
  const bars = [38, 64, 46, 82, 58, 92, 70, 50, 76, 40, 60, 86, 52, 68];
  const colours = ["bg-primary", "bg-primary", "bg-flag-red", "bg-flag-black ring-1 ring-white/10", "bg-flag-orange"];
  return (
    <div aria-hidden className="pointer-events-none absolute right-8 bottom-0 hidden h-48 items-end gap-2 opacity-80 md:flex">
      {bars.map((h, i) => (
        <span key={i} className={`w-3 rounded-t-full ${colours[i % colours.length]}`} style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

function SectionHeading({ title, eyebrow, action }: { title: string; eyebrow?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-semibold tracking-[0.18em] text-accent uppercase">{eyebrow}</p>}
        <h2 className="font-display text-2xl font-bold sm:text-3xl">{title}</h2>
      </div>
      {action && <div className="shrink-0 whitespace-nowrap">{action}</div>}
    </div>
  );
}

async function TopTenSection() {
  const chart = await getLatestPublishedChart("zmo-top-10");
  return (
    <section aria-labelledby="top10">
      <SectionHeading
        eyebrow="Official chart"
        title="Zed Music Online Top 10"
        action={
          <Link href="/charts/methodology" className="text-sm font-semibold text-primary hover:underline">
            How it&apos;s calculated
          </Link>
        }
      />
      {chart && chart.entries.length > 0 ? (
        <ChartList chart={chart} />
      ) : (
        <EmptyState icon={BarChart3} title="The first official chart is on its way">
          The Top 10 is calculated only from qualified streams recorded on Zed Music Online. We&apos;ll
          publish the first chart once the catalogue opens and there is enough genuine listening to
          rank fairly — no estimates, no placeholders.
        </EmptyState>
      )}
    </section>
  );
}

async function GenresSection() {
  const genres = await getActiveGenres();
  if (genres.length === 0) return null;
  return (
    <section aria-labelledby="genres">
      <SectionHeading eyebrow="Explore" title="Sounds of Zambia" />
      <ul className="flex flex-wrap gap-2.5">
        {genres.map((g, i) => (
          <li key={g.id}>
            <Link
              href={`/genre/${g.slug}`}
              className={`inline-flex rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:border-border-strong ${
                i % 3 === 0 ? "bg-primary/10" : i % 3 === 1 ? "bg-accent/10" : "bg-surface-2"
              }`}
            >
              {g.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function NewReleasesSection() {
  const releases = await getNewReleases(12);
  if (releases.length === 0) return null;
  return (
    <section aria-label="New releases">
      <CatalogHeader eyebrow="Just dropped" title="New releases" href="/new-releases" />
      <ReleaseRow releases={releases} />
    </section>
  );
}

async function RecentTracksSection() {
  const tracks = await getRecentTracks(8);
  if (tracks.length === 0) return null;
  return (
    <section aria-label="Recently added">
      <CatalogHeader eyebrow="Fresh on Zed Music" title="Recently added" />
      <TrackList tracks={tracks} context="home:recent" />
    </section>
  );
}

async function ArtistsRow({ title, eyebrow, verifiedFirst, emergingOnly }: { title: string; eyebrow: string; verifiedFirst?: boolean; emergingOnly?: boolean }) {
  const artists = await listArtists({ limit: 12, verifiedFirst, emergingOnly });
  if (artists.length === 0) return null;
  return (
    <section aria-label={title}>
      <CatalogHeader eyebrow={eyebrow} title={title} href="/artists" />
      <ArtistGrid artists={artists} scroll />
    </section>
  );
}

function ArtistsSection() {
  const features = [
    {
      icon: Upload,
      title: "Publish your music",
      body: "Upload singles, EPs and albums with full credits, artwork and lyrics. Every release is reviewed before it goes live.",
      soon: false,
    },
    {
      icon: LineChart,
      title: "Understand your audience",
      body: "Daily, weekly and lifetime streams, listener growth and top songs — with a clear label on where every number comes from.",
      soon: true,
    },
    {
      icon: BarChart3,
      title: "Chart on merit",
      body: "Qualified streams on Zed Music Online count towards the official Top 10. Bots and repeat-play farming don't.",
      soon: false,
    },
  ];
  return (
    <section aria-labelledby="artists" className="grid gap-6 rounded-xl border border-border bg-surface p-5 sm:p-8">
      <SectionHeading eyebrow="For artists" title="Built for Zambian artists" />
      <div className="grid gap-4 md:grid-cols-3">
        {features.map((f) => (
          <Card key={f.title} className="grid content-start gap-3 bg-surface-2 p-5">
            <div className="flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-lg bg-primary/15">
                <f.icon className="size-5 text-primary" aria-hidden />
              </span>
              {f.soon && <Badge>Opening soon</Badge>}
            </div>
            <h3 className="font-display text-lg font-semibold">{f.title}</h3>
            <p className="text-sm leading-relaxed text-muted">{f.body}</p>
          </Card>
        ))}
      </div>
      <div>
        <Button asChild>
          <Link href="/studio">Open the artist studio</Link>
        </Button>
      </div>
    </section>
  );
}

function TrustSection() {
  const pillars = [
    { icon: Headphones, title: "Real listening only", body: "A stream counts only after at least 30 seconds of actual playback, verified on our servers." },
    { icon: ShieldCheck, title: "Protected against manipulation", body: "Daily caps, bot detection and anomaly review stop repeat-play farming and scripted plays." },
    { icon: BarChart3, title: "Transparent methodology", body: "Every chart is published with its period, rules and data cut-off, and past charts never change." },
  ];
  return (
    <section aria-labelledby="trust" className="grid gap-6">
      <SectionHeading eyebrow="Credible data" title="Numbers you can trust" />
      <div className="grid gap-4 sm:grid-cols-3">
        {pillars.map((p) => (
          <div key={p.title} className="grid content-start gap-2">
            <p.icon className="size-6 text-accent" aria-hidden />
            <h3 className="font-display text-base font-semibold">{p.title}</h3>
            <p className="text-sm leading-relaxed text-muted">{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
