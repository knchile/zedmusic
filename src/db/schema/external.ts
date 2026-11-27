import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { artists, tracks, uploads } from "./catalog";
import {
  dataVerificationStatus,
  externalConnectionStatus,
  externalConnectionType,
  externalMetric,
  externalPlatform,
  externalReportSource,
  reportGranularity,
} from "./enums";

/**
 * An artist's link to an external platform. OAuth tokens are encrypted with
 * TOKEN_ENCRYPTION_KEY (AES-256-GCM) before storage and never sent to the browser.
 */
export const externalConnections = pgTable(
  "external_connections",
  {
    id: uuid().primaryKey().defaultRandom(),
    artistId: uuid()
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    platform: externalPlatform().notNull(),
    type: externalConnectionType().notNull(),
    /** Channel id, artist id or profile URL on the external platform. */
    externalAccountId: text(),
    externalUrl: text(),
    displayName: text(),
    status: externalConnectionStatus().notNull().default("pending"),
    accessTokenEnc: text(),
    refreshTokenEnc: text(),
    tokenExpiresAt: timestamp({ withTimezone: true }),
    scopes: text(),
    lastSyncedAt: timestamp({ withTimezone: true }),
    lastError: text(),
    connectedById: text().references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex().on(t.artistId, t.platform, t.externalAccountId), index().on(t.status)],
);

/** One imported report (CSV upload, distributor statement, or API sync batch). */
export const externalReports = pgTable(
  "external_reports",
  {
    id: uuid().primaryKey().defaultRandom(),
    artistId: uuid()
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    connectionId: uuid().references(() => externalConnections.id, { onDelete: "set null" }),
    platform: externalPlatform().notNull(),
    source: externalReportSource().notNull(),
    /** Distributor name when source = distributor_report (e.g. "DistroKid"). */
    sourceName: text(),
    uploadId: uuid().references(() => uploads.id, { onDelete: "set null" }),
    periodStart: date({ mode: "string" }).notNull(),
    periodEnd: date({ mode: "string" }).notNull(),
    granularity: reportGranularity().notNull(),
    verificationStatus: dataVerificationStatus().notNull().default("unverified"),
    verifiedById: text().references(() => users.id, { onDelete: "set null" }),
    verifiedAt: timestamp({ withTimezone: true }),
    verificationNote: text(),
    rowCount: integer().notNull().default(0),
    rejectedRowCount: integer().notNull().default(0),
    importErrors: jsonb().$type<{ row: number; message: string }[]>().notNull().default([]),
    /** SHA-256 of the source file, prevents importing the same statement twice. */
    fileSha256: text(),
    importedById: text().references(() => users.id, { onDelete: "set null" }),
    importedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index().on(t.artistId, t.platform, t.periodStart),
    index().on(t.verificationStatus),
    uniqueIndex("external_reports_file_uq")
      .on(t.artistId, t.fileSha256)
      .where(sql`file_sha256 IS NOT NULL`),
  ],
);

/** Normalised metric rows from external reports. Never mixed with on-platform stats tables. */
export const externalMetrics = pgTable(
  "external_metrics",
  {
    id: uuid().primaryKey().defaultRandom(),
    reportId: uuid()
      .notNull()
      .references(() => externalReports.id, { onDelete: "cascade" }),
    artistId: uuid()
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    /** Matched catalogue track (by ISRC or manual mapping); null if unmatched. */
    trackId: uuid().references(() => tracks.id, { onDelete: "set null" }),
    platform: externalPlatform().notNull(),
    isrc: text(),
    externalTrackRef: text(),
    externalTrackTitle: text(),
    periodStart: date({ mode: "string" }).notNull(),
    periodEnd: date({ mode: "string" }).notNull(),
    granularity: reportGranularity().notNull(),
    metric: externalMetric().notNull(),
    value: bigint({ mode: "number" }).notNull(),
    /** ISO country or "ALL" for totals. */
    country: text().notNull().default("ALL"),
    verificationStatus: dataVerificationStatus().notNull().default("unverified"),
  },
  (t) => [
    uniqueIndex("external_metrics_row_uq").on(
      t.reportId,
      t.externalTrackRef,
      t.periodStart,
      t.periodEnd,
      t.metric,
      t.country,
    ),
    index().on(t.trackId, t.periodStart),
    index().on(t.artistId, t.platform, t.periodStart),
    index().on(t.isrc),
  ],
);
