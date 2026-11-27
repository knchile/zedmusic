# Deployment guide

Order: Neon → Resend → (R2) → Vercel → domain → first admin.

## 1. Neon (PostgreSQL)

1. Create a project at neon.tech, region with the best latency to Zambia among those offered (typically Frankfurt, `aws-eu-central-1`; measure before committing).
2. Create database `zedmusic`.
3. Copy two connection strings:
   * **Pooled** (host contains `-pooler`) → `DATABASE_URL`
   * **Direct** → `DATABASE_URL_UNPOOLED`
4. Optional: enable Neon branching for preview deployments.

## 2. Resend (email)

1. Create an account, add domain `zedmusic.online`, add the DNS records Resend shows (SPF `TXT`, DKIM `CNAME`/`TXT`, optional DMARC `TXT _dmarc`).
2. Create an API key → `RESEND_API_KEY`. Set `EMAIL_FROM="Zed Music Online <no-reply@zedmusic.online>"`.

Without email, users cannot confirm their accounts in production.

## 3. Cloudflare R2 (needed from Phase 2)

1. Create buckets `zedmusic-audio` (private) and `zedmusic-media`.
2. On `zedmusic-media`, connect custom domain `media.zedmusic.online` (requires the domain's DNS on Cloudflare, or use the R2 public dev URL temporarily).
3. Create an R2 API token with Object Read & Write on both buckets → `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`; endpoint `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.
4. CORS on both buckets: allow `PUT, GET, HEAD` from `https://www.zedmusic.online` (and preview domains), expose `ETag, Content-Length, Content-Range, Accept-Ranges`.

## 4. Vercel

1. Import the GitHub repo. Framework preset: Next.js. Node 22.
2. Add environment variables from `.env.example` (Production and Preview).
3. Build command — run migrations before building:
   ```
   npm run db:migrate && npm run db:seed && npm run build
   ```
   Migrations are transactional and skip already-applied files; the seed only inserts missing reference rows. (For previews, point `DATABASE_URL*` at a Neon branch, not production.)
4. Plan: Hobby is limited to non-commercial use and daily cron jobs. Use **Pro** for launch.

## 5. Domain: zedmusic.online

In Vercel → Project → Settings → Domains add `www.zedmusic.online` (primary) and `zedmusic.online` (redirect to www). At your DNS provider:

| Type | Name | Value |
|---|---|---|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

Vercel may show project-specific values — always use the exact records shown in the Domains screen. Keep the Resend records and the R2 `media` record alongside. Set `NEXT_PUBLIC_APP_URL=https://www.zedmusic.online`.

## 6. Google sign-in (optional)

Google Cloud Console → OAuth client (Web). Authorised redirect URI:
`https://www.zedmusic.online/api/auth/callback/google`. Set `GOOGLE_CLIENT_ID/SECRET`.

## 7. First administrator

1. Sign up on the live site and confirm the email.
2. From a machine with `DATABASE_URL` set to production:
   ```
   npm run admin:grant -- you@example.com
   ```

## 8. Verify

* `GET /api/health` → `{"status":"ok","database":"ok", ...}` and lists which services are configured.
* Sign up, confirm email, sign in, reset password.
* The admin dashboard's "Service configuration" panel shows anything still missing.
