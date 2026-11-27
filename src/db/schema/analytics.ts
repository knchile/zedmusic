import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { artists, tracks } from "./catalog";
import { fraudSignalStatus, playSessionStatus } from "./enums";

/**
 * Versioned stream-qualification rules. Exactly one row is active at a time.
 * Every play session records the rule version used to judge it, so historical
 * numbers can always be explained and recalculated. See docs/STREAM-QUALIFICATION.md.
 */
export const streamRuleSets = pgTable("stream_rule_sets", {
  id: serial().primaryKey(),
  version: integer().notNull().unique(),
  /** Minimum credited listening time for a stream to qualify. */
  minListenSeconds: integer().notNull().default(30),
  /** Tracks shorter than this can never qualify (prevents 31-second "tracks" farming streams). */
  minTrackSeconds: integer().notNull().default(60),
  /** Max qualified streams per listener per track per day (Africa/Lusaka). */
  maxDailyStreamsPerListenerTrack: integer().notNull().default(5),
  /** Max qualified streams per listener per day across all tracks. */
  maxDailyStreamsPerListener: integer().notNull().default(300),
  /** Max qualified streams per hashed IP per track per day (shared networks need headroom). */
  maxDailyStreamsPerIpTrack: integer().notNull().default(50),
  /** Only signed-in listeners count towards charts when true. */
  chartsRequireAuthenticatedListener: boolean().notNull().default(true),
  notes: text(),
  isActive: boolean().notNull().default(false),
  createdById: text().references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/**
 * Raw play sessions — one row per play attempt, updated by heartbeats.
 * The id is issued by the server when playback starts and is required for every
 * heartbeat, so a stream cannot be fabricated by calling a single endpoint.
 * Raw rows are never edited by aggregation; recalculation reads them again.
 */
export const playSessions = pgTable(
  "play_sessions",
  {
    id: uuid().primaryKey().defaultRandom(),
    trackId: uuid()
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    artistId: uuid()
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    userId: text().references(() => users.id, { onDelete: "set null" }),
    /** HMAC of user id or anonymous device id. Stable per listener; not reversible. */
    listenerKey: text().notNull(),
    /** HMAC of client IP. Raw IPs are never stored. */
    ipHash: text(),
    userAgentHash: text(),
    /** ISO-3166 alpha-2 from the edge network, when available. */
    country: text(),
    deviceType: text(),
    /** Where the play started, e.g. "chart", "artist", "playlist", "search". */
    context: text(),
    trackDurationMs: integer().notNull(),
    startedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastHeartbeatAt: timestamp({ withTimezone: true }),
    heartbeatCount: integer().notNull().default(0),
    /** Listening time reported by the client (untrusted). */
    reportedListenedMs: integer().notNull().default(0),
    /** Listening time the server accepts: bounded by wall-clock time between heartbeats. */
    creditedListenedMs: integer().notNull().default(0),
    /** Calendar day in Africa/Lusaka used for daily stats and caps. */
    streamDate: date({ mode: "string" }).notNull(),
    status: playSessionStatus().notNull().default("open"),
    statusReason: text(),
    ruleSetVersion: integer(),
    qualifiedAt: timestamp({ withTimezone: true }),
    /** 0–100. Higher means more suspicious. */
    riskScore: smallint().notNull().default(0),
  },
  (t) => [
    index().on(t.trackId, t.streamDate, t.status),
    index().on(t.artistId, t.streamDate),
    index().on(t.listenerKey, t.trackId, t.streamDate),
    index().on(t.ipHash, t.streamDate),
    index().on(t.userId, t.startedAt.desc()),
    index().on(t.status, t.streamDate),
  ],
);

const statCols = {
  plays: integer().notNull().default(0),
  qualifiedStreams: integer().notNull().default(0),
  /** Qualified streams from signed-in listeners (the chart-eligible subset by default). */
  authenticatedStreams: integer().notNull().default(0),
  uniqueListeners: integer().notNull().default(0),
  listenedMs: bigint({ mode: "number" }).notNull().default(0),
  ruleSetVersion: integer().notNull(),
  computedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
};

/** Per-track daily aggregates of on-platform (Zed Music Online) streams only. */
export const trackDailyStats = pgTable(
  "track_daily_stats",
  {
    day: date({ mode: "string" }).notNull(),
    trackId: uuid()
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    artistId: uuid()
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    ...statCols,
    likes: integer().notNull().default(0),
    playlistAdds: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.day, t.trackId] }), index().on(t.artistId, t.day), index().on(t.trackId, t.day)],
);

export const trackDailyCountryStats = pgTable(
  "track_daily_country_stats",
  {
    day: date({ mode: "string" }).notNull(),
    trackId: uuid()
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    country: text().notNull(),
    qualifiedStreams: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.day, t.trackId, t.country] })],
);

export const artistDailyStats = pgTable(
  "artist_daily_stats",
  {
    day: date({ mode: "string" }).notNull(),
    artistId: uuid()
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    ...statCols,
    newFollowers: integer().notNull().default(0),
    lostFollowers: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.day, t.artistId] })],
);

/** Audit trail of aggregation / recalculation jobs. */
export const aggregationRuns = pgTable(
  "aggregation_runs",
  {
    id: uuid().primaryKey().defaultRandom(),
    job: text().notNull(),
    rangeStart: date({ mode: "string" }).notNull(),
    rangeEnd: date({ mode: "string" }).notNull(),
    status: text().notNull().default("running"),
    rowsAffected: integer(),
    error: text(),
    triggeredById: text().references(() => users.id, { onDelete: "set null" }),
    startedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp({ withTimezone: true }),
  },
  (t) => [index().on(t.job, t.startedAt)],
);

/** Suspicious-activity signals for admin review. */
export const fraudSignals = pgTable(
  "fraud_signals",
  {
    id: uuid().primaryKey().defaultRandom(),
    signalType: text().notNull(),
    severity: smallint().notNull().default(1),
    playSessionId: uuid().references(() => playSessions.id, { onDelete: "set null" }),
    trackId: uuid().references(() => tracks.id, { onDelete: "cascade" }),
    artistId: uuid().references(() => artists.id, { onDelete: "cascade" }),
    listenerKey: text(),
    ipHash: text(),
    details: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    status: fraudSignalStatus().notNull().default("open"),
    reviewedById: text().references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index().on(t.status, t.createdAt),
    index().on(t.trackId),
    index("fraud_signals_open_idx").on(t.severity).where(sql`status = 'open'`),
  ],
);
