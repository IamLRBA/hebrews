# Koyeb Deployment Readiness Audit

**Project:** Cafe Havilah POS (Next.js full-stack)  
**Target:** Koyeb (serverless containers), external PostgreSQL (Neon/Supabase)  
**Date:** 2026-02  
**Scope:** Analysis and planning only — no file modifications.

---

## Executive Summary

| Aspect | Status | Notes |
|--------|--------|--------|
| **Overall readiness** | **Not ready** | Critical blockers: stateful disk (uploads, backups), in-container `pg_dump`, and optional Next.js standalone. |
| **Framework** | OK | Next.js (latest), Node 20; no standalone output today. |
| **Docker** | Partial | Single Dockerfile exists; needs changes for single-container, no postgres/redis in image. |
| **Database** | OK | Prisma + `DATABASE_URL`; external DB works; SSL may be required by provider. |
| **Environment** | OK | All config via env; no hardcoded hostnames in app code. |
| **Stateless** | **Blocked** | Local uploads and backups assume writable filesystem; must be redesigned or offloaded. |

**Verdict:** The app can run on Koyeb after addressing **critical blockers** (file storage, backup strategy, optional Docker/Next optimizations) and applying the **recommended changes** below.

---

## 1. Framework and Runtime

| Item | Finding |
|------|---------|
| **Next.js version** | `"next": "latest"` in package.json (unpinned). Resolve to a specific major (e.g. 14.x or 15.x) for reproducible builds. |
| **Node version** | **Node 20** (Dockerfile: `node:20-alpine`). No engines field in package.json; recommend adding `"engines": { "node": ">=20" }`. |
| **Standalone output** | **Not enabled.** `next.config.js` has no `output: 'standalone'`. Standalone reduces image size and is recommended for single-container deployments. |
| **Build system** | Next.js default (Turbopack not required). Build: `next build`; Start: `next start`. |

**Assumption:** Koyeb runs Node 20 (or compatible). If Koyeb uses a different Node LTS, align Dockerfile base and/or buildpack.

---

## 2. Docker Configuration

| Item | Finding |
|------|---------|
| **Dockerfile** | Multi-stage: base → deps → builder → runner. Produces a single app image. |
| **Single container** | **Yes** — the Dockerfile does not embed postgres or redis. It does assume `DATABASE_URL` and optional `REDIS_URL` at runtime. |
| **Compose dependencies** | **Removed on Koyeb:** postgres (replaced by managed DB), redis (optional; use Koyeb Redis or omit for in-memory bus), nginx (Koyeb handles TLS/termination). |
| **Required modifications** | 1) Remove or make optional `postgresql-client` in runner (used for in-app `pg_dump` — see §6). 2) Do not rely on volume mounts: `/app/public/pos-images`, `/app/backups` are created in image but writable only at runtime; on Koyeb they are ephemeral. 3) Prefer `output: 'standalone'` and copy `standalone` + `static` in runner for smaller image (optional). 4) Ensure runtime listens on `process.env.PORT` (Next.js does by default); avoid hardcoding `ENV PORT=3000` in Dockerfile so Koyeb can set PORT. |

**Critical:** The Dockerfile currently installs `postgresql-client` for in-process backups (`pg_dump`). On Koyeb, either remove this and disable/redirect backup, or run backups outside the app (e.g. Neon/Supabase scheduled backups).

---

## 3. Database Readiness

| Item | Finding |
|------|---------|
| **Prisma** | Yes. `prisma/schema.prisma` present; generator `prisma-client-js`; datasource `url = env("DATABASE_URL")`. |
| **DATABASE_URL** | Required. No default in code. Format: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public`. |
| **SSL** | Schema does not mandate SSL. Many managed Postgres (Neon, Supabase) require TLS. Add `?sslmode=require` (or provider-recommended param) to `DATABASE_URL` in production. |
| **External PostgreSQL** | Compatible. No hardcoded hostnames; app uses only `DATABASE_URL`. |
| **Migration strategy** | Run `prisma migrate deploy` **before** or **at** first deploy (e.g. in CI or a one-off job), not inside the app container at startup. Koyeb has no SSH; use a separate migration step (CI, Koyeb job, or local against production DB with care). |
| **Prisma binary targets** | `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]` — correct for Alpine (Dockerfile). If switching to a non-Alpine image, add the matching target. |

**Assumption:** You will create the database and run migrations once (e.g. `npx prisma migrate deploy` from a trusted machine or CI with production `DATABASE_URL`). Seed (e.g. `node prisma/seed.js`) can be run the same way or via a one-off script/job.

---

## 4. Environment Variables

### Required (mandatory)

| Variable | Purpose | Production-safe value |
|----------|---------|------------------------|
| `DATABASE_URL` | Prisma + app DB connection | Managed Postgres URL (Neon/Supabase) including `?schema=public` and `?sslmode=require` if needed. |
| `POS_JWT_SECRET` | JWT signing (lib/pos-auth) | Min 16 chars; use a long random secret (e.g. `openssl rand -base64 32`). |

### Optional but recommended

| Variable | Purpose | Production value |
|----------|---------|------------------|
| `NODE_ENV` | Runtime mode | `production`. |
| `APP_BASE_URL` | Server-side links, Pesapal callback (lib/config) | e.g. `https://your-app.koyeb.app` or custom domain. |
| `NEXT_PUBLIC_APP_ORIGIN` | Browser origin | Same as APP_BASE_URL. |

