import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { artists, tracks } from "./catalog";
import { announcementStatus, caseStatus, copyrightStatus, disputeType, reportTargetType } from "./enums";

/** User-submitted reports about content (abuse, wrong info, etc.). */
export const contentReports = pgTable(
  "content_reports",
  {
    id: uuid().primaryKey().defaultRandom(),
    reporterId: text().references(() => users.id, { onDelete: "set null" }),
    targetType: reportTargetType().notNull(),
    targetId: text().notNull(),
    reason: text().notNull(),
    details: text(),
    status: caseStatus().notNull().default("open"),
    handledById: text().references(() => users.id, { onDelete: "set null" }),
    resolution: text(),
    resolvedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.status, t.createdAt), index().on(t.targetType, t.targetId)],
);

/** Copyright / takedown notices. Complainants do not need an account. */
export const copyrightComplaints = pgTable(
  "copyright_complaints",
  {
    id: uuid().primaryKey().defaultRandom(),
    complainantName: text().notNull(),
    complainantEmail: text().notNull(),
    complainantPhone: text(),
    organisation: text(),
    /** Relationship to the work: owner, authorised agent, etc. */
    capacity: text().notNull(),
    originalWork: text().notNull(),
    trackId: uuid().references(() => tracks.id, { onDelete: "set null" }),
    infringingUrl: text().notNull(),
    statement: text().notNull(),
    goodFaithDeclaration: boolean().notNull(),
    accuracyDeclaration: boolean().notNull(),
    signature: text().notNull(),
    status: copyrightStatus().notNull().default("received"),
    handledById: text().references(() => users.id, { onDelete: "set null" }),
    internalNotes: text(),
    counterNotice: text(),
    resolvedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index().on(t.status, t.createdAt), index().on(t.trackId)],
);

/** Duplicate profiles, wrong attribution, ownership disputes. */
export const artistDisputes = pgTable(
  "artist_disputes",
  {
    id: uuid().primaryKey().defaultRandom(),
    type: disputeType().notNull(),
    artistId: uuid()
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    relatedArtistId: uuid().references(() => artists.id, { onDelete: "set null" }),
    trackId: uuid().references(() => tracks.id, { onDelete: "set null" }),
    reporterId: text().references(() => users.id, { onDelete: "set null" }),
    description: text().notNull(),
    evidence: jsonb().$type<{ links?: string[]; uploadIds?: string[] }>().notNull().default({}),
    status: caseStatus().notNull().default("open"),
    handledById: text().references(() => users.id, { onDelete: "set null" }),
    resolution: text(),
    resolvedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.status, t.createdAt), index().on(t.artistId)],
);

/** Every moderation decision (approve/reject/remove/restore) with its reason. */
export const moderationActions = pgTable(
  "moderation_actions",
  {
    id: uuid().primaryKey().defaultRandom(),
    actorId: text().references(() => users.id, { onDelete: "set null" }),
    targetType: text().notNull(),
    targetId: text().notNull(),
    action: text().notNull(),
    reason: text(),
    metadata: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.targetType, t.targetId), index().on(t.createdAt)],
);

export const announcements = pgTable(
  "announcements",
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(),
    title: text().notNull(),
    excerpt: text(),
    body: text().notNull(),
    coverKey: text(),
    status: announcementStatus().notNull().default("draft"),
    authorId: text().references(() => users.id, { onDelete: "set null" }),
    publishedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index().on(t.status, t.publishedAt)],
);
