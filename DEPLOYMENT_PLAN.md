# Cafe Havilah POS — Production Deployment Plan

**Repository:** This codebase only. All findings verified from source.  
**Target:** Single Ubuntu 22.04 VPS, Docker.  
**Use:** POS terminals, Kitchen display (KDS), Manager dashboard, Admin panel (LAN + internet).

---

## 1) Deployment Compatibility Check

| Check | Result | Evidence |
|-------|--------|----------|
| **Runs with `next build`** | Yes | `package.json`: `"build": "next build"`. No edge runtime; Node API routes and server components. |
| **Server-only deps in Docker** | No blockers | `bcrypt`, `jose`, `@prisma/client`, `redis` (dynamic import when REDIS_URL set) are Node-compatible. Alpine image has `libc6-compat`; `postgresql-client` added in runner for pg_dump. |
| **Local file paths / OS** | Container-safe | All paths use `process.cwd()` (e.g. `path.join(process.cwd(), 'public', 'pos-images', ...)`). In container `cwd` is `/app`. No Windows-only or absolute host paths in app code. |
| **Prisma provider** | PostgreSQL only | `prisma/schema.prisma`: `provider = "postgresql"`, `url = env("DATABASE_URL")`. No SQLite. `lib/backup/database-backup.ts` checks `url.startsWith('postgres')`. |
| **Migrations present** | Yes | 15 migrations in `prisma/migrations/` (from phase 6 through table_occupancy_multi_order). All additive or index changes; one `DROP INDEX IF EXISTS` (safe). |
| **Redis required by code** | Optional | `lib/realtime-bus.ts`: if `REDIS_URL` is set, uses Redis pub/sub; else in-memory bus (single instance only). For single-container deployment, Redis is optional but recommended for consistency and future scaling. |
| **Env variables defined** | Yes | All runtime env read from `process.env`; no fallback to secrets. Required: `DATABASE_URL`, `POS_JWT_SECRET` (min 16 chars). Optional: `REDIS_URL`, `BACKUP_DIR`, `APP_BASE_URL`, `NEXT_PUBLIC_APP_ORIGIN`, `CAFE_NAME`, `PESAPAL_*`. |

**Blockers for containerization:** None. The existing Dockerfile and docker-compose are compatible with this repo.

---

## 2) Environment Variables — ACTUAL REQUIRED LIST

Scanned from: `lib/pos-auth.ts`, `lib/config.ts`, `lib/backup/database-backup.ts`, `lib/realtime-bus.ts`, `lib/print-jobs.ts`, `app/api/payments/pesapal/webhook/route.ts`, and `docker-compose.yml` (for POSTGRES_*).

See **`.env.production.example`** (below) for the exact file. Summary:

| Variable | Required/Optional | Used in |
|----------|-------------------|--------|
| DATABASE_URL | REQUIRED | Prisma, backup (pg_dump) |
| POS_JWT_SECRET | REQUIRED (min 16 chars) | lib/pos-auth.ts |
| POSTGRES_USER | REQUIRED (for Compose) | docker-compose postgres + DATABASE_URL |
| POSTGRES_PASSWORD | REQUIRED (for Compose) | docker-compose postgres + DATABASE_URL |
| POSTGRES_DB | Optional (default pos) | docker-compose |
| NODE_ENV | Set by Docker to production | Various |
| REDIS_URL | OPTIONAL | lib/realtime-bus.ts (in-memory if unset) |
| APP_BASE_URL | OPTIONAL | lib/config.ts (Pesapal, links) |
| NEXT_PUBLIC_APP_ORIGIN | OPTIONAL | lib/config.ts fallback, browser origin |
| BACKUP_DIR | OPTIONAL | lib/backup/database-backup.ts (default cwd/backups) |
| CAFE_NAME | OPTIONAL | lib/print-jobs.ts (default "Café") |
| PESAPAL_* | OPTIONAL | lib/config.ts, webhook route (required only if using Pesapal) |

---

## 3) Database Readiness

| Item | Status |
|------|--------|
| **Provider** | `postgresql` in `prisma/schema.prisma`. |
| **Schema** | Standard Prisma + PostgreSQL types (UUID, VARCHAR, DECIMAL, JSONB, enums). No SQLite-specific or unsupported types. |
| **Migrations** | 15 migration directories under `prisma/migrations/`. All use CREATE TABLE, CREATE INDEX, CREATE UNIQUE INDEX, or ALTER TABLE add column; one `DROP INDEX IF EXISTS` (safe). No DROP TABLE or TRUNCATE. |
| **Seed** | `prisma/seed.ts` exists; invoked via `prisma db seed` (package.json: `"seed": "ts-node ... prisma/seed.ts"`). Creates staff (default password `password123`), terminals, tables, products. |
| **Destructive risks** | None in migration files. Seed replaces/upserts data; no automatic destructive steps. |

**Safe production migration procedure:**

