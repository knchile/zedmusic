import { pgEnum } from "drizzle-orm/pg-core";

/** Primary account type. Fine-grained artist/label access lives in membership tables. */
export const userRole = pgEnum("user_role", ["listener", "artist", "manager", "label", "admin"]);

export const accountStatus = pgEnum("account_status", ["active", "suspended", "deleted"]);

/** Lifecycle shared by tracks and releases. Only `published` is public. */
export const publicationStatus = pgEnum("publication_status", [
  "draft",
  "processing",
  "pending_review",
  "published",
  "rejected",
  "removed",
]);

export const releaseType = pgEnum("release_type", ["single", "ep", "album"]);

export const artistVerificationStatus = pgEnum("artist_verification_status", [
  "unverified",
  "pending",
  "verified",
  "rejected",
]);

/** Who created the profile. Platform-created profiles can be claimed by the real artist. */
export const artistProfileOrigin = pgEnum("artist_profile_origin", ["self_registered", "platform_created"]);

export const artistProfileState = pgEnum("artist_profile_state", ["active", "suspended", "merged"]);

/** Role a user holds on a specific artist profile. */
export const artistMemberRole = pgEnum("artist_member_role", ["owner", "manager", "editor", "analyst"]);

/** Role a user holds within a record label. */
export const labelMemberRole = pgEnum("label_member_role", ["owner", "admin", "analyst"]);

export const membershipStatus = pgEnum("membership_status", ["pending", "active", "revoked"]);

export const verificationRequestType = pgEnum("verification_request_type", ["verification", "claim"]);

export const reviewStatus = pgEnum("review_status", [
  "pending",
  "approved",
  "rejected",
  "changes_requested",
  "withdrawn",
]);

export const trackCreditRole = pgEnum("track_credit_role", [
  "primary",
  "featured",
  "producer",
  "composer",
  "songwriter",
  "remixer",
]);

export const uploadKind = pgEnum("upload_kind", ["audio", "artwork", "avatar", "cover", "report", "evidence"]);

export const uploadStatus = pgEnum("upload_status", [
  "pending",
  "uploaded",
  "processing",
  "ready",
  "failed",
  "rejected_duplicate",
]);

/** Raw play-session state machine. See docs/STREAM-QUALIFICATION.md */
export const playSessionStatus = pgEnum("play_session_status", [
  "open",
  "qualified",
  "unqualified",
  "flagged",
  "invalidated",
]);

export const fraudSignalStatus = pgEnum("fraud_signal_status", ["open", "dismissed", "confirmed"]);

export const externalPlatform = pgEnum("external_platform", [
  "spotify",
  "apple_music",
  "youtube",
  "youtube_music",
  "audiomack",
  "boomplay",
  "deezer",
  "tidal",
  "mdundo",
  "distributor",
  "other",
]);

export const externalConnectionType = pgEnum("external_connection_type", [
  "oauth",
  "public_api",
  "manual_reports",
]);

export const externalConnectionStatus = pgEnum("external_connection_status", [
  "pending",
  "connected",
  "error",
  "revoked",
  "disconnected",
]);

export const externalReportSource = pgEnum("external_report_source", [
  "csv_upload",
  "distributor_report",
  "api_sync",
]);

/**
 * How much the platform trusts a number:
 * - verified: matched to an authoritative source (official API, distributor statement checked by staff)
 * - unverified: supplied by the artist, not yet checked
 * - estimated: derived or approximated; never used in charts
 * - rejected: failed checks; retained for audit only
 */
export const dataVerificationStatus = pgEnum("data_verification_status", [
  "unverified",
  "pending",
  "verified",
  "estimated",
  "rejected",
]);

export const reportGranularity = pgEnum("report_granularity", ["daily", "weekly", "monthly", "lifetime"]);

export const externalMetric = pgEnum("external_metric", ["streams", "views", "listeners", "followers", "saves"]);

export const chartPeriodType = pgEnum("chart_period_type", ["weekly", "monthly"]);

export const chartPeriodStatus = pgEnum("chart_period_status", [
  "computing",
  "pending_review",
  "approved",
  "published",
  "rejected",
  "superseded",
]);

export const reportTargetType = pgEnum("report_target_type", ["track", "release", "artist", "playlist", "user"]);

export const caseStatus = pgEnum("case_status", ["open", "in_review", "resolved", "dismissed"]);

export const copyrightStatus = pgEnum("copyright_status", [
  "received",
  "in_review",
  "content_removed",
  "rejected",
  "counter_notice",
  "restored",
  "closed",
]);

export const disputeType = pgEnum("dispute_type", [
  "duplicate_profile",
  "wrong_attribution",
  "ownership",
  "impersonation",
  "other",
]);

export const announcementStatus = pgEnum("announcement_status", ["draft", "published", "archived"]);
