# POS System — Complete Production Deployment Blueprint

**Target:** Ubuntu 22.04 LTS VPS (e.g. DigitalOcean Droplet)  
**Stack:** Next.js (full-stack), PostgreSQL in Docker, Redis (recommended). Single VPS, no managed database.  
**Use case:** Access from POS terminals, kitchen display (KDS), manager dashboard, and admin panel over LAN and/or internet.

---

## 1. Backend Analysis

| Item | Details |
|------|--------|
| **Language / framework** | Node.js, Next.js 15+ (App Router, API routes under `app/api/`) |
| **Entry point** | Next.js server: `next start` (serves API + frontend) |
| **Runtime** | Node.js 18+ (LTS); Dockerfile uses Node 20. Dev uses `--max-old-space-size=4096` for large builds. |
| **Dependency manager** | npm (`package.json`) |
| **Env vars (required)** | `DATABASE_URL`, `POS_JWT_SECRET` (see §7) |
| **Authentication** | JWT (cookie + Bearer), `lib/pos-auth.ts`; secret: `POS_JWT_SECRET` (min 16 chars) |
| **API structure** | REST (Next.js API routes: `app/api/*`) |
| **Background jobs / queues** | None (no Celery/ Bull/etc.); optional cron for backups via system or container |
| **File storage** | Local filesystem: `public/pos-images/products`, `public/pos-images/tables`; backups in `BACKUP_DIR` (default `backups/`) |
| **Build steps** | `npm ci`, `prisma generate`, `next build`, `prisma migrate deploy` |
| **Production start** | `next start` (default port 3000) |

---

## 2. Frontend Analysis

| Item | Details |
|------|--------|
| **Framework** | React (Next.js App Router), single app |
| **Bundled with backend** | Yes — one Next.js app serves both API and UI |
| **Build process** | `next build` (Next.js built-in) |
| **Env vars (frontend)** | `NEXT_PUBLIC_APP_ORIGIN` (base URL for browser; e.g. `https://pos.example.com`) |
| **API base URL** | Same origin; `posFetch()` and relative `/api/*` |
| **Rendering** | Hybrid (SSR + client); POS UI is client-rendered with API calls |
| **Production serving** | Next.js server (`next start`) serves static assets and pages |

---

## 3. Database Requirements

| Item | Details |
|------|--------|
| **ORM / client** | Prisma (`@prisma/client`) |
| **PostgreSQL version** | 14+ (recommend 15 or 16 in Docker) |
| **Migrations** | Prisma: `prisma migrate deploy` (uses `prisma/migrations/`) |
| **Seed** | `prisma db seed` (staff, tables, terminals, menu; default password `password123`) |
| **Connection** | `DATABASE_URL` — e.g. `postgresql://user:pass@host:5432/dbname?schema=public` |
| **SSL** | Not required for same-host Docker; for external DB set `?sslmode=require` if needed |
| **Expected usage** | Single venue POS; orders, payments, shifts, idempotency records — moderate size; 10–50 GB sufficient to start |
| **Backups** | In-app backup via `lib/backup/database-backup.ts` (pg_dump to `BACKUP_DIR`); app image includes `postgresql-client`; retention via SystemConfig `backupRetentionDays`; also recommend host cron + off-server copy |

---

## 4. Dockerization

**Recommended architecture:**

- **pos-app** — Next.js (Node); build with `next build`, run `next start`.
- **postgres** — Official PostgreSQL 15 (or 16) image; persistent volume for data.
- **redis** — Official Redis 7 (optional but recommended for SSE realtime when scaling or multi-instance).
- **nginx** — Reverse proxy and static/HTTPS termination (optional if you expose Node directly; recommended for TLS and stability).

**Docker Compose** is sufficient for a single VPS. No Kubernetes required.

```
                    Internet / LAN
                           |
                     [ Nginx :80/:443 ]
                           |
              +-------------+-------------+
              |                           |
        [ Next.js :3000 ]           static/assets
              |                           |
     +--------+--------+                  |
     |        |        |                  |
 [ Postgres ] [ Redis ]  (optional)       |
     :5432      :6379                     |
```

- **Ports:** Nginx 80/443; internal: app 3000, Postgres 5432, Redis 6379 (not exposed publicly).

---

## 5. Networking & Device Access

