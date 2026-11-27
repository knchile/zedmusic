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

## Upload pipeline (implemented)

1. Browser computes a streaming SHA-256 (audio only, `hash-wasm`, 4 MB chunks so phones don't run out of memory) and calls `POST /api/uploads` → checks `artist:upload` / `artist:edit-profile`, type/size policy (`src/lib/storage/policy.ts`), hourly rate limit, and duplicate recordings (same hash on a live track → 409, distinguishing own vs another artist's). Creates an `uploads` row (`pending`) and returns a presigned PUT URL bound to content type and size.
2. Browser uploads **directly to storage** with progress (XHR). Large files never pass through Vercel functions.
3. `POST /api/uploads/:id/complete` → `HEAD` the object (size must match), then inspect: audio via `music-metadata` over **byte-range reads** (`@tokenizer/range`), so a 200 MB WAV is never downloaded in full; images via `sharp` (artwork must be square ≥1000 px). Failed files are deleted and marked `failed`.
4. Artist adds metadata (credits → `track_credits`, ISRC validation), confirms rights → `music_submissions` (stores the upload-terms version). Release and tracks become `pending_review` and are locked.
5. Admin approves (release + tracks `published` atomically, artist notified, audit + moderation log, catalogue caches revalidated) or requests changes with a required note.

Limits: MP3, M4A/AAC, WAV, FLAC; 10 s – 4 h; ≤200 MB. No transcoding yet — originals are streamed (see Limitations).

## Player (implemented)

* One `HTMLAudioElement` owned by a module-level store (`src/components/player/store.ts`), mounted in the `(site)` layout, so playback survives client navigation. Pure queue logic (shuffle, repeat, previous) is in `queue.ts` and unit-tested.
* `POST /api/play/:trackId` returns a 1-hour presigned GET URL (R2 honours `Range`, so seeking works on iOS/Android). URLs are refreshed automatically near expiry or after a network error, resuming from the same position.
* Media Session API (lock-screen/headset controls), `playsInline` for iOS, autoplay-restriction handling, keyboard shortcuts (Space, Shift+N/P), queue persisted to `localStorage`.
* Mobile: compact bar above the tab bar + full-screen player; desktop: bottom bar with queue panel and volume.

## Streaming analytics (Phase 3)

## Charts (Phase 4)

Computed by a cron job from `track_daily_stats` for the closed period, with the data cut-off recorded, ranked deterministically, then written as `pending_review`. Admin approval publishes it and writes an immutable `chart_snapshots` row with an input hash so the result can be recomputed and verified.

## Known limitations

* **No transcoding yet**: WAV/FLAC/high-bitrate files are streamed as uploaded. That works in modern browsers but costs listeners mobile data (a 4-minute WAV ≈ 40 MB). Recommended next step: an ffmpeg worker (Cloudflare Container/Fly.io/Railway, a few dollars a month) producing 128 kbps AAC + 256 kbps versions.
* **Recently played** and popularity-ordered "top songs" depend on play sessions (Phase 3); artist pages currently order songs newest-first.
* **Vercel plan**: Vercel Hobby is for non-commercial use and its cron runs at most daily. A commercial launch needs Vercel Pro.
* **Cache Components**: unknown `/legal/*` slugs render the 404 page with `noindex` but an HTTP 200 (`dynamicParams` isn't available with Cache Components).
