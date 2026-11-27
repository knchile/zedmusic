CREATE TYPE "public"."account_status" AS ENUM('active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."announcement_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."artist_member_role" AS ENUM('owner', 'manager', 'editor', 'analyst');--> statement-breakpoint
CREATE TYPE "public"."artist_profile_origin" AS ENUM('self_registered', 'platform_created');--> statement-breakpoint
CREATE TYPE "public"."artist_profile_state" AS ENUM('active', 'suspended', 'merged');--> statement-breakpoint
CREATE TYPE "public"."artist_verification_status" AS ENUM('unverified', 'pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."case_status" AS ENUM('open', 'in_review', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."chart_period_status" AS ENUM('computing', 'pending_review', 'approved', 'published', 'rejected', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."chart_period_type" AS ENUM('weekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."copyright_status" AS ENUM('received', 'in_review', 'content_removed', 'rejected', 'counter_notice', 'restored', 'closed');--> statement-breakpoint
CREATE TYPE "public"."data_verification_status" AS ENUM('unverified', 'pending', 'verified', 'estimated', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."dispute_type" AS ENUM('duplicate_profile', 'wrong_attribution', 'ownership', 'impersonation', 'other');--> statement-breakpoint
CREATE TYPE "public"."external_connection_status" AS ENUM('pending', 'connected', 'error', 'revoked', 'disconnected');--> statement-breakpoint
CREATE TYPE "public"."external_connection_type" AS ENUM('oauth', 'public_api', 'manual_reports');--> statement-breakpoint
CREATE TYPE "public"."external_metric" AS ENUM('streams', 'views', 'listeners', 'followers', 'saves');--> statement-breakpoint
CREATE TYPE "public"."external_platform" AS ENUM('spotify', 'apple_music', 'youtube', 'youtube_music', 'audiomack', 'boomplay', 'deezer', 'tidal', 'mdundo', 'distributor', 'other');--> statement-breakpoint
CREATE TYPE "public"."external_report_source" AS ENUM('csv_upload', 'distributor_report', 'api_sync');--> statement-breakpoint
CREATE TYPE "public"."fraud_signal_status" AS ENUM('open', 'dismissed', 'confirmed');--> statement-breakpoint
CREATE TYPE "public"."label_member_role" AS ENUM('owner', 'admin', 'analyst');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('pending', 'active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."play_session_status" AS ENUM('open', 'qualified', 'unqualified', 'flagged', 'invalidated');--> statement-breakpoint
CREATE TYPE "public"."publication_status" AS ENUM('draft', 'processing', 'pending_review', 'published', 'rejected', 'removed');--> statement-breakpoint
CREATE TYPE "public"."release_type" AS ENUM('single', 'ep', 'album');--> statement-breakpoint
CREATE TYPE "public"."report_granularity" AS ENUM('daily', 'weekly', 'monthly', 'lifetime');--> statement-breakpoint
CREATE TYPE "public"."report_target_type" AS ENUM('track', 'release', 'artist', 'playlist', 'user');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'approved', 'rejected', 'changes_requested', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."track_credit_role" AS ENUM('primary', 'featured', 'producer', 'composer', 'songwriter', 'remixer');--> statement-breakpoint
CREATE TYPE "public"."upload_kind" AS ENUM('audio', 'artwork', 'avatar', 'cover', 'report', 'evidence');--> statement-breakpoint
CREATE TYPE "public"."upload_status" AS ENUM('pending', 'uploaded', 'processing', 'ready', 'failed', 'rejected_duplicate');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('listener', 'artist', 'manager', 'label', 'admin');--> statement-breakpoint
CREATE TYPE "public"."verification_request_type" AS ENUM('verification', 'claim');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limits_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'listener' NOT NULL,
	"status" "account_status" DEFAULT 'active' NOT NULL,
	"username" text,
	"country" text DEFAULT 'ZM',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artist_members" (
	"artist_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "artist_member_role" NOT NULL,
	"status" "membership_status" DEFAULT 'pending' NOT NULL,
	"granted_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "artist_members_artist_id_user_id_pk" PRIMARY KEY("artist_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "artist_verification_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"requester_id" text NOT NULL,
	"type" "verification_request_type" NOT NULL,
	"message" text,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"reviewer_id" text,
	"review_note" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"bio" text,
	"location" text,
	"country" text DEFAULT 'ZM' NOT NULL,
	"primary_genre_id" uuid,
	"avatar_key" text,
	"cover_key" text,
	"social_links" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"label_id" uuid,
	"origin" "artist_profile_origin" DEFAULT 'self_registered' NOT NULL,
	"verification_status" "artist_verification_status" DEFAULT 'unverified' NOT NULL,
	"verified_at" timestamp with time zone,
	"state" "artist_profile_state" DEFAULT 'active' NOT NULL,
	"merged_into_id" uuid,
	"is_emerging" boolean DEFAULT true NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(location, ''))) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "artists_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "genres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "genres_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "label_members" (
	"label_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "label_member_role" DEFAULT 'analyst' NOT NULL,
	"status" "membership_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "label_members_label_id_user_id_pk" PRIMARY KEY("label_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "labels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"logo_key" text,
	"website" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "labels_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "music_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"release_id" uuid,
	"track_id" uuid,
	"submitted_by_id" text NOT NULL,
	"rights_confirmed" boolean NOT NULL,
	"rights_confirmed_at" timestamp with time zone NOT NULL,
	"rights_statement_version" text NOT NULL,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"reviewer_id" text,
	"review_note" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "music_submissions_target" CHECK ("music_submissions"."release_id" IS NOT NULL OR "music_submissions"."track_id" IS NOT NULL),
	CONSTRAINT "music_submissions_rights" CHECK ("music_submissions"."rights_confirmed" = true)
);
--> statement-breakpoint
CREATE TABLE "releases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"label_id" uuid,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"type" "release_type" DEFAULT 'single' NOT NULL,
	"description" text,
	"artwork_key" text,
	"release_date" date,
	"upc" text,
	"copyright_line" text,
	"status" "publication_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"is_demo" boolean DEFAULT false NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce(title, ''))) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "track_credits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track_id" uuid NOT NULL,
	"artist_id" uuid,
	"name" text NOT NULL,
	"role" "track_credit_role" NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"release_id" uuid,
	"track_number" integer,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"featuring" text,
	"genre_id" uuid,
	"description" text,
	"lyrics" text,
	"isrc" text,
	"copyright_line" text,
	"is_explicit" boolean DEFAULT false NOT NULL,
	"release_date" date,
	"artwork_key" text,
	"audio_upload_id" uuid,
	"stream_key" text,
	"stream_mime_type" text,
	"duration_ms" integer,
	"status" "publication_status" DEFAULT 'draft' NOT NULL,
	"rejection_reason" text,
	"published_at" timestamp with time zone,
	"removed_at" timestamp with time zone,
	"is_demo" boolean DEFAULT false NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(featuring, ''))) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tracks_duration_positive" CHECK ("tracks"."duration_ms" IS NULL OR "tracks"."duration_ms" > 0)
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"artist_id" uuid,
	"kind" "upload_kind" NOT NULL,
	"bucket" text NOT NULL,
	"object_key" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"sha256" text,
	"status" "upload_status" DEFAULT 'pending' NOT NULL,
	"error" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uploads_objectKey_unique" UNIQUE("object_key")
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"user_id" text NOT NULL,
	"artist_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follows_user_id_artist_id_pk" PRIMARY KEY("user_id","artist_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"link" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playlist_tracks" (
	"playlist_id" uuid NOT NULL,
	"track_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"added_by_id" text,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "playlist_tracks_playlist_id_track_id_pk" PRIMARY KEY("playlist_id","track_id")
);
--> statement-breakpoint
CREATE TABLE "playlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"cover_key" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"is_editorial" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "track_likes" (
	"user_id" text NOT NULL,
	"track_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "track_likes_user_id_track_id_pk" PRIMARY KEY("user_id","track_id")
);
--> statement-breakpoint
CREATE TABLE "aggregation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job" text NOT NULL,
	"range_start" date NOT NULL,
	"range_end" date NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"rows_affected" integer,
	"error" text,
	"triggered_by_id" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "artist_daily_stats" (
	"day" date NOT NULL,
	"artist_id" uuid NOT NULL,
	"plays" integer DEFAULT 0 NOT NULL,
	"qualified_streams" integer DEFAULT 0 NOT NULL,
	"authenticated_streams" integer DEFAULT 0 NOT NULL,
	"unique_listeners" integer DEFAULT 0 NOT NULL,
	"listened_ms" bigint DEFAULT 0 NOT NULL,
	"rule_set_version" integer NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"new_followers" integer DEFAULT 0 NOT NULL,
	"lost_followers" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "artist_daily_stats_day_artist_id_pk" PRIMARY KEY("day","artist_id")
);
--> statement-breakpoint
CREATE TABLE "fraud_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"signal_type" text NOT NULL,
	"severity" smallint DEFAULT 1 NOT NULL,
	"play_session_id" uuid,
	"track_id" uuid,
	"artist_id" uuid,
	"listener_key" text,
	"ip_hash" text,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "fraud_signal_status" DEFAULT 'open' NOT NULL,
	"reviewed_by_id" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "play_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track_id" uuid NOT NULL,
	"artist_id" uuid NOT NULL,
	"user_id" text,
	"listener_key" text NOT NULL,
	"ip_hash" text,
	"user_agent_hash" text,
	"country" text,
	"device_type" text,
	"context" text,
	"track_duration_ms" integer NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_heartbeat_at" timestamp with time zone,
	"heartbeat_count" integer DEFAULT 0 NOT NULL,
	"reported_listened_ms" integer DEFAULT 0 NOT NULL,
	"credited_listened_ms" integer DEFAULT 0 NOT NULL,
	"stream_date" date NOT NULL,
	"status" "play_session_status" DEFAULT 'open' NOT NULL,
	"status_reason" text,
	"rule_set_version" integer,
	"qualified_at" timestamp with time zone,
	"risk_score" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stream_rule_sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"version" integer NOT NULL,
	"min_listen_seconds" integer DEFAULT 30 NOT NULL,
	"min_track_seconds" integer DEFAULT 60 NOT NULL,
	"max_daily_streams_per_listener_track" integer DEFAULT 5 NOT NULL,
	"max_daily_streams_per_listener" integer DEFAULT 300 NOT NULL,
	"max_daily_streams_per_ip_track" integer DEFAULT 50 NOT NULL,
	"charts_require_authenticated_listener" boolean DEFAULT true NOT NULL,
	"notes" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stream_rule_sets_version_unique" UNIQUE("version")
);
--> statement-breakpoint
CREATE TABLE "track_daily_country_stats" (
	"day" date NOT NULL,
	"track_id" uuid NOT NULL,
	"country" text NOT NULL,
	"qualified_streams" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "track_daily_country_stats_day_track_id_country_pk" PRIMARY KEY("day","track_id","country")
);
--> statement-breakpoint
CREATE TABLE "track_daily_stats" (
	"day" date NOT NULL,
	"track_id" uuid NOT NULL,
	"artist_id" uuid NOT NULL,
	"plays" integer DEFAULT 0 NOT NULL,
	"qualified_streams" integer DEFAULT 0 NOT NULL,
	"authenticated_streams" integer DEFAULT 0 NOT NULL,
	"unique_listeners" integer DEFAULT 0 NOT NULL,
	"listened_ms" bigint DEFAULT 0 NOT NULL,
	"rule_set_version" integer NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"playlist_adds" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "track_daily_stats_day_track_id_pk" PRIMARY KEY("day","track_id")
);
--> statement-breakpoint
CREATE TABLE "external_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"platform" "external_platform" NOT NULL,
	"type" "external_connection_type" NOT NULL,
	"external_account_id" text,
	"external_url" text,
	"display_name" text,
	"status" "external_connection_status" DEFAULT 'pending' NOT NULL,
	"access_token_enc" text,
	"refresh_token_enc" text,
	"token_expires_at" timestamp with time zone,
	"scopes" text,
	"last_synced_at" timestamp with time zone,
	"last_error" text,
	"connected_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "external_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"artist_id" uuid NOT NULL,
	"track_id" uuid,
	"platform" "external_platform" NOT NULL,
	"isrc" text,
	"external_track_ref" text,
	"external_track_title" text,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"granularity" "report_granularity" NOT NULL,
	"metric" "external_metric" NOT NULL,
	"value" bigint NOT NULL,
	"country" text DEFAULT 'ALL' NOT NULL,
	"verification_status" "data_verification_status" DEFAULT 'unverified' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "external_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"connection_id" uuid,
	"platform" "external_platform" NOT NULL,
	"source" "external_report_source" NOT NULL,
	"source_name" text,
	"upload_id" uuid,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"granularity" "report_granularity" NOT NULL,
	"verification_status" "data_verification_status" DEFAULT 'unverified' NOT NULL,
	"verified_by_id" text,
	"verified_at" timestamp with time zone,
	"verification_note" text,
	"row_count" integer DEFAULT 0 NOT NULL,
	"rejected_row_count" integer DEFAULT 0 NOT NULL,
	"import_errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"file_sha256" text,
	"imported_by_id" text,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chart_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"size" integer DEFAULT 10 NOT NULL,
	"period_type" chart_period_type DEFAULT 'weekly' NOT NULL,
	"genre_id" uuid,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"weights" jsonb DEFAULT '{"internal":1}'::jsonb NOT NULL,
	"methodology" text NOT NULL,
	"methodology_version" integer DEFAULT 1 NOT NULL,
	"requires_approval" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chart_definitions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "chart_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_id" uuid NOT NULL,
	"rank" integer NOT NULL,
	"track_id" uuid NOT NULL,
	"artist_id" uuid NOT NULL,
	"track_title" text NOT NULL,
	"artist_name" text NOT NULL,
	"artwork_key" text,
	"score" numeric(18, 4) NOT NULL,
	"qualified_streams" integer NOT NULL,
	"external_units" integer DEFAULT 0 NOT NULL,
	"previous_rank" integer,
	"peak_rank" integer NOT NULL,
	"periods_on_chart" integer DEFAULT 1 NOT NULL,
	"is_new_entry" boolean DEFAULT false NOT NULL,
	"is_re_entry" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chart_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chart_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"status" chart_period_status DEFAULT 'computing' NOT NULL,
	"methodology_snapshot" jsonb NOT NULL,
	"data_cutoff_at" timestamp with time zone NOT NULL,
	"input_hash" text,
	"computed_at" timestamp with time zone,
	"reviewed_by_id" text,
	"reviewed_at" timestamp with time zone,
	"review_note" text,
	"published_at" timestamp with time zone,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chart_snapshots" (
	"period_id" uuid PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"input_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text,
	"body" text NOT NULL,
	"cover_key" text,
	"status" "announcement_status" DEFAULT 'draft' NOT NULL,
	"author_id" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "announcements_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "artist_disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "dispute_type" NOT NULL,
	"artist_id" uuid NOT NULL,
	"related_artist_id" uuid,
	"track_id" uuid,
	"reporter_id" text,
	"description" text NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "case_status" DEFAULT 'open' NOT NULL,
	"handled_by_id" text,
	"resolution" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" text,
	"target_type" "report_target_type" NOT NULL,
	"target_id" text NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"status" "case_status" DEFAULT 'open' NOT NULL,
	"handled_by_id" text,
	"resolution" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "copyright_complaints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"complainant_name" text NOT NULL,
	"complainant_email" text NOT NULL,
	"complainant_phone" text,
	"organisation" text,
	"capacity" text NOT NULL,
	"original_work" text NOT NULL,
	"track_id" uuid,
	"infringing_url" text NOT NULL,
	"statement" text NOT NULL,
	"good_faith_declaration" boolean NOT NULL,
	"accuracy_declaration" boolean NOT NULL,
	"signature" text NOT NULL,
	"status" "copyright_status" DEFAULT 'received' NOT NULL,
	"handled_by_id" text,
	"internal_notes" text,
	"counter_notice" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"action" text NOT NULL,
	"reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_members" ADD CONSTRAINT "artist_members_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_members" ADD CONSTRAINT "artist_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_members" ADD CONSTRAINT "artist_members_granted_by_id_users_id_fk" FOREIGN KEY ("granted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_verification_requests" ADD CONSTRAINT "artist_verification_requests_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_verification_requests" ADD CONSTRAINT "artist_verification_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_verification_requests" ADD CONSTRAINT "artist_verification_requests_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artists" ADD CONSTRAINT "artists_primary_genre_id_genres_id_fk" FOREIGN KEY ("primary_genre_id") REFERENCES "public"."genres"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artists" ADD CONSTRAINT "artists_label_id_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."labels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "label_members" ADD CONSTRAINT "label_members_label_id_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."labels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "label_members" ADD CONSTRAINT "label_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_submissions" ADD CONSTRAINT "music_submissions_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_submissions" ADD CONSTRAINT "music_submissions_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_submissions" ADD CONSTRAINT "music_submissions_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_submissions" ADD CONSTRAINT "music_submissions_submitted_by_id_users_id_fk" FOREIGN KEY ("submitted_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_submissions" ADD CONSTRAINT "music_submissions_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "releases" ADD CONSTRAINT "releases_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "releases" ADD CONSTRAINT "releases_label_id_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."labels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_credits" ADD CONSTRAINT "track_credits_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_credits" ADD CONSTRAINT "track_credits_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlist_tracks" ADD CONSTRAINT "playlist_tracks_playlist_id_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlist_tracks" ADD CONSTRAINT "playlist_tracks_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlist_tracks" ADD CONSTRAINT "playlist_tracks_added_by_id_users_id_fk" FOREIGN KEY ("added_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_likes" ADD CONSTRAINT "track_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_likes" ADD CONSTRAINT "track_likes_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aggregation_runs" ADD CONSTRAINT "aggregation_runs_triggered_by_id_users_id_fk" FOREIGN KEY ("triggered_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_daily_stats" ADD CONSTRAINT "artist_daily_stats_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fraud_signals" ADD CONSTRAINT "fraud_signals_play_session_id_play_sessions_id_fk" FOREIGN KEY ("play_session_id") REFERENCES "public"."play_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fraud_signals" ADD CONSTRAINT "fraud_signals_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fraud_signals" ADD CONSTRAINT "fraud_signals_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fraud_signals" ADD CONSTRAINT "fraud_signals_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play_sessions" ADD CONSTRAINT "play_sessions_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play_sessions" ADD CONSTRAINT "play_sessions_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play_sessions" ADD CONSTRAINT "play_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stream_rule_sets" ADD CONSTRAINT "stream_rule_sets_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_daily_country_stats" ADD CONSTRAINT "track_daily_country_stats_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_daily_stats" ADD CONSTRAINT "track_daily_stats_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_daily_stats" ADD CONSTRAINT "track_daily_stats_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_connections" ADD CONSTRAINT "external_connections_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_connections" ADD CONSTRAINT "external_connections_connected_by_id_users_id_fk" FOREIGN KEY ("connected_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_metrics" ADD CONSTRAINT "external_metrics_report_id_external_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."external_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_metrics" ADD CONSTRAINT "external_metrics_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_metrics" ADD CONSTRAINT "external_metrics_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_reports" ADD CONSTRAINT "external_reports_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_reports" ADD CONSTRAINT "external_reports_connection_id_external_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."external_connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_reports" ADD CONSTRAINT "external_reports_upload_id_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."uploads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_reports" ADD CONSTRAINT "external_reports_verified_by_id_users_id_fk" FOREIGN KEY ("verified_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_reports" ADD CONSTRAINT "external_reports_imported_by_id_users_id_fk" FOREIGN KEY ("imported_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chart_definitions" ADD CONSTRAINT "chart_definitions_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chart_entries" ADD CONSTRAINT "chart_entries_period_id_chart_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."chart_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chart_entries" ADD CONSTRAINT "chart_entries_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chart_entries" ADD CONSTRAINT "chart_entries_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chart_periods" ADD CONSTRAINT "chart_periods_chart_id_chart_definitions_id_fk" FOREIGN KEY ("chart_id") REFERENCES "public"."chart_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chart_periods" ADD CONSTRAINT "chart_periods_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chart_snapshots" ADD CONSTRAINT "chart_snapshots_period_id_chart_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."chart_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_disputes" ADD CONSTRAINT "artist_disputes_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_disputes" ADD CONSTRAINT "artist_disputes_related_artist_id_artists_id_fk" FOREIGN KEY ("related_artist_id") REFERENCES "public"."artists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_disputes" ADD CONSTRAINT "artist_disputes_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_disputes" ADD CONSTRAINT "artist_disputes_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_disputes" ADD CONSTRAINT "artist_disputes_handled_by_id_users_id_fk" FOREIGN KEY ("handled_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_handled_by_id_users_id_fk" FOREIGN KEY ("handled_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copyright_complaints" ADD CONSTRAINT "copyright_complaints_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copyright_complaints" ADD CONSTRAINT "copyright_complaints_handled_by_id_users_id_fk" FOREIGN KEY ("handled_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_id_index" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_index" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_role_index" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_created_at_index" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "verifications_identifier_index" ON "verifications" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "artist_members_user_id_index" ON "artist_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "artist_verification_requests_status_created_at_index" ON "artist_verification_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "artist_verification_requests_artist_id_index" ON "artist_verification_requests" USING btree ("artist_id");--> statement-breakpoint
CREATE UNIQUE INDEX "artist_verification_open_uq" ON "artist_verification_requests" USING btree ("artist_id","requester_id","type") WHERE status = 'pending';--> statement-breakpoint
CREATE INDEX "artists_verification_status_index" ON "artists" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "artists_label_id_index" ON "artists" USING btree ("label_id");--> statement-breakpoint
CREATE INDEX "artists_primary_genre_id_index" ON "artists" USING btree ("primary_genre_id");--> statement-breakpoint
CREATE INDEX "artists_search_idx" ON "artists" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "artists_name_trgm_idx" ON "artists" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "label_members_user_id_index" ON "label_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "music_submissions_status_created_at_index" ON "music_submissions" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "music_submissions_artist_id_index" ON "music_submissions" USING btree ("artist_id");--> statement-breakpoint
CREATE UNIQUE INDEX "releases_artist_id_slug_index" ON "releases" USING btree ("artist_id","slug");--> statement-breakpoint
CREATE INDEX "releases_status_release_date_index" ON "releases" USING btree ("status","release_date");--> statement-breakpoint
CREATE INDEX "releases_search_idx" ON "releases" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "releases_title_trgm_idx" ON "releases" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "track_credits_track_id_index" ON "track_credits" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "track_credits_artist_id_role_index" ON "track_credits" USING btree ("artist_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "tracks_artist_id_slug_index" ON "tracks" USING btree ("artist_id","slug");--> statement-breakpoint
CREATE INDEX "tracks_release_id_track_number_index" ON "tracks" USING btree ("release_id","track_number");--> statement-breakpoint
CREATE INDEX "tracks_status_published_at_index" ON "tracks" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "tracks_genre_id_index" ON "tracks" USING btree ("genre_id");--> statement-breakpoint
CREATE INDEX "tracks_isrc_index" ON "tracks" USING btree ("isrc");--> statement-breakpoint
CREATE INDEX "tracks_search_idx" ON "tracks" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "tracks_title_trgm_idx" ON "tracks" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "uploads_user_id_created_at_index" ON "uploads" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "uploads_sha256_index" ON "uploads" USING btree ("sha256");--> statement-breakpoint
CREATE INDEX "uploads_status_index" ON "uploads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "follows_artist_id_created_at_index" ON "follows" USING btree ("artist_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_id_read_at_created_at_index" ON "notifications" USING btree ("user_id","read_at","created_at");--> statement-breakpoint
CREATE INDEX "playlist_tracks_playlist_id_position_index" ON "playlist_tracks" USING btree ("playlist_id","position");--> statement-breakpoint
CREATE INDEX "playlist_tracks_track_id_added_at_index" ON "playlist_tracks" USING btree ("track_id","added_at");--> statement-breakpoint
CREATE UNIQUE INDEX "playlists_owner_id_slug_index" ON "playlists" USING btree ("owner_id","slug");--> statement-breakpoint
CREATE INDEX "playlists_is_public_is_editorial_index" ON "playlists" USING btree ("is_public","is_editorial");--> statement-breakpoint
CREATE INDEX "track_likes_track_id_created_at_index" ON "track_likes" USING btree ("track_id","created_at");--> statement-breakpoint
CREATE INDEX "aggregation_runs_job_started_at_index" ON "aggregation_runs" USING btree ("job","started_at");--> statement-breakpoint
CREATE INDEX "fraud_signals_status_created_at_index" ON "fraud_signals" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "fraud_signals_track_id_index" ON "fraud_signals" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "fraud_signals_open_idx" ON "fraud_signals" USING btree ("severity") WHERE status = 'open';--> statement-breakpoint
CREATE INDEX "play_sessions_track_id_stream_date_status_index" ON "play_sessions" USING btree ("track_id","stream_date","status");--> statement-breakpoint
CREATE INDEX "play_sessions_artist_id_stream_date_index" ON "play_sessions" USING btree ("artist_id","stream_date");--> statement-breakpoint
CREATE INDEX "play_sessions_listener_key_track_id_stream_date_index" ON "play_sessions" USING btree ("listener_key","track_id","stream_date");--> statement-breakpoint
CREATE INDEX "play_sessions_ip_hash_stream_date_index" ON "play_sessions" USING btree ("ip_hash","stream_date");--> statement-breakpoint
CREATE INDEX "play_sessions_user_id_started_at_index" ON "play_sessions" USING btree ("user_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "play_sessions_status_stream_date_index" ON "play_sessions" USING btree ("status","stream_date");--> statement-breakpoint
CREATE INDEX "track_daily_stats_artist_id_day_index" ON "track_daily_stats" USING btree ("artist_id","day");--> statement-breakpoint
CREATE INDEX "track_daily_stats_track_id_day_index" ON "track_daily_stats" USING btree ("track_id","day");--> statement-breakpoint
CREATE UNIQUE INDEX "external_connections_artist_id_platform_external_account_id_index" ON "external_connections" USING btree ("artist_id","platform","external_account_id");--> statement-breakpoint
CREATE INDEX "external_connections_status_index" ON "external_connections" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "external_metrics_row_uq" ON "external_metrics" USING btree ("report_id","external_track_ref","period_start","period_end","metric","country");--> statement-breakpoint
CREATE INDEX "external_metrics_track_id_period_start_index" ON "external_metrics" USING btree ("track_id","period_start");--> statement-breakpoint
CREATE INDEX "external_metrics_artist_id_platform_period_start_index" ON "external_metrics" USING btree ("artist_id","platform","period_start");--> statement-breakpoint
CREATE INDEX "external_metrics_isrc_index" ON "external_metrics" USING btree ("isrc");--> statement-breakpoint
CREATE INDEX "external_reports_artist_id_platform_period_start_index" ON "external_reports" USING btree ("artist_id","platform","period_start");--> statement-breakpoint
CREATE INDEX "external_reports_verification_status_index" ON "external_reports" USING btree ("verification_status");--> statement-breakpoint
CREATE UNIQUE INDEX "external_reports_file_uq" ON "external_reports" USING btree ("artist_id","file_sha256") WHERE file_sha256 IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "chart_entries_period_id_rank_index" ON "chart_entries" USING btree ("period_id","rank");--> statement-breakpoint
CREATE UNIQUE INDEX "chart_entries_period_id_track_id_index" ON "chart_entries" USING btree ("period_id","track_id");--> statement-breakpoint
CREATE INDEX "chart_entries_track_id_index" ON "chart_entries" USING btree ("track_id");--> statement-breakpoint
CREATE UNIQUE INDEX "chart_periods_chart_id_period_start_revision_index" ON "chart_periods" USING btree ("chart_id","period_start","revision");--> statement-breakpoint
CREATE UNIQUE INDEX "chart_periods_published_uq" ON "chart_periods" USING btree ("chart_id","period_start") WHERE status = 'published';--> statement-breakpoint
CREATE INDEX "chart_periods_chart_id_status_period_end_index" ON "chart_periods" USING btree ("chart_id","status","period_end");--> statement-breakpoint
CREATE INDEX "announcements_status_published_at_index" ON "announcements" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "artist_disputes_status_created_at_index" ON "artist_disputes" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "artist_disputes_artist_id_index" ON "artist_disputes" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX "content_reports_status_created_at_index" ON "content_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "content_reports_target_type_target_id_index" ON "content_reports" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "copyright_complaints_status_created_at_index" ON "copyright_complaints" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "copyright_complaints_track_id_index" ON "copyright_complaints" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "moderation_actions_target_type_target_id_index" ON "moderation_actions" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "moderation_actions_created_at_index" ON "moderation_actions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_id_created_at_index" ON "audit_logs" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_type_entity_id_index" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_created_at_index" ON "audit_logs" USING btree ("action","created_at");