### Optional (feature-specific)

| Variable | Purpose | Koyeb note |
|----------|---------|------------|
| `REDIS_URL` | Realtime bus (lib/realtime-bus); multi-instance SSE | If multiple instances: use Koyeb Redis or external Redis. If single instance: leave unset (in-memory). |
| `BACKUP_DIR` | In-app backup output path (lib/backup, lib/storage-paths) | Default `process.cwd()/backups`. On Koyeb ephemeral disk is lost on restart; see §6. |
| `POS_UPLOAD_BASE` | Product/table image uploads (lib/storage-paths) | Default `process.cwd()/public/pos-images`. On Koyeb ephemeral; see §6. |
| `CAFE_NAME` | Print jobs / display | e.g. `Café Havilah`. |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD_HASH` | Legacy admin login (AuthManager) | Only if using admin-login; use bcrypt hash. |
| Pesapal_* | Payments (PESAPAL_BASE_URL, PESAPAL_CONSUMER_KEY, etc.) | Set only if using Pesapal. |

### Variables that reference local services (do not use on Koyeb)

- **POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB** — Used only to build `DATABASE_URL` in docker-compose. On Koyeb, set only `DATABASE_URL` (full URL from Neon/Supabase).
- **REDIS_URL** — If used, point to a managed Redis (e.g. Koyeb Redis or Upstash), not `redis://redis:6379`.

### Secrets

- **Secrets in repo:** No `.env` or real credentials found in repo. `.env.example` / `.env.production.example` contain placeholders only.
- **Sensitive env:** `DATABASE_URL`, `POS_JWT_SECRET`, `ADMIN_PASSWORD_HASH`, `PESAPAL_*` — must be set as Koyeb secrets/env and never committed.

---

## 5. Networking Assumptions

| Item | Finding |
|------|---------|
| **Hardcoded hostnames** | None in application code. Only docker-compose uses hostnames `postgres`, `redis` for service discovery. |
| **Port** | Dockerfile sets `ENV PORT=3000` and `EXPOSE 3000`. Next.js respects `process.env.PORT`. **Recommendation:** Omit `ENV PORT=3000` in Dockerfile so Koyeb can inject `PORT` (e.g. 8080); or keep and ensure Koyeb is configured to use port 3000. |
| **localhost** | Referenced in next.config.js `images.domains: ['localhost']` (for Next Image); and in docker-compose healthcheck. For production, add your public domain (e.g. `your-app.koyeb.app`) to `images.domains` so images from that origin are allowed. |
| **Koyeb dynamic port** | Next.js `next start` binds to `process.env.PORT || 3000` and `HOSTNAME="0.0.0.0"` is already set in Dockerfile — compatible with Koyeb assigning PORT. |

---

## 6. File System Usage (Statelessness)

| Location | Usage | Stateless? |
|----------|--------|------------|
| **`/app/public/pos-images`** (or `POS_UPLOAD_BASE`) | Product and table image uploads: `app/api/admin/upload/product-image/route.ts`, `table-image/route.ts` write via `writeFile`. | **No.** Writes to local disk. On Koyeb, container filesystem is ephemeral; restarts lose uploads. |
| **`/app/backups`** (or `BACKUP_DIR`) | `lib/backup/database-backup.ts` runs `pg_dump` and writes `.sql` files; metadata in DB. | **No.** Backups written to local disk; also requires `postgresql-client` (pg_dump) in container. |
| **Scripts** | `scripts/safe-add-enum.ts` writes to `backups/` and migration files (dev-time only). | N/A for production runtime. |

**Critical blockers for stateless:**

