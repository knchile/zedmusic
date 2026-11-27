<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project rules (Zed Music Online)

- Cache Components is on: anything reading cookies/headers/searchParams must sit inside `<Suspense>`; public reads use `"use cache"` + `cacheLife` + `cacheTag`.
- All authorisation goes through `src/lib/auth/permissions.ts` (pure rules) and `src/lib/auth/session.ts` (DAL). Artist data access requires an active `artist_members`/`label_members` row — never the account role alone.
- Never fabricate streams, charts, artists or external statistics. Demo data must set `is_demo = true`.
- On-platform stats and external platform metrics live in separate tables and must never be summed without an explicit, documented calculation.
- Schema changes: edit `src/db/schema/*`, run `npm run db:generate`, commit the SQL in `drizzle/`.
- Before committing: `npm run lint && npm run typecheck && npm test` (and `npm run test:integration` with `TEST_DATABASE_URL`).