- **Ports to expose on host:** 80 and 443 (Nginx). Do not expose 3000, 5432, or 6379 to the internet.
- **Local network:** Devices (POS, KDS, manager, admin) reach the VPS IP or hostname (e.g. `https://pos.local` or `https://your-droplet-ip`). Ensure firewall allows 80/443 from LAN/WAN as desired.
- **Domain:** Optional but recommended for HTTPS with a real certificate (e.g. Let’s Encrypt). Set `NEXT_PUBLIC_APP_ORIGIN` and `APP_BASE_URL` to that URL.
- **HTTPS:** Terminate at Nginx; use certbot or ACME in front of Nginx.
- **CORS:** Same-origin by default; if you add a separate front domain, configure CORS in Next.js/API.
- **WebSockets:** Not used; **SSE** is used for realtime (`/api/realtime/stream`). Long-lived HTTP; ensure Nginx doesn’t buffer and timeouts are sufficient (e.g. `proxy_read_timeout 3600s`).

---

## 6. Production Deployment Phases (Step-by-Step)

Execute in order. Commands assume app directory `/opt/pos`; adjust as needed.

| Phase | Description |
|-------|-------------|
| **1 — Server preparation** | Ubuntu 22.04 minimal; create user; SSH key-only; `apt update && apt upgrade`; set hostname; optional swap. |
| **2 — Docker** | Install Docker Engine + Docker Compose (v2); add app user to `docker` group. |
| **3 — Database** | Start Postgres container with volume; create DB/user if not using default; run `prisma migrate deploy` and `prisma db seed` from app container or one-off. |
| **4 — Backend** | Build app image; set env (see §7); run migrations and seed; start app container; health-check `GET /api/health` (returns `{ status: 'ok' }`). |
| **5 — Frontend** | Served by same Next.js container (no separate frontend container). |
| **6 — Reverse proxy** | Configure Nginx: proxy to `pos-app:3000`; static files optional (Next.js serves them); TLS with certbot. |
| **7 — Security** | Firewall (ufw): 22, 80, 443; fail2ban optional; strong `POS_JWT_SECRET` and DB password; no root login. |
| **8 — Backups** | Host volume for Postgres data; cron or scheduled task: `pg_dump` and/or in-app backup to `BACKUP_DIR`; copy to off-server storage. |
| **9 — Monitoring & logging** | Docker logs; optional log driver; optional health endpoint; disk/CPU alerts. |
| **10 — Go-live** | Change default seed passwords; verify POS/KDS/manager login; test payments and realtime; document URLs and credentials. |

### Phase 1 — Server preparation

```bash
sudo apt update && sudo apt upgrade -y
sudo hostnamectl set-hostname pos-server   # optional
sudo adduser pos --disabled-password      # optional deploy user
sudo usermod -aG sudo pos
# Configure SSH: key-only auth, disable password login, restrict root if desired
sudo apt install -y ufw
sudo ufw allow 22 && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable
# Optional: add swap if RAM < 2GB
```

### Phase 2 — Docker installation & configuration

```bash
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update && sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER   # or your deploy user
# Log out and back in so group membership applies
docker compose version   # confirm v2
```

### Phase 3 — Database deployment

Postgres is started by Docker Compose. After first `docker compose up -d`, run migrations and seed from the app container (see Phase 4). No separate DB setup beyond `.env` (POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB).

### Phase 4 — Backend deployment

```bash
cd /opt/pos
git clone <your-repo> .   # or rsync/scp your build context
cp .env.docker.example .env
# Edit .env: set POSTGRES_PASSWORD, POS_JWT_SECRET; optional APP_BASE_URL, NEXT_PUBLIC_APP_ORIGIN
docker compose up -d --build
docker compose exec pos-app npx prisma migrate deploy
docker compose exec pos-app npx prisma db seed   # first time only
curl -s http://localhost/api/health   # expect {"status":"ok"}
```

### Phase 5 — Frontend deployment

No separate step. The same Next.js container serves the frontend (React) and API. Ensure `NEXT_PUBLIC_APP_ORIGIN` is set if clients will use a public URL (e.g. `https://pos.example.com`).

### Phase 6 — Reverse proxy & routing

Nginx is already in `docker-compose.yml` and uses `deploy/nginx.conf`. It proxies all traffic to `pos-app:3000` with `proxy_buffering off` and `proxy_read_timeout 3600s` for SSE. For HTTPS: place fullchain.pem and privkey.pem in `deploy/ssl/`, uncomment the HTTPS server block in `deploy/nginx.conf`, then `docker compose up -d --force-recreate nginx`.

### Phase 7 — Security hardening

- UFW: 22, 80, 443 only (Phase 1).
- Strong `POS_JWT_SECRET` (min 16 chars) and `POSTGRES_PASSWORD`.
- Optional: fail2ban for SSH; non-root run of app (Dockerfile already uses `nextjs` user).
- Do not expose 3000, 5432, 6379 to the internet.

### Phase 8 — Backup strategy

