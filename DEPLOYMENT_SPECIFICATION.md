# POS Production Deployment Specification

**Source:** Codebase inspection only (no code modified).  
**Target:** Linux server, Docker-based production.  
**Date:** 2025-02-23

---

## 1) Application Type

| Item | Finding |
|------|--------|
| **Full-stack Next.js** | Yes. Single Next.js 15+ app with App Router; API routes under `app/api/`, frontend under `app/(pos)/`. |
| **Node.js runtime** | Required. No `engines` in `package.json`; Dockerfile uses **Node 20** (`node:20-alpine`). Dev script uses `--max-old-space-size=4096` for large builds. |
| **Build vs direct run** | **Requires build.** Production runs compiled output: `next build` then `next start`. No direct `node` execution of source. |
| **Required Node version** | **Node 18+** (LTS); Dockerfile uses **Node 20**. Use Node 20 for production parity with Dockerfile. |

---

## 2) Environment Variables

All variables observed in code (`.env.example`, `.env.docker.example`, `lib/config.ts`, `lib/pos-auth.ts`, `lib/backup/database-backup.ts`, `lib/realtime-bus.ts`, `app/api/payments/pesapal/webhook/route.ts`, `lib/print-jobs.ts`):

| Variable | Required | Description | Default / Notes |
|----------|----------|-------------|-----------------|
| **DATABASE_URL** | **Yes** | PostgreSQL connection string | e.g. `postgresql://user:pass@host:5432/db?schema=public`. For Docker: `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public` |
| **POS_JWT_SECRET** | **Yes** | JWT signing secret for staff auth (min 16 chars) | Used in `lib/pos-auth.ts`; must be set and ≥16 characters. |
| **NODE_ENV** | Set by runtime | `production` in production | Docker sets `NODE_ENV=production`. |
| **REDIS_URL** | No | Redis URL for realtime event bus (multi-instance SSE) | e.g. `redis://redis:6379`. When unset, in-memory bus only (single instance). |
| **APP_BASE_URL** | Recommended | Base URL for server (Pesapal callbacks, links) | Fallback: `NEXT_PUBLIC_APP_ORIGIN`. |
| **NEXT_PUBLIC_APP_ORIGIN** | Recommended | Base URL for browser (same-origin, public URL) | e.g. `https://pos.example.com`. |
| **BACKUP_DIR** | No | Path for pg_dump backup files | Default: `path.join(process.cwd(), 'backups')`. Docker: `/app/backups` (volume `pos_backups`). |
| **CAFE_NAME** | No | Name used in print jobs | Default: `'Café'` in `lib/print-jobs.ts`. |
| **PESAPAL_BASE_URL** | No | Pesapal API base | e.g. `https://cybqa.pesapal.com/pesapalv3/api`. |
| **PESAPAL_CONSUMER_KEY** | No | Pesapal consumer key | |
| **PESAPAL_CONSUMER_SECRET** | No | Pesapal consumer secret | |
| **PESAPAL_IPN_ID** | No | Pesapal IPN ID | |
| **PESAPAL_CALLBACK_URL** | No | Pesapal callback URL | From `config.pesapal.callbackUrl`. |
| **PESAPAL_WEBHOOK_SECRET** | No (required for webhook) | HMAC secret for Pesapal webhook verification | Required if using Pesapal webhook; `app/api/payments/pesapal/webhook/route.ts` returns 500 if unset. |

**Docker Compose–specific (from `.env` for postgres service):**

- **POSTGRES_USER** — default `posuser`
- **POSTGRES_PASSWORD** — required (Compose uses `?` so it must be set)
- **POSTGRES_DB** — default `pos`

---

## 3) Database Requirements

| Item | Finding |
|------|--------|
| **Database type** | **PostgreSQL** (Prisma `provider = "postgresql"`). |
| **PostgreSQL version** | 14+; docker-compose uses **postgres:16-alpine**. |
| **Extensions** | None declared in Prisma schema; standard PostgreSQL only. |
| **Migration strategy** | **Prisma Migrate.** Migrations in `prisma/migrations/`; production: `prisma migrate deploy` (no `migrate dev`). |
| **Seed** | **Required for initial data.** `prisma db seed` (runs `prisma/seed.ts`): staff (default password `password123`), terminals, tables, products. **Must change default passwords before go-live.** |
| **Minimum resources** | Single-venue POS; 10–50 GB disk sufficient to start. No special connection-pool settings in code; Prisma defaults apply. |

---

## 4) Storage Requirements