1. Ensure Postgres is running and `DATABASE_URL` is set (e.g. by docker-compose).
2. Run once after deploy (and after any schema change):  
   `docker compose exec pos-app npx prisma migrate deploy`
3. Do not run `prisma migrate dev` in production.
4. First-time only:  
   `docker compose exec pos-app npx prisma db seed`  
   Then change all staff passwords before go-live.

---

## 4) Build Strategy for THIS Project

| Requirement | Finding |
|-------------|---------|
| **Runtime** | Node.js only. No `export const runtime = 'edge'` in any route. Prisma and `Decimal` from `@prisma/client/runtime/library` require Node. |
| **Edge** | Not used. |
| **Native deps** | `bcrypt` has native bindings; npm installs prebuilds for Linux (Alpine). No extra system packages required for bcrypt. |
| **System packages** | In Dockerfile: `libc6-compat`, `wget` (base); `postgresql-client` (runner, for in-app pg_dump). |

**Docker build plan for this repo:**

- Multi-stage: deps → builder (prisma generate + next build) → runner.
- Base: `node:20-alpine`; install `libc6-compat` and `wget` in base; `postgresql-client` only in runner.
- Builder: copy node_modules from deps, copy source, run `npx prisma generate` then `npm run build`. No DATABASE_URL needed at build for Prisma generate.
- Runner: copy .next, public, prisma, node_modules, package.json, next.config.js; create non-root user; expose 3000; CMD `next start`.

---

## 5) Realtime Features Audit

| Mechanism | Used | Where |
|-----------|------|--------|
| **WebSockets** | No | Not present in codebase. |
| **SSE** | Yes | `GET /api/realtime/stream` returns `Content-Type: text/event-stream`, ReadableStream with heartbeat; client in `RealtimeNotificationProvider.tsx` uses fetch and parses `data:` lines. |
| **Long polling** | No | No long-polling endpoint. |
| **Periodic polling** | Yes | KDS/bar/kitchen/ready pages use `setInterval(fetch, 5000)` for queue/counts; complements SSE. |

**Nginx compatibility:** Required for SSE:

- `proxy_buffering off` — present in `deploy/nginx.conf`.
- Long `proxy_read_timeout` (e.g. 3600s) — present.
- `proxy_cache off` — present.

No WebSocket upgrade handling required.

---

## 6) Storage & Upload Audit

| Type | Location | Persistent volume |
|------|----------|-------------------|
| **Product images** | `public/pos-images/products/` (via `path.join(process.cwd(), 'public', 'pos-images', 'products')`) | Yes — mount over `/app/public/pos-images` or at least `.../products` and `.../tables`. |
| **Table images** | `public/pos-images/tables/` | Same as above. |
| **Backups (pg_dump)** | `BACKUP_DIR` env or `process.cwd()/backups` | Yes — mount as `/app/backups` so backups survive restarts. |
| **Static assets** | Built into image at build time (`public/`, `/.next/`). No runtime-generated static assets. | No extra volume for `.next` or default public. |

**Volume requirements (from docker-compose):**

- `pos_uploads` → `/app/public/pos-images` (products + tables).
- `pos_backups` → `/app/backups`.

---

## 7) Production Risks Report

| Risk | Severity | Location / detail |
|------|----------|-------------------|
| **Hardcoded secrets** | High | `lib/auth.ts`: `ADMIN_CREDENTIALS = { username: 'IamLRBA', password: 'L@ruba1212' }`. Used by `AuthManager.adminLogin()` (client-side). POS login uses `lib/pos-auth.ts` (JWT, env); if any UI uses AuthManager, fix or remove. |
| **Dev-only credentials** | High | `prisma/seed.ts`: all staff get password `password123`. Scripts `scripts/seed-database.ps1`, `scripts/start-postgres-and-seed.ps1` reference same. Must change all staff passwords before go-live. |
| **Missing error handling** | Low | Pesapal webhook returns 500 if `PESAPAL_WEBHOOK_SECRET` is unset and webhook is called. Set secret when using Pesapal. |
| **Insecure defaults** | Medium | Seed password; `next.config.js` `images.domains: ['localhost']` — add production domain if using external images. |
| **Performance** | Low | Single instance: Redis optional. SSE connections and Prisma connection pool are the main considerations; no obvious bottlenecks for single-VPS. |
| **Data loss** | Medium | Postgres and uploads/backups must be on persistent volumes. In-app backup retention (`deleteOldBackups`) not invoked on a schedule — use host cron or scheduler. |

---

## 8) Exact Command to Safely Start THIS Project on a VPS

Prerequisites: project at e.g. `/opt/pos`, `.env` created from `.env.production.example` with `POSTGRES_PASSWORD` and `POS_JWT_SECRET` set.

```bash
cd /opt/pos && docker compose up -d --build && docker compose exec pos-app npx prisma migrate deploy
```

First-time only (seed):

```bash
docker compose exec pos-app npx prisma db seed
```

Verify:

```bash
curl -s http://localhost/api/health
```

Expected: `{"status":"ok"}`.
