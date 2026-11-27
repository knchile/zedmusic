# External platform integrations

Principle: we only show numbers we can actually obtain through an official API, an
authorised export, or a distributor statement. No scraping, no dashboard log-ins on an
artist's behalf, no invented figures. API terms change frequently — **re-verify each
platform's current terms and quotas when activating it** (Phase 5).

## Capability matrix (as assessed November 2026)

| Platform | Official access | Per-track play counts? | Plan |
|---|---|---|---|
| **YouTube / YouTube Music** | YouTube Data API v3 (API key): public view/like counts per video. YouTube Analytics API (OAuth by the channel owner): views, watch time, geography by day. | **Yes** — public views (near real-time) and, with OAuth, detailed daily analytics. YouTube Music plays of art tracks are not separately exposed. | Best integration. Public video stats via API key; artist connects channel via OAuth for daily analytics. Default quota is 10,000 units/day — sync in batches. |
| **Spotify** | Web API (client credentials): catalogue metadata, artist followers, 0–100 popularity index. Spotify has restricted Web API access for new apps since 2024; check what development/extended quota mode allows today. | **No.** Stream counts are only in Spotify for Artists, which has no public API. | Show followers/popularity (labelled as Spotify's index, not streams) where permitted. Streams via Spotify for Artists CSV export or distributor statements. |
| **Apple Music** | Apple Music API (MusicKit developer token): catalogue metadata only. | **No.** Apple Music for Artists has no public analytics API. | Link releases; streams via distributor statements / CSV. |
| **Audiomack** | Has a developer API requiring approval (OAuth 1.0a). Public play counts are shown on Audiomack pages. | **Possibly**, if approved — to be confirmed with Audiomack. | Apply for API access; until approved, manual/CSV reports. |
| **Boomplay** | No public analytics API known. Boomplay for Artists dashboard only. | **No** (via API). | CSV/distributor reports. Approach Boomplay for a data partnership (strong in Zambia). |
| **Deezer / TIDAL** | Public catalogue APIs only. | No. | Distributor reports. |
| **Distributors** (DistroKid, TuneCore, CD Baby, Africori, Ditto, etc.) | Monthly statement exports (CSV/XLSX), usually 1–3 months in arrears. | **Yes**, monthly, per platform/country/ISRC. | Primary path for verified external numbers. Parsers per distributor format. |

## Data model

* `external_connections` — OAuth/public-API/manual link per artist and platform; tokens AES-256-GCM encrypted (`TOKEN_ENCRYPTION_KEY`).
* `external_reports` — one import (CSV, distributor statement, API sync batch) with period, granularity, source, file hash (no duplicates), and `verification_status`.
* `external_metrics` — normalised rows (metric, value, period, country, ISRC), matched to catalogue tracks by ISRC.

## Verification levels shown to artists

1. **Zed Music Online** — measured by us (`track_daily_stats`).
2. **Verified external** — from an official API, or a statement checked by staff.
3. **Unverified / estimated external** — artist-supplied and not yet checked; never used in charts.

These are always displayed separately with source, period and import time. Monthly data is
labelled monthly — never presented as real-time.

## Charts

External data is excluded from methodology v1. It may be added only if it is verified,
covers exactly the same chart period, and its weighting and justification are published
first (`chart_definitions.weights` requires a justification per platform).

## Credentials needed to activate (Phase 5)

* Google Cloud project with YouTube Data API v3 + YouTube Analytics API enabled; OAuth consent screen verification (sensitive scopes) — allow several weeks.
* Spotify developer app (and extended quota if required).
* Audiomack API approval.
* Boomplay: business contact for a data partnership.