| Item | Finding |
|------|--------|
| **File writes** | Yes. Admin uploads: product images → `public/pos-images/products/`, table images → `public/pos-images/tables/`. Implemented in `app/api/admin/upload/product-image/route.ts` and `table-image/route.ts` (writeFile, mkdir). |
| **Backups location** | `BACKUP_DIR` (default `backups/`; Docker: `/app/backups`). In-app backup uses `pg_dump` and writes `.sql` files there. Metadata in DB (`DatabaseBackup`). |
| **Uploads location** | `public/pos-images/` (products + tables). Docker: volume `pos_uploads` mounted at `/app/public/pos-images`. |
| **Export storage** | No persistent export path. Orders/payments export is CSV/JSON returned in HTTP response (admin only); no file written to disk. |
| **Permissions** | App must have read/write to `BACKUP_DIR` and `public/pos-images` (and subdirs). Docker runs as non-root `nextjs` (uid 1001). |

---

## 5) Realtime Requirements

| Item | Finding |
|------|--------|
| **Mechanism** | **SSE (Server-Sent Events)**. WebSockets not used. Endpoint: `GET /api/realtime/stream?shiftId=<uuid>`. |
| **Implementation** | `app/api/realtime/stream/route.ts`: ReadableStream, `Content-Type: text/event-stream`, heartbeat every 30s, max 50 events queued per connection (slow clients dropped). |
| **Ports** | Same as app (3000). No separate port for realtime. |
| **Sticky sessions** | **Recommended for multi-instance without Redis.** With **REDIS_URL** set, realtime bus uses Redis pub/sub so all instances get events; sticky sessions not strictly required. Without Redis, single instance only—sticky not needed. |
| **Proxy considerations** | Nginx (and any reverse proxy) must: **proxy_buffering off**; **proxy_read_timeout** large (e.g. 3600s) so SSE connections are not cut. Already in `deploy/nginx.conf`. |

---

## 6) Network Requirements

| Item | Finding |
|------|--------|
| **Inbound ports** | **80, 443** (Nginx). Do not expose 3000, 5432, 6379 to the internet. |
| **HTTPS** | Terminate at Nginx. TLS certs in `deploy/ssl/` (fullchain.pem, privkey.pem); HTTPS server block in `deploy/nginx.conf` is commented by default. |
| **CORS** | Same-origin by default; no CORS middleware found in API. If frontend is served from another domain, CORS would need to be added. |
| **Local network** | POS terminals, KDS, manager dashboard, admin access over LAN (and/or internet) to the same host/port (80/443). |

---

## 7) Offline Sync Dependencies

| Item | Finding |
|------|--------|
| **Background workers** | None. No Celery, Bull, or separate worker process. |
| **Cron jobs** | Not in app. Optional: host cron for `pg_dump` and/or off-server backup copy. In-app backup retention uses SystemConfig `backupRetentionDays`; `deleteOldBackups()` is not called on a schedule—only when invoked (e.g. admin or manual). |
| **Queue systems** | **Client-side only.** Offline sync: IndexedDB + mutation queue in browser (`lib/offline/queue.ts`, `lib/offline/db.ts`). When back online, sync engine replays queue via API. No server-side job queue. |

---

## 8) Dockerization Readiness

| Item | Finding |
|------|--------|
| **Container-ready** | Yes. Dockerfile and docker-compose.yml present and consistent with app. |
| **Base image** | **node:20-alpine**. Additional: `libc6-compat`, `wget` (base); `postgresql-client` (runner, for pg_dump). |
| **Build steps** | `npm ci --omit=dev` (deps) → copy deps → `npx prisma generate` → `npm run build` (next build). |
| **Production start** | `CMD ["node", "node_modules/next/dist/bin/next", "start"]`. Port 3000, HOSTNAME=0.0.0.0. |
| **Healthcheck** | `wget -q -O - http://localhost:3000/api/health` (expects `{"status":"ok"}`). |

---

## 9) Security Requirements

| Item | Finding |
|------|--------|
| **Session handling** | Stateless JWT (Bearer). Cookie not used for API; token in memory/localStorage on client. Expiry 8h; token version and lastPasswordChangeAt/lastForcedLogoutAt checked for revocation. |
| **Secrets** | `POS_JWT_SECRET` (min 16 chars), `POSTGRES_PASSWORD`, `PESAPAL_*` and `PESAPAL_WEBHOOK_SECRET` if using Pesapal. No secrets in repo; `.env` gitignored. |
| **Firewall** | Allow 22 (SSH), 80, 443. Block 3000, 5432, 6379 from public. |

---

## 10) Hardware & Performance

| Item | Finding |
|------|--------|
| **Minimum CPU/RAM** | 1 vCPU / 2 GB RAM can run app + Postgres + Nginx on one host. |
| **Recommended** | 2 vCPU / 4 GB for busy periods. |
| **Disk** | OS + app image; Postgres data (10–50 GB to start); backups and uploads volumes. SSD recommended. |
| **Expected load** | Small restaurant: single venue, moderate orders/shifts; Prisma connection pool and long-lived SSE connections per KDS/POS tab are the main considerations. |

---

## 11) Deployment Risks