1. **Uploads:** Replace local `writeFile` with object storage (e.g. S3, R2, or Koyeb volume if available and persistent). Alternatively, accept ephemeral uploads and document that product/table images are lost on restart unless stored elsewhere.
2. **Backups:** In-app backup (pg_dump to disk) is incompatible with ephemeral storage. Options: (a) Disable backup API or make it no-op and use managed DB backups (Neon/Supabase); (b) Stream pg_dump to external storage (e.g. S3) instead of local file; (c) Run backups in a separate job (not in the web container).

---

## 7. Background Jobs / Long-Running Processes

| Item | Finding |
|------|---------|
| **Cron / scheduled tasks** | No server-side cron found. Backup is triggered on-demand via `POST /api/admin/backup/run`. |
| **Workers / queues** | No separate worker process. Offline queue (lib/offline) is client-side (IndexedDB) and syncs via API. |
| **setInterval / polling** | Used in client components (e.g. PosNavHeader, KitchenNavHeader, realtime stream heartbeat) and in `lib/offline/connection.ts` for polling — all in-process and request/connection-scoped. No standalone background daemon. |
| **SSE** | `/api/realtime/stream` — long-lived HTTP; Koyeb must allow long-lived connections (no short read timeouts). |

**Conclusion:** No additional Koyeb services are strictly required for background jobs. Realtime works with in-memory bus if single instance; for multiple instances set `REDIS_URL`.

---

## 8. Build and Start Commands

| Phase | Command | Notes |
|-------|---------|--------|
| **Install** | `npm ci` (or `npm install` if no lockfile) | Use in Dockerfile; Koyeb Buildpacks would run `npm install` by default. |
| **Generate Prisma** | `npx prisma generate` | Must run before `next build` (schema types needed). |
| **Build** | `npm run build` → `next build` | Runs in Dockerfile builder stage. |
| **Start** | `npm start` → `next start` or `node node_modules/next/dist/bin/next start` | Production mode. Ensure `NODE_ENV=production`. |
| **Migrations** | `npx prisma migrate deploy` | Run once externally (CI or one-off), not in container start. |
| **Seed** | `node prisma/seed.js` (per package.json prisma.seed) | Run once externally if needed. |

**Production mode:** App uses `next build` + `next start`; no dev server. Suitable for production.

---

## 9. Security Considerations

| Item | Finding |
|------|---------|
| **Secrets in repo** | No real credentials in repo. Example env files use placeholders. |
| **Unsafe config** | next.config.js `images.domains: ['localhost']` only — add production domain for Image optimization. |
| **Recommendations** | Use Koyeb secrets for DATABASE_URL, POS_JWT_SECRET, and any Pesapal keys; restrict admin routes by auth (already in place); ensure APP_BASE_URL / NEXT_PUBLIC_APP_ORIGIN use HTTPS in production. |

---

## 10. Koyeb Deployment Plan

### A) Deploy via Dockerfile (recommended)

- **Recommendation:** Use the **Dockerfile**. The repo already has a production multi-stage Dockerfile; Buildpacks would need to run `prisma generate` and possibly install system deps (openssl, postgresql-client if kept). Dockerfile gives full control and matches current VPS setup (minus compose).
- **Buildpacks:** Possible if you add a `Procfile` or ensure buildpack runs `prisma generate` and `next build`; then start with `next start`. Less control over `postgresql-client` and Alpine; Dockerfile is simpler.

### B) Exact settings for Koyeb

| Setting | Value |
|---------|--------|
| **Build command** | (Leave empty if using Dockerfile; Koyeb builds from Dockerfile.) Or for Buildpack: `npm run build` after `prisma generate`. |
| **Run command** | `node node_modules/next/dist/bin/next start` (or `npm start`). With standalone: `node server.js` if you add `output: 'standalone'`. |
| **Port** | Koyeb typically injects `PORT` (e.g. 8080). Ensure app listens on `process.env.PORT`; Next.js does by default. Set in Koyeb service: **Port** = value Koyeb assigns (e.g. 8080). |
| **Health check path** | `GET /api/health` — returns `{"status":"ok"}`. Configure Koyeb HTTP health check to this path. |

### C) Required environment variables (Koyeb)

**Mandatory:**

- `DATABASE_URL` — full Postgres URL (Neon/Supabase), e.g. `postgresql://user:pass@host:5432/db?schema=public&sslmode=require`
- `POS_JWT_SECRET` — min 16 characters, random
- `NODE_ENV` = `production`

**Recommended:**

- `APP_BASE_URL` — e.g. `https://your-service.koyeb.app`
- `NEXT_PUBLIC_APP_ORIGIN` — same as APP_BASE_URL

**Optional:**

- `REDIS_URL` — if using multi-instance and external Redis
- `BACKUP_DIR` / `POS_UPLOAD_BASE` — only if you implement persistent storage (e.g. S3 path); otherwise in-app backup/upload will be ephemeral or must be disabled/redirected.
- Pesapal, CAFE_NAME, ADMIN_* as needed.

