# Zed Music Online

Streaming, artist analytics and the official **Zed Music Online Top 10** — dedicated to Zambian music.
Production: https://www.zedmusic.online

**Stack:** Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS 4 · Drizzle ORM · PostgreSQL (Neon) · Better Auth · Cloudflare R2 · Resend · Vercel

## Status

| Phase | Scope | Status |
|---|---|---|
| 1 Foundation | Architecture, design system, full DB schema + migrations, auth (email/password, verification, reset, Google), RBAC, app shell, charts/legal pages, PWA manifest, SEO, tests, CI | ✅ |
| 2 Listener & artist experience | Artist studio & claims, presigned uploads with server-side inspection, review queue, catalogue pages, search, persistent player, likes/follows/playlists | ✅ |
| 3 Analytics | Play sessions, qualification, aggregation, artist dashboards | ⏳ |
| 4 Charts | Chart engine, review/publish, history | ⏳ |
| 5 External integrations | YouTube, CSV/distributor imports, verification | ⏳ |
| 6 Production readiness | Hardening, CSP, performance, E2E tests | ⏳ |

## Local development

Requirements: Node 22+, PostgreSQL 16+ (local or a Neon branch).

```bash
npm install
cp .env.example .env        # set DATABASE_URL, DATABASE_URL_UNPOOLED, BETTER_AUTH_SECRET
npm run db:migrate
npm run db:seed             # genres, stream rules v1, chart definitions
npm run dev
```

Without `RESEND_API_KEY`, emails (verification links, password resets) are printed to the server console in development.

Without R2 credentials, development uses a **local storage driver** (`.data/storage`, served by `/api/dev-storage` with signed URLs and Range support), so uploads and playback work offline. It is disabled in production.

Optional demo catalogue (synthesised tones, labelled "Demo", flagged `is_demo`, local only):

```bash
ALLOW_DEMO_DATA=true npm run db:seed -- --demo
```

Make yourself an admin after signing up and confirming your email:

```bash
npm run admin:grant -- you@example.com
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` / `typecheck` | ESLint / TypeScript |
| `npm test` | Unit tests (Vitest) |
| `npm run test:integration` | DB + auth integration tests. Needs `TEST_DATABASE_URL` (wiped each run) |
| `npm run db:generate` | Generate a migration from schema changes |
| `npm run db:migrate` | Apply migrations (safe to re-run) |
| `npm run db:seed` | Idempotent reference data |
| `npm run admin:grant -- <email> [--revoke]` | Grant/revoke admin (audit-logged) |

## Documentation

* [Architecture](docs/ARCHITECTURE.md)
* [Stream qualification rules](docs/STREAM-QUALIFICATION.md)
* [External integrations — what's possible per platform](docs/EXTERNAL-INTEGRATIONS.md)
* [Deployment, services and DNS](docs/DEPLOYMENT.md)
* [Confirmed decisions](docs/DECISIONS.md)

## Principles

No fake streams, profiles, charts or external statistics. On-platform and external numbers are always stored and shown separately. Demo data is flagged `is_demo` and never reaches production charts.