| Risk | Mitigation |
|------|------------|
| **Single point of failure** | One VPS; no HA. Mitigate with backups and documented restore. |
| **Data loss** | Postgres on same host. Use named volumes; run pg_dump (in-app and/or host cron) and copy to off-server storage. |
| **Default seed passwords** | All seeded staff use `password123`. **Must change** before go-live. |
| **Next.js Image domains** | If using external image URLs with Next `<Image>`, add production domain to `next.config.js` `images.domains` (currently only `localhost`). |

---

# Final Output

## A) Minimal Production Configuration

- **One host:** Linux (e.g. Ubuntu 22.04), Docker + Docker Compose v2.
- **Containers:** `pos-app` (Next.js), `postgres` (PostgreSQL 16).
- **Optional:** Omit `redis` and `nginx` for minimal setup: run `next start` on host port 3000, single instance, no HTTPS (dev-style only; not recommended for real production).
- **Env:** `DATABASE_URL`, `POS_JWT_SECRET` (and Postgres vars if using Compose).
- **Steps:** `docker compose up -d` (postgres + pos-app only if you remove redis/nginx from compose), `prisma migrate deploy`, `prisma db seed`, then change default passwords.
- **Storage:** One volume for Postgres data; one for `/app/public/pos-images` and one for `/app/backups` if using in-app backup.

---

## B) Recommended Production Configuration

- **One VPS:** Ubuntu 22.04, Docker Engine + Docker Compose v2.
- **Stack:** `pos-app` (Next.js), `postgres` (PostgreSQL 16), `redis` (Redis 7), `nginx` (reverse proxy).
- **Env:** `DATABASE_URL`, `POS_JWT_SECRET`, `REDIS_URL`, `APP_BASE_URL`, `NEXT_PUBLIC_APP_ORIGIN`; optional Pesapal and `BACKUP_DIR`/`CAFE_NAME`.
- **Firewall:** 22, 80, 443 open; 3000, 5432, 6379 not exposed.
- **HTTPS:** TLS at Nginx (e.g. certbot), certs in `deploy/ssl/`, HTTPS server block enabled in `deploy/nginx.conf`.
- **Resources:** 2 vCPU, 4 GB RAM, SSD.
- **Backups:** In-app backup to `BACKUP_DIR` (volume) + host cron for pg_dump and off-server copy; retention via SystemConfig `backupRetentionDays`.

---

## C) Example docker-compose Architecture

```yaml
# Same as repo docker-compose.yml; summary:
services:
  postgres:
    image: postgres:16-alpine
    environment: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
    volumes: [postgres_data:/var/lib/postgresql/data]
    healthcheck: pg_isready

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes: [redis_data:/data]
    healthcheck: redis-cli ping

  pos-app:
    build: .
    env_file: .env
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public
      REDIS_URL: redis://redis:6379
      NODE_ENV: production
    depends_on: { postgres: { condition: service_healthy }, redis: { condition: service_healthy } }
    volumes:
      - pos_uploads:/app/public/pos-images
      - pos_backups:/app/backups
    healthcheck: wget -q -O - http://localhost:3000/api/health

  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes: [./deploy/nginx.conf:/etc/nginx/nginx.conf:ro]
    depends_on: [pos-app]

volumes:
  postgres_data:
  redis_data:
  pos_uploads:
  pos_backups:
```

External ports: **80, 443** only. 3000, 5432, 6379 are internal.

---

## D) Step-by-Step High-Level Deployment Plan

1. **Server prep** — Ubuntu 22.04, user, SSH, `ufw` (22, 80, 443).
2. **Docker** — Install Docker Engine + Docker Compose v2; add user to `docker` group.
3. **App** — Clone repo (e.g. `/opt/pos`); copy `.env.docker.example` to `.env`; set `POSTGRES_PASSWORD`, `POS_JWT_SECRET`; optionally `APP_BASE_URL`, `NEXT_PUBLIC_APP_ORIGIN`.
4. **Run stack** — `docker compose up -d --build`.
5. **Database** — `docker compose exec pos-app npx prisma migrate deploy` then `docker compose exec pos-app npx prisma db seed` (first time only).
6. **Verify** — `curl -s http://localhost/api/health` → `{"status":"ok"}`.
7. **HTTPS** (optional) — Put certs in `deploy/ssl/`, uncomment HTTPS server in `deploy/nginx.conf`, `docker compose up -d --force-recreate nginx`.
8. **Security** — Change all default staff passwords from seed; ensure firewall and secrets as above.
9. **Backups** — Configure host cron for pg_dump and/or use in-app backup; copy backups off-server.
10. **Go-live** — Test login (POS, KDS, manager), create order, payments, realtime updates; document URLs and credentials.

---

*This specification is derived solely from the existing codebase and deployment files (DEPLOYMENT.md, Dockerfile, docker-compose.yml, Prisma schema, env examples, and source code). No application code was modified.*