### D) Database setup (external PostgreSQL)

1. Create a Postgres database (Neon, Supabase, or other). Note connection string.
2. Add `?schema=public` and, if required, `&sslmode=require` (or provider’s SSL param).
3. Run migrations from a trusted environment (local or CI) with that `DATABASE_URL`:  
   `npx prisma migrate deploy`
4. Optionally run seed: `node prisma/seed.js` (or `npx prisma db seed`).
5. Set `DATABASE_URL` in Koyeb as a secret.

### E) Code changes required BEFORE deployment

1. **Uploads / backups (critical):**  
   - Either: Implement object-storage uploads and optional backup streaming to external storage, and remove or guard in-app backup that writes to disk;  
   - Or: Document that uploads and in-app backups are ephemeral and disable or no-op the backup API when `BACKUP_DIR` is not persistent.

2. **Next.js config:**  
   - Add production domain to `images.domains` in `next.config.js` (e.g. your Koyeb app URL or custom domain).

3. **Dockerfile (recommended):**  
   - Remove or make optional `postgresql-client` if in-app backup is disabled or moved.  
   - Omit `ENV PORT=3000` so Koyeb’s `PORT` is used, or align Koyeb port with 3000.  
   - Optional: Add `output: 'standalone'` in next.config.js and update Dockerfile to copy `standalone` and `static` and run `node server.js` for a smaller image.

4. **DATABASE_URL SSL:**  
   - Ensure production `DATABASE_URL` includes SSL if the managed DB requires it (e.g. `sslmode=require` for Neon/Supabase).

---

## Critical Blockers (must fix before deployment)

1. **Stateful disk usage**  
   - Product/table image uploads write to local filesystem.  
   - In-app backup runs `pg_dump` and writes to `BACKUP_DIR`.  
   **Action:** Use external storage for uploads and/or backups, or explicitly accept ephemeral behavior and disable/redirect backup.

2. **pg_dump in container**  
   - Runner stage installs `postgresql-client` for in-process backups.  
   **Action:** Remove it if backup is disabled or moved; or keep only if backup is redesigned to stream to external storage.

3. **Image domains**  
   - `images.domains: ['localhost']` only.  
   **Action:** Add production domain (Koyeb URL or custom domain) so Next Image works for uploaded images from that host.

4. **Migrations and seed**  
   - Must run outside the app (no SSH).  
   **Action:** Run `prisma migrate deploy` and optionally seed from CI or one-off job with production `DATABASE_URL`.

---

## Recommended Changes

- Pin Next.js (and ideally Node) version in package.json for reproducible builds.
- Add `output: 'standalone'` and switch runner to `node server.js` for smaller image.
- Add `engines.node` in package.json (e.g. `">=20"`).
- Document that REDIS_URL is required for multi-instance SSE; single instance works without it.
- If keeping in-app backup: redesign to stream to S3/R2 or equivalent; remove dependency on local `BACKUP_DIR` and optionally on `postgresql-client` in the web container.

---

## Step-by-Step Deployment Instructions (after blockers are addressed)

1. Create managed Postgres (Neon/Supabase); run `prisma migrate deploy` and optionally `node prisma/seed.js` with production `DATABASE_URL`.
2. In Koyeb: Create new App → Deploy from GitHub (or image). Select Dockerfile.
3. Set env vars: `DATABASE_URL`, `POS_JWT_SECRET`, `NODE_ENV=production`, `APP_BASE_URL`, `NEXT_PUBLIC_APP_ORIGIN`. Mark secrets as secret where applicable.
4. Set port to the value Koyeb assigns (e.g. 8080) or leave default and ensure Dockerfile does not override `PORT`.
5. Set health check: HTTP GET `/api/health`, expected 200.
6. Deploy. Attach custom domain and TLS (Koyeb handles HTTPS).
7. Update `next.config.js` `images.domains` to include the live domain.

---

## Post-Deployment Verification Checklist

- [ ] `https://your-domain/api/health` returns `{"status":"ok"}`.
- [ ] Login (e.g. `/pos/login`) works with seeded credentials.
- [ ] Realtime updates (SSE) work; if multiple instances, REDIS_URL is set and working.
- [ ] Product/table images: either load from external storage or placeholder; uploads go to chosen storage.
- [ ] Admin backup: either disabled, no-op, or writing to external storage; no reliance on local disk.
- [ ] No hardcoded localhost/postgres/redis in runtime behavior; DATABASE_URL and optional REDIS_URL only.

---

*End of audit. No files were modified.*
