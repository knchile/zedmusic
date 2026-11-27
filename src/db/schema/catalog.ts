import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import {
  artistMemberRole,
  artistProfileOrigin,
  artistProfileState,
  artistVerificationStatus,
  labelMemberRole,
  membershipStatus,
  publicationStatus,
  releaseType,
  reviewStatus,
  trackCreditRole,
  uploadKind,
  uploadStatus,
  verificationRequestType,
} from "./enums";
import { tsvector } from "./types";

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export type SocialLinks = Partial<
  Record<
    "website" | "instagram" | "facebook" | "x" | "tiktok" | "youtube" | "spotify" | "appleMusic" | "audiomack" | "boomplay",
    string
  >
>;

// ---------------------------------------------------------------------------
// Genres
// ---------------------------------------------------------------------------
export const genres = pgTable("genres", {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  description: text(),
  sortOrder: integer().notNull().default(0),
  isActive: boolean().notNull().default(true),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// Record labels
// ---------------------------------------------------------------------------
export const labels = pgTable("labels", {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  description: text(),
  logoKey: text(),
  website: text(),
  isVerified: boolean().notNull().default(false),
  ...timestamps,
});

export const labelMembers = pgTable(
  "label_members",
  {
    labelId: uuid()
      .notNull()
      .references(() => labels.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: labelMemberRole().notNull().default("analyst"),
    status: membershipStatus().notNull().default("pending"),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.labelId, t.userId] }), index().on(t.userId)],
);

// ---------------------------------------------------------------------------
// Artists
// ---------------------------------------------------------------------------
export const artists = pgTable(
  "artists",
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(),
    name: text().notNull(),
    bio: text(),
    /** Town / province, free text (e.g. "Lusaka", "Copperbelt"). */
    location: text(),
    country: text().notNull().default("ZM"),
    primaryGenreId: uuid().references(() => genres.id, { onDelete: "set null" }),
    avatarKey: text(),
    coverKey: text(),
    socialLinks: jsonb().$type<SocialLinks>().notNull().default({}),
    labelId: uuid().references(() => labels.id, { onDelete: "set null" }),
    origin: artistProfileOrigin().notNull().default("self_registered"),
    verificationStatus: artistVerificationStatus().notNull().default("unverified"),
    verifiedAt: timestamp({ withTimezone: true }),
    state: artistProfileState().notNull().default("active"),
    /** When a duplicate is merged, points to the surviving profile. */
    mergedIntoId: uuid(),
    /** Emerging = early-career flag used by the Emerging Artists chart. Set by editors. */
    isEmerging: boolean().notNull().default(true),
    /** Demonstration data. Never shown in production and always excluded from charts. */
    isDemo: boolean().notNull().default(false),
    searchVector: tsvector().generatedAlwaysAs(
      sql`to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(location, ''))`,
    ),
    ...timestamps,
  },
  (t) => [
    index().on(t.verificationStatus),
    index().on(t.labelId),
    index().on(t.primaryGenreId),
    index("artists_search_idx").using("gin", t.searchVector),
    index("artists_name_trgm_idx").using("gin", t.name.op("gin_trgm_ops")),
  ],
);

/** Which users may act for an artist. Artist data access is always checked through this table. */
export const artistMembers = pgTable(
  "artist_members",
  {
    artistId: uuid()
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: artistMemberRole().notNull(),
    status: membershipStatus().notNull().default("pending"),
    /** User (artist owner or admin) who granted this access. */
    grantedById: text().references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.artistId, t.userId] }), index().on(t.userId)],
);

/** Verification ("blue tick") and claim requests. Both require human review. */
export const artistVerificationRequests = pgTable(
  "artist_verification_requests",
  {
    id: uuid().primaryKey().defaultRandom(),
    artistId: uuid()
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    requesterId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: verificationRequestType().notNull(),
    message: text(),
    /** Links, ID document upload keys, distributor statements, social proof, etc. */
    evidence: jsonb().$type<{ links?: string[]; uploadIds?: string[]; contactPhone?: string }>().notNull().default({}),
    status: reviewStatus().notNull().default("pending"),
    reviewerId: text().references(() => users.id, { onDelete: "set null" }),
    reviewNote: text(),
    reviewedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index().on(t.status, t.createdAt),
    index().on(t.artistId),
    // Only one open request of each type per artist/requester.
    uniqueIndex("artist_verification_open_uq")
      .on(t.artistId, t.requesterId, t.type)
      .where(sql`status = 'pending'`),
  ],
);

// ---------------------------------------------------------------------------
// Releases (singles, EPs, albums)
// ---------------------------------------------------------------------------
export const releases = pgTable(
  "releases",
  {
    id: uuid().primaryKey().defaultRandom(),
    artistId: uuid()
      .notNull()
      .references(() => artists.id, { onDelete: "restrict" }),
    labelId: uuid().references(() => labels.id, { onDelete: "set null" }),
    slug: text().notNull(),
    title: text().notNull(),
    type: releaseType().notNull().default("single"),
    description: text(),
    artworkKey: text(),
    releaseDate: date({ mode: "string" }),
    upc: text(),
    copyrightLine: text(),
    status: publicationStatus().notNull().default("draft"),
    publishedAt: timestamp({ withTimezone: true }),
    isDemo: boolean().notNull().default(false),
    searchVector: tsvector().generatedAlwaysAs(sql`to_tsvector('simple', coalesce(title, ''))`),
    ...timestamps,
  },
  (t) => [
    uniqueIndex().on(t.artistId, t.slug),
    index().on(t.status, t.releaseDate),
    index("releases_search_idx").using("gin", t.searchVector),
    index("releases_title_trgm_idx").using("gin", t.title.op("gin_trgm_ops")),
  ],
);

