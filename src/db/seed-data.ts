/**
 * Reference data required for the platform to operate. This is real configuration,
 * not demonstration content, and is safe to apply in production (idempotent).
 */

export const GENRES: { slug: string; name: string; description: string }[] = [
  { slug: "zed-hip-hop", name: "Zed Hip Hop", description: "Zambian hip hop and rap, from Lusaka to the Copperbelt." },
  { slug: "afrobeats", name: "Afrobeats", description: "Afrobeats and Afro-fusion." },
  { slug: "afro-pop", name: "Afro-pop", description: "Contemporary African pop." },
  { slug: "kalindula", name: "Kalindula", description: "Zambia's bass-driven popular music tradition." },
  { slug: "gospel", name: "Gospel", description: "Gospel and contemporary Christian music." },
  { slug: "amapiano", name: "Amapiano", description: "Amapiano and log-drum dance music." },
  { slug: "dancehall", name: "Dancehall", description: "Dancehall and ragga." },
  { slug: "rnb-soul", name: "R&B / Soul", description: "R&B, soul and slow jams." },
  { slug: "reggae", name: "Reggae", description: "Reggae and roots." },
  { slug: "zamrock", name: "Zamrock", description: "Zambian rock, from the 1970s pioneers to today." },
  { slug: "traditional", name: "Traditional", description: "Traditional and folk music from Zambia's many cultures." },
  { slug: "afro-house", name: "Afro House", description: "Afro house and electronic dance music." },
  { slug: "drill", name: "Drill", description: "Drill and trap." },
  { slug: "jazz", name: "Jazz", description: "Jazz and instrumental." },
];

/** Stream qualification rules, version 1. Matches the public methodology page. */
export const STREAM_RULES_V1 = {
  version: 1,
  minListenSeconds: 30,
  minTrackSeconds: 60,
  maxDailyStreamsPerListenerTrack: 5,
  maxDailyStreamsPerListener: 300,
  maxDailyStreamsPerIpTrack: 50,
  chartsRequireAuthenticatedListener: true,
  notes: "Launch rules. See /charts/methodology (methodology v1).",
  isActive: true,
};

const BASE_METHODOLOGY =
  "Ranked by qualified streams on Zed Music Online from signed-in listeners during the chart period (Friday 00:00 – Thursday 23:59, Africa/Lusaka), " +
  "after anti-manipulation caps. Ties: more unique listeners, then earlier release date. External data is not included in methodology v1.";

export const CHART_DEFINITIONS = [
  {
    slug: "zmo-top-10",
    name: "Zed Music Online Top 10",
    description: "The official chart: the ten most-streamed songs on Zed Music Online this week.",
    filters: {},
    sortOrder: 0,
  },
  {
    slug: "top-10-zambian",
    name: "Top 10 Zambian Songs",
    description: "The most-streamed songs by Zambian artists.",
    filters: { zambianOnly: true },
    sortOrder: 1,
  },
  {
    slug: "top-10-emerging",
    name: "Top 10 Emerging Artists",
    description: "The most-streamed songs by early-career artists.",
    filters: { emergingOnly: true },
    sortOrder: 2,
  },
  {
    slug: "top-10-new-releases",
    name: "Top 10 New Releases",
    description: "The most-streamed songs released in the last 8 weeks.",
    filters: { releasedWithinDays: 56 },
    sortOrder: 3,
  },
].map((c) => ({
  ...c,
  size: 10,
  periodType: "weekly" as const,
  weights: { internal: 1 },
  methodology: BASE_METHODOLOGY,
  methodologyVersion: 1,
  requiresApproval: true,
  isActive: true,
}));