- **Volume:** Postgres data in Docker volume `postgres_data`; backups and uploads in `pos_backups` and `pos_uploads`.
- **In-app backup:** Admin can trigger backup via API; app image includes `postgresql-client` so `pg_dump` runs inside the container and writes to `BACKUP_DIR` (mounted at `/app/backups`). Retention is configurable via SystemConfig.
- **External backup:** Cron on host: `docker compose exec -T postgres pg_dump -U posuser pos > /backup/path/pos_$(date +%Y%m%d).sql`, then copy to off-server storage.

### Phase 9 — Monitoring & logging

- Health: `GET /api/health` (used by Docker healthcheck).
- Logs: `docker compose logs -f pos-app` (and postgres, nginx as needed).
- Optional: log driver (e.g. json-file with max-size); disk/CPU alerts via your provider or Prometheus.

### Phase 10 — Go-live checklist

See **Go-Live Checklist** at the end of this document.

---

## 7. Environment Configuration

All required and optional variables:

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://posuser:SecurePass@postgres:5432/pos?schema=public` |
| `POS_JWT_SECRET` | Yes | JWT signing secret (min 16 chars) | `your-production-secret-min-16-chars` |
| `REDIS_URL` | No | Redis URL for realtime bus (multi-instance) | `redis://redis:6379` |
| `NODE_ENV` | Set by Docker | `production` | `production` |
| `APP_BASE_URL` | Recommended | Base URL for server (Pesapal, links) | `https://pos.example.com` |
| `NEXT_PUBLIC_APP_ORIGIN` | Recommended | Base URL for browser | `https://pos.example.com` |
| `BACKUP_DIR` | No | Path for pg_dump backups | `/app/backups` |
| `CAFE_NAME` | No | Name in print jobs | `Café Havilah` |
| `PESAPAL_*` | No | Pesapal payment integration | See `.env.example` |

---

## 8. Performance & Scaling

- **Resource usage:** 1 vCPU / 2 GB RAM can run app + Postgres + Nginx; 2 vCPU / 4 GB preferred for busy periods.
- **Bottlenecks:** DB connections (Prisma pool); long SSE connections (one per KDS/POS tab).
- **Caching:** No app-level cache required initially; Redis used only for realtime bus if set.
- **Sessions:** Stateless JWT; optional refresh; token version in DB for revocation.
- **Horizontal scaling:** Run multiple app replicas behind a load balancer and set `REDIS_URL` so SSE events are shared; stickiness for SSE is helpful but not mandatory if Redis is used.
- **When to use managed DB:** When you need HA, automated backups, or off-VPS replication; or when DB size or connection count exceeds what the single Postgres container can handle.

---

## 9. Failure & Recovery

- **Restart:** Use Docker Compose `restart: unless-stopped` for app, Postgres, Redis, Nginx.
- **Data persistence:** Postgres data on named volume; app uploads and `BACKUP_DIR` on bind mounts or named volumes so they survive container recreation.
- **Postgres backup:** Run `pg_dump` from a cron job or sidecar; store in `BACKUP_DIR` and/or copy to S3/another server. Test restore on a staging DB.
- **Disaster recovery:** Restore Postgres from last backup; redeploy app from image; restore env; run migrations if needed; verify seed/default users.

---

## 10. Final Deliverables

### (1) Architecture diagram (text)

```
                    Internet / LAN (clients: POS, KDS, manager, admin, mobile)
                                        |
                              Ports 80 (HTTP) / 443 (HTTPS)
                                        |
                              +------------------+
                              |  nginx (proxy)   |
                              |  deploy/nginx.conf
                              +--------+---------+
                                       |
                              proxy_pass to pos-app:3000
                              (buffering off; read_timeout 3600s for SSE)
                                       |
              +------------------------+------------------------+
              |                                                         |
    +---------v---------+                                    +----------v----------+
    |  pos-app (Next.js) |                                    |  Static / _next     |
    |  next start :3000  |                                    |  (same container)   |
    |  - API (REST)      |                                    +---------------------+
    |  - SSE /api/realtime/stream
    |  - Health /api/health
    +---------+----------+
              |
    +---------+---------+
    |         |         |
    v         v         v
+--------+ +------+ +-------------+
|postgres| | redis| | pos_uploads |
|  :5432 | |:6379 | | pos_backups |
|volume  | |volume| | (volumes)   |
+--------+ +------+ +-------------+
```

- **Containers:** `nginx`, `pos-app`, `postgres`, `redis`.  
- **External ports:** 80, 443 only. 3000, 5432, 6379 are internal.

### (2) Docker Compose structure

