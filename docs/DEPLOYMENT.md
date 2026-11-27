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

## 3. Cloudflare R2 (required for uploads and playback)

1. Create buckets `zedmusic-audio` (private) and `zedmusic-media`.
2. On `zedmusic-media`, connect custom domain `media.zedmusic.online` (requires the domain's DNS on Cloudflare, or use the R2 public dev URL temporarily).
3. Create an R2 API token with Object Read & Write on both buckets → `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`; endpoint `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.
4. CORS on both buckets (browsers upload directly to R2):
   ```json
   [{ "AllowedOrigins": ["https://www.zedmusic.online", "https://zedmusic.online"],
      "AllowedMethods": ["PUT", "GET", "HEAD"],
      "AllowedHeaders": ["Content-Type"],
      "ExposeHeaders": ["ETag", "Content-Length", "Content-Range", "Accept-Ranges"],
      "MaxAgeSeconds": 3600 }]
   ```
   Add your Vercel preview domain if you test uploads on previews.
5. Files that fail inspection are deleted immediately. Uploads that are started but never completed can leave orphaned objects; a cleanup job for these is planned with the scheduled jobs in Phase 3.

## 4. Vercel

1. Import the GitHub repo. Framework preset: Next.js. Node 22.
2. Add environment variables from `.env.example` (Production and Preview).
3. Build: leave the build command empty — Vercel runs the `vercel-build` npm script (`scripts/vercel-build.ts`):
   * **Production** builds apply migrations and reference data, then build. A failed migration fails the deploy.
   * **Preview** builds never migrate unless `MIGRATE_ON_PREVIEW=1` (only set that together with a separate Neon preview branch).
   * Previews use their own URL automatically (`VERCEL_BRANCH_URL`); set `NEXT_PUBLIC_APP_URL` for Production only.
   * Function region: Frankfurt (`fra1`), next to the Neon database. Static and cached pages are still served from Vercel's edge, including Cape Town.
4. Plan: Hobby is limited to non-commercial use and daily cron jobs. Use **Pro** for launch.

## 5. Domain: zedmusic.online

`zedmusic.online` was registered through Vercel and uses Vercel DNS (`ns1/ns2.vercel-dns.com`), so **no A/CNAME records need to be added by hand** — Vercel manages the apex and wildcard records automatically.

1. In Vercel → Project → Settings → Domains add `www.zedmusic.online` (primary) and `zedmusic.online` (redirect to www).
2. Add other services' records in Vercel → Domains → zedmusic.online → DNS Records: the Resend SPF/DKIM/DMARC records, and (if used) the `media` CNAME for the R2 public bucket.
3. Set `NEXT_PUBLIC_APP_URL=https://www.zedmusic.online`.

If the DNS is ever moved to another provider, use the records Vercel shows in the project's Domains screen (typically A `@` → `76.76.21.21`, CNAME `www` → `cname.vercel-dns.com`).

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
