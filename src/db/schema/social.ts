import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { artists, tracks } from "./catalog";

export const playlists = pgTable(
  "playlists",
  {
    id: uuid().primaryKey().defaultRandom(),
    ownerId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slug: text().notNull(),
    title: text().notNull(),
    description: text(),
    coverKey: text(),
    isPublic: boolean().notNull().default(false),
    /** Curated by Zed Music Online editors. */
    isEditorial: boolean().notNull().default(false),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex().on(t.ownerId, t.slug), index().on(t.isPublic, t.isEditorial)],
);

export const playlistTracks = pgTable(
  "playlist_tracks",
  {
    playlistId: uuid()
      .notNull()
      .references(() => playlists.id, { onDelete: "cascade" }),
    trackId: uuid()
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    position: integer().notNull(),
    addedById: text().references(() => users.id, { onDelete: "set null" }),
    addedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.playlistId, t.trackId] }),
    index().on(t.playlistId, t.position),
    // Supports "playlist additions" analytics per track.
    index().on(t.trackId, t.addedAt),
  ],
);

export const follows = pgTable(
  "follows",
  {
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    artistId: uuid()
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.artistId] }), index().on(t.artistId, t.createdAt)],
);

export const trackLikes = pgTable(
  "track_likes",
  {
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    trackId: uuid()
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.trackId] }), index().on(t.trackId, t.createdAt)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text().notNull(),
    title: text().notNull(),
    body: text(),
    link: text(),
    readAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.userId, t.readAt, t.createdAt)],
);
