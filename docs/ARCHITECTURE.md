# Zed Music Online — Architecture

## Overview

```
Browser / PWA ──► Vercel (Next.js 16, App Router, Cache Components)
                    │  ├─ Server Components + Route Handlers (Node runtime)
                    │  ├─ Better Auth  (/api/auth/*)
                    │  └─ Vercel Cron  → /api/cron/* (aggregation, charts, syncs)
                    │
                    ├──► Neon PostgreSQL (pooled via PgBouncer; node-postgres driver)
                    ├──► Cloudflare R2  (audio: private bucket, presigned URLs;
                    │                    media: public bucket behind media.zedmusic.online)
                    └──► Resend (transactional email)
Browser ──(presigned PUT / GET with Range)──► R2   (large files never pass through Vercel)
```

## Key decisions

| Area | Decision | Why |
|---|---|---|
| Framework | Next.js 16 with Cache Components | Static shells + streamed dynamic content; public pages cached with `"use cache"` and invalidated by tag. |
| DB driver | `pg` (node-postgres) + Drizzle ORM | Same code locally, in tests and on Vercel; full interactive transactions; `attachDatabasePool` for Fluid compute. Use Neon's **pooled** URL at runtime and the **direct** URL for migrations. |
| Auth | Better Auth 1.x | Stable, self-hosted, data in our Postgres. Email+password with verification, password reset, Google OAuth, DB-backed rate limits (serverless instances don't share memory). Auth.js v5 was still in beta. |
| Storage | Cloudflare R2 | S3-compatible and **zero egress fees** — the dominant cost for a streaming service. |
| Search | Postgres full-text (`simple` config) + `pg_trgm` | No extra service; trigram matching tolerates misspellings of Zambian names. Upgrade path: Meilisearch/Typesense if needed. |
| Jobs | Vercel Cron → idempotent route handlers | Aggregation is SQL `INSERT … SELECT … ON CONFLICT` per day, so any day can be recomputed safely. |

## Authorisation model

* `users.role` = account type: `listener | artist | manager | label | admin`.
* Access to an artist's private data requires an **active** row in `artist_members` (owner / manager / editor / analyst) or `label_members` for the artist's label. Account type alone grants nothing — this is what stops one artist seeing another's analytics.
* Rules are pure functions in `src/lib/auth/permissions.ts` (unit-tested); `src/lib/auth/session.ts` is the Data Access Layer used by pages, server actions and API routes.
* Admin can only be granted with `npm run admin:grant -- <email>` (audit-logged). The proxy (`src/proxy.ts`) only does an optimistic cookie check.
* Suspended accounts are blocked at session creation and in the DAL.

## Data model (main entities)

| Domain | Tables |
|---|---|
| Identity | `users`, `sessions`, `accounts`, `verifications`, `rate_limits` |
| Catalogue | `artists`, `artist_members`, `artist_verification_requests`, `labels`, `label_members`, `releases`, `tracks`, `track_credits`, `genres`, `uploads`, `music_submissions` |
| Social | `playlists`, `playlist_tracks`, `follows`, `track_likes`, `notifications` |
| Analytics (on-platform) | `stream_rule_sets`, `play_sessions` (raw), `track_daily_stats`, `track_daily_country_stats`, `artist_daily_stats`, `aggregation_runs`, `fraud_signals` |
| External data | `external_connections`, `external_reports`, `external_metrics` |
| Charts | `chart_definitions`, `chart_periods`, `chart_entries`, `chart_snapshots` |
| Trust & safety | `content_reports`, `copyright_complaints`, `artist_disputes`, `moderation_actions`, `announcements` |
| System | `audit_logs`, `platform_settings` |

Integrity guarantees enforced by the database (covered by integration tests):

* Submissions cannot exist without a rights confirmation (`CHECK`).
* One open verification/claim request per artist/requester/type (partial unique index).
* Chart entries: unique rank and unique track per period; at most one **published** chart per chart/period.
* Tracks referenced by chart entries cannot be deleted (`ON DELETE RESTRICT`) — published history is immutable.
* The same external report file cannot be imported twice for an artist.
* `is_demo` flags on artists/releases/tracks; demo rows are excluded from charts and admin totals.

## Upload pipeline (Phase 2)

1. Client asks `/api/uploads` for a presigned PUT URL (auth + `artist:upload` check, MIME/size validation, SHA-256 duplicate check). An `uploads` row is created as `pending`.
2. Browser uploads directly to R2 with progress (XHR `upload.onprogress`).
3. Client confirms; server `HEAD`s the object to verify size/type, extracts metadata (duration via `music-metadata` reading the first bytes with a ranged GET), marks `ready`.
4. Artist fills metadata, confirms rights, submits → `music_submissions` (pending review) → admin approves → track `published`.

Limits: MP3/AAC/WAV/FLAC, up to 200 MB per file (configurable). No transcoding in v1: MP3/AAC are streamed as uploaded; WAV/FLAC need a transcode worker (see Limitations).

## Streaming (Phase 2–3)

* `/api/play` validates the track is published, creates a `play_sessions` row and returns a short-lived presigned R2 GET URL (R2 honours `Range`, so seeking works on iOS/Android) plus the play-session id.
* The player sends heartbeats with the session id. The server credits listening time bounded by wall-clock time since the previous heartbeat, so a client cannot claim 30 s after 2 s.
* Qualification and caps are evaluated server-side using the active `stream_rule_sets` row (see `docs/STREAM-QUALIFICATION.md`).

## Charts (Phase 4)

Computed by a cron job from `track_daily_stats` for the closed period, with the data cut-off recorded, ranked deterministically, then written as `pending_review`. Admin approval publishes it and writes an immutable `chart_snapshots` row with an input hash so the result can be recomputed and verified.

## Known limitations

* **Lossless uploads**: WAV/FLAC are large and not universally playable on iOS Safari (FLAC). A transcoding step (e.g. a small worker on Cloudflare/Fly using ffmpeg) is needed before accepting them for streaming; until then they'll be stored but streamed only if browser-compatible.
* **Vercel plan**: Vercel Hobby is for non-commercial use and its cron runs at most daily. A commercial launch needs Vercel Pro.
* **Cache Components**: unknown `/legal/*` slugs render the 404 page with `noindex` but an HTTP 200 (`dynamicParams` isn't available with Cache Components).