| Service   | Image / build | Role |
|----------|----------------|------|
| `postgres` | `postgres:16-alpine` | PostgreSQL; volume `postgres_data` |
| `redis`    | `redis:7-alpine`     | Realtime bus (SSE multi-instance); volume `redis_data` |
| `pos-app`  | `build: .`           | Next.js app; env from `.env` + DATABASE_URL/REDIS_URL; volumes `pos_uploads`, `pos_backups`; healthcheck `/api/health` |
| `nginx`    | `nginx:alpine`       | Reverse proxy; ports 80, 443; config `./deploy/nginx.conf` |

File: **`docker-compose.yml`** in repo root. Compose is sufficient; no Kubernetes.

### (3) Deployment phases in order

1. Server preparation (Ubuntu 22.04, user, SSH, ufw)  
2. Docker installation & configuration (Engine + Compose v2)  
3. Database deployment (Compose starts Postgres; migrations/seed from pos-app)  
4. Backend deployment (build image, env, migrate, seed, health check)  
5. Frontend deployment (same container; set NEXT_PUBLIC_APP_ORIGIN if needed)  
6. Reverse proxy & routing (Nginx + optional HTTPS in deploy/nginx.conf)  
7. Security hardening (firewall, secrets, no exposed DB/Redis)  
8. Backup strategy (in-app backup + host cron + off-server copy)  
9. Monitoring & logging (health, Docker logs, optional alerts)  
10. Go-live (change default passwords, test POS/KDS/manager/realtime)

### (4) Critical risks and missing requirements

- **Single point of failure:** One VPS; no HA. Mitigation: backups, documented restore.
- **No managed DB:** Postgres on same host; if VPS fails, restore from backup. For HA or very high load, consider moving DB to managed PostgreSQL later.
- **Default seed passwords:** All seeded staff use `password123`. **Must change** before go-live.
- **Next.js Image domains:** If you use external image URLs with Next `<Image>`, add the production domain to `next.config.js` `images.domains`.
- **In-app backup:** The app image includes `postgresql-client` so admin-triggered backups (pg_dump to BACKUP_DIR) work. Still recommend host-level or off-server backups.

### (5) Commands to launch the system in production

```bash
cd /opt/pos
cp .env.docker.example .env
# Edit .env: POSTGRES_PASSWORD, POS_JWT_SECRET; optional APP_BASE_URL, NEXT_PUBLIC_APP_ORIGIN

docker compose up -d --build
docker compose exec pos-app npx prisma migrate deploy
docker compose exec pos-app npx prisma db seed   # first time only

docker compose ps
curl -s http://localhost/api/health
# Then: change default staff passwords; test POS, KDS, manager, realtime.
```

---

## Production Launch Commands

```bash
# On VPS (after cloning repo and placing .env)
cd /opt/pos   # or your app path
cp .env.docker.example .env
# Edit .env: set POSTGRES_PASSWORD, POS_JWT_SECRET, and optionally APP_BASE_URL / NEXT_PUBLIC_APP_ORIGIN

docker compose up -d --build
# Run migrations (first time or after pull)
docker compose exec pos-app npx prisma migrate deploy
# Seed (first time only)
docker compose exec pos-app npx prisma db seed

# Verify
docker compose ps
curl -s http://localhost/api/health
```

First-time setup (server prep + Docker install) is documented in the phase list above; use your automation or run the steps manually.

---

## Troubleshooting

### "Unknown field `sentToBarAt`" or "Unknown field `preparationNotes`" for Order

The schema includes `sentToBarAt` and `preparationNotes` on the Order model. If you see these errors from Prisma, the generated client is out of sync:

1. **Stop the dev server** (and any process holding `node_modules\.prisma\client\query_engine-*.node`).
2. Run: **`npm run db:generate`** (or `npx prisma generate`).
3. Restart the dev server.

On Windows, if you get `EPERM: operation not permitted` when running `prisma generate`, close the Next.js dev server and any terminals that might be using the app, then run the command again.

---

## Go-Live Checklist

- [ ] Ubuntu 22.04 VPS created; SSH access configured
- [ ] Docker and Docker Compose v2 installed
- [ ] Repo cloned (e.g. to `/opt/pos`); `.env` created from `.env.docker.example`
- [ ] `POSTGRES_PASSWORD` and `POS_JWT_SECRET` set to strong values
- [ ] `docker compose up -d --build` successful
- [ ] `prisma migrate deploy` and `prisma db seed` run
- [ ] Default staff passwords changed (seed uses `password123`)
- [ ] Firewall allows 80, 443 (and 22 for SSH)
- [ ] Optional: TLS certs in `deploy/ssl/` and HTTPS server uncommented in `deploy/nginx.conf`
- [ ] Optional: `APP_BASE_URL` / `NEXT_PUBLIC_APP_ORIGIN` set to public URL
- [ ] Test: login from POS, KDS, and manager; create order; verify realtime updates
- [ ] Backup: cron or manual `pg_dump` / in-app backup and off-server copy