// ---------------------------------------------------------------------------
// Tracks
// ---------------------------------------------------------------------------
export const tracks = pgTable(
  "tracks",
  {
    id: uuid().primaryKey().defaultRandom(),
    artistId: uuid()
      .notNull()
      .references(() => artists.id, { onDelete: "restrict" }),
    releaseId: uuid().references(() => releases.id, { onDelete: "set null" }),
    trackNumber: integer(),
    slug: text().notNull(),
    title: text().notNull(),
    /** Display string for featured artists, e.g. "Chef 187, Yo Maps". Structured links in track_credits. */
    featuring: text(),
    genreId: uuid().references(() => genres.id, { onDelete: "set null" }),
    description: text(),
    lyrics: text(),
    isrc: text(),
    copyrightLine: text(),
    isExplicit: boolean().notNull().default(false),
    releaseDate: date({ mode: "string" }),
    /** Optional per-track artwork; falls back to the release artwork. */
    artworkKey: text(),

    // Audio (stored in object storage, never in Postgres)
    audioUploadId: uuid(),
    /** Object key of the file served to players. */
    streamKey: text(),
    streamMimeType: text(),
    durationMs: integer(),

    status: publicationStatus().notNull().default("draft"),
    rejectionReason: text(),
    publishedAt: timestamp({ withTimezone: true }),
    removedAt: timestamp({ withTimezone: true }),
    isDemo: boolean().notNull().default(false),
    searchVector: tsvector().generatedAlwaysAs(
      sql`to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(featuring, ''))`,
    ),
    ...timestamps,
  },
  (t) => [
    uniqueIndex().on(t.artistId, t.slug),
    index().on(t.releaseId, t.trackNumber),
    index().on(t.status, t.publishedAt),
    index().on(t.genreId),
    index().on(t.isrc),
    index("tracks_search_idx").using("gin", t.searchVector),
    index("tracks_title_trgm_idx").using("gin", t.title.op("gin_trgm_ops")),
    check("tracks_duration_positive", sql`${t.durationMs} IS NULL OR ${t.durationMs} > 0`),
  ],
);

/** Structured credits linking tracks to artist profiles (or free-text names for unregistered contributors). */
export const trackCredits = pgTable(
  "track_credits",
  {
    id: uuid().primaryKey().defaultRandom(),
    trackId: uuid()
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    artistId: uuid().references(() => artists.id, { onDelete: "set null" }),
    name: text().notNull(),
    role: trackCreditRole().notNull(),
    position: integer().notNull().default(0),
  },
  (t) => [index().on(t.trackId), index().on(t.artistId, t.role)],
);

// ---------------------------------------------------------------------------
// Uploads (presigned, direct-to-storage)
// ---------------------------------------------------------------------------
export const uploads = pgTable(
  "uploads",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    artistId: uuid().references(() => artists.id, { onDelete: "cascade" }),
    kind: uploadKind().notNull(),
    bucket: text().notNull(),
    objectKey: text().notNull().unique(),
    originalFilename: text().notNull(),
    mimeType: text().notNull(),
    sizeBytes: bigint({ mode: "number" }).notNull(),
    /** Client-computed SHA-256, re-verified during processing; used for duplicate detection. */
    sha256: text(),
    status: uploadStatus().notNull().default("pending"),
    error: text(),
    /** Extracted metadata (duration, bitrate, sample rate, embedded tags). */
    metadata: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
  },
  (t) => [index().on(t.userId, t.createdAt), index().on(t.sha256), index().on(t.status)],
);

// ---------------------------------------------------------------------------
// Submissions (review queue)
// ---------------------------------------------------------------------------
export const musicSubmissions = pgTable(
  "music_submissions",
  {
    id: uuid().primaryKey().defaultRandom(),
    artistId: uuid()
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    releaseId: uuid().references(() => releases.id, { onDelete: "cascade" }),
    trackId: uuid().references(() => tracks.id, { onDelete: "cascade" }),
    submittedById: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** The uploader's rights declaration — required to submit. */
    rightsConfirmed: boolean().notNull(),
    rightsConfirmedAt: timestamp({ withTimezone: true }).notNull(),
    rightsStatementVersion: text().notNull(),
    status: reviewStatus().notNull().default("pending"),
    reviewerId: text().references(() => users.id, { onDelete: "set null" }),
    reviewNote: text(),
    reviewedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index().on(t.status, t.createdAt),
    index().on(t.artistId),
    check("music_submissions_target", sql`${t.releaseId} IS NOT NULL OR ${t.trackId} IS NOT NULL`),
    check("music_submissions_rights", sql`${t.rightsConfirmed} = true`),
  ],
);
