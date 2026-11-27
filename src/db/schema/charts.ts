import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { artists, genres, tracks } from "./catalog";
import { chartPeriodStatus, chartPeriodType } from "./enums";

export type ChartFilters = {
  genreId?: string;
  /** Only tracks released within N days before the period end. */
  releasedWithinDays?: number;
  /** Only artists flagged as emerging. */
  emergingOnly?: boolean;
  /** Only artists whose country is ZM. */
  zambianOnly?: boolean;
};

/**
 * Optional weights for verified external sources. Every weight must have a
 * documented justification, and the chart engine only uses external data that is
 * verified and covers exactly the same period.
 */
export type ChartWeights = {
  internal: number;
  external?: Partial<Record<string, { weight: number; justification: string }>>;
};

export const chartDefinitions = pgTable("chart_definitions", {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  description: text(),
  size: integer().notNull().default(10),
  periodType: chartPeriodType().notNull().default("weekly"),
  genreId: uuid().references(() => genres.id, { onDelete: "set null" }),
  filters: jsonb().$type<ChartFilters>().notNull().default({}),
  weights: jsonb().$type<ChartWeights>().notNull().default({ internal: 1 }),
  methodology: text().notNull(),
  methodologyVersion: integer().notNull().default(1),
  /** Require manual approval before publication. */
  requiresApproval: boolean().notNull().default(true),
  isActive: boolean().notNull().default(true),
  sortOrder: integer().notNull().default(0),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/** One chart run for one period. Once published its entries are frozen. */
export const chartPeriods = pgTable(
  "chart_periods",
  {
    id: uuid().primaryKey().defaultRandom(),
    chartId: uuid()
      .notNull()
      .references(() => chartDefinitions.id, { onDelete: "cascade" }),
    periodStart: date({ mode: "string" }).notNull(),
    periodEnd: date({ mode: "string" }).notNull(),
    status: chartPeriodStatus().notNull().default("computing"),
    /** Exact methodology, weights, filters and stream rule version used. */
    methodologySnapshot: jsonb().$type<Record<string, unknown>>().notNull(),
    /** Stats computed up to this instant; later data does not change this chart. */
    dataCutoffAt: timestamp({ withTimezone: true }).notNull(),
    /** SHA-256 over the ranked inputs, to prove the chart is reproducible. */
    inputHash: text(),
    computedAt: timestamp({ withTimezone: true }),
    reviewedById: text().references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp({ withTimezone: true }),
    reviewNote: text(),
    publishedAt: timestamp({ withTimezone: true }),
    /** Incremented when a period is recomputed before publication. */
    revision: integer().notNull().default(1),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex().on(t.chartId, t.periodStart, t.revision),
    // At most one published chart per chart/period.
    uniqueIndex("chart_periods_published_uq")
      .on(t.chartId, t.periodStart)
      .where(sql`status = 'published'`),
    index().on(t.chartId, t.status, t.periodEnd),
  ],
);

export const chartEntries = pgTable(
  "chart_entries",
  {
    id: uuid().primaryKey().defaultRandom(),
    periodId: uuid()
      .notNull()
      .references(() => chartPeriods.id, { onDelete: "cascade" }),
    rank: integer().notNull(),
    trackId: uuid()
      .notNull()
      .references(() => tracks.id, { onDelete: "restrict" }),
    artistId: uuid()
      .notNull()
      .references(() => artists.id, { onDelete: "restrict" }),
    /** Denormalised so published charts read the same even if titles change later. */
    trackTitle: text().notNull(),
    artistName: text().notNull(),
    artworkKey: text(),
    score: numeric({ precision: 18, scale: 4 }).notNull(),
    qualifiedStreams: integer().notNull(),
    /** Verified external units that contributed to the score (0 if none). */
    externalUnits: integer().notNull().default(0),
    previousRank: integer(),
    peakRank: integer().notNull(),
    periodsOnChart: integer().notNull().default(1),
    isNewEntry: boolean().notNull().default(false),
    isReEntry: boolean().notNull().default(false),
  },
  (t) => [
    uniqueIndex().on(t.periodId, t.rank),
    uniqueIndex().on(t.periodId, t.trackId),
    index().on(t.trackId),
  ],
);

/** Immutable JSON snapshot written at publication, kept for audit/history. */
export const chartSnapshots = pgTable("chart_snapshots", {
  periodId: uuid()
    .primaryKey()
    .references(() => chartPeriods.id, { onDelete: "cascade" }),
  payload: jsonb().$type<Record<string, unknown>>().notNull(),
  inputHash: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
