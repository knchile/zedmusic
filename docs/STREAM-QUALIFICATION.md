# Stream qualification rules

Status: rules **v1** are stored in `stream_rule_sets` (seeded, active). The play/heartbeat
endpoints that apply them are built in Phase 3. The public summary lives at `/charts/methodology`.

## Definitions

* **Play** — any play session started by the player (`play_sessions` row).
* **Qualified stream** — a play that passes every rule below.
* **Chart stream** — a qualified stream from a signed-in listener (while `chartsRequireAuthenticatedListener = true`).

## Rules (v1)

| Parameter | v1 | Purpose |
|---|---|---|
| `minListenSeconds` | 30 | Minimum *server-credited* listening time |
| `minTrackSeconds` | 60 | Very short tracks never qualify |
| `maxDailyStreamsPerListenerTrack` | 5 | Stops one person looping a song |
| `maxDailyStreamsPerListener` | 300 | ~25 hours of music would be impossible; catches bots |
| `maxDailyStreamsPerIpTrack` | 50 | Shared networks (campus Wi-Fi, carrier NAT) are common in Zambia, so this is generous |
| `chartsRequireAuthenticatedListener` | true | Anonymous plays count in stats, not charts |

Days are calendar days in **Africa/Lusaka** (UTC+2, no DST).

## Server-side validation

1. **Server-issued session**: `/api/play` returns a play-session id signed with `PLAY_TOKEN_SECRET`. Heartbeats without a valid id are rejected.
2. **Credited time** = Σ min(reported delta, wall-clock delta since last heartbeat + 2 s tolerance). Clients can't fast-forward credit.
3. **Listener key** = HMAC(user id, or first-party device id cookie). IPs are stored only as HMACs (`ANALYTICS_HASH_SECRET`).
4. **Caps** are applied in chronological order during aggregation, so the first N plays count and later ones are marked `unqualified` with a reason.
5. **Rate limiting** on play/heartbeat endpoints per listener and per IP hash.

## Fraud signals (written to `fraud_signals` for admin review)

* Burst: many sessions from one IP hash for one track within minutes.
* Loop pattern: back-to-back plays of one track ending just after the threshold.
* Headless/automation user agents, missing JS heartbeat cadence.
* New-account farms: many fresh accounts streaming the same track.
* Concurrency: one listener with overlapping sessions.

Confirmed fraud sets sessions to `invalidated`; the affected days are re-aggregated.

## Recalculation

Raw `play_sessions` are never modified by aggregation (only by fraud review). Aggregates are
rebuilt per day with `INSERT … ON CONFLICT DO UPDATE`, logged in `aggregation_runs`. Changing
rules creates a **new version**; it applies from its effective date and is never applied to
published charts retroactively.
