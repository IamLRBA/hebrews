# Cafe Havilah POS — Production Deployment Runbook

**Repository:** https://github.com/IamLRBA/cafe-havilah  
**Target:** Single Ubuntu 22.04 VPS, Docker Compose only.  
**Assumptions:** Server prepared, Docker installed, SSH working, security hardening done. No managed services.

---

## 1) Project Transfer to Server

### Recommended: Git clone

On the VPS (SSH in first):

```bash
sudo mkdir -p /opt/pos
sudo chown "$USER:$USER" /opt/pos
cd /opt/pos
git clone https://github.com/IamLRBA/cafe-havilah.git .
```

### Alternative: Rsync from local machine

From your **local** machine (replace `USER` and `VPS_IP`):

```bash
rsync -avz --exclude node_modules --exclude .next --exclude .git \
  ./cafe-havilah/ USER@VPS_IP:/opt/pos/
```

Then on the VPS ensure directory exists and owner:

```bash
ssh USER@VPS_IP "mkdir -p /opt/pos && chown -R \$USER:\$USER /opt/pos"
```

### Alternative: SCP tarball

From local (in repo root):

```bash
tar --exclude=node_modules --exclude=.next --exclude=.git -czf pos.tar.gz .
scp pos.tar.gz USER@VPS_IP:/tmp/
ssh USER@VPS_IP "mkdir -p /opt/pos && tar -xzf /tmp/pos.tar.gz -C /opt/pos && rm /tmp/pos.tar.gz"
```

---

## 2) Production Environment Setup

### Generate secrets (on any machine with openssl / Node)

```bash
# JWT secret (min 16 chars)
openssl rand -base64 24

# Postgres password (example; use your own)
openssl rand -base64 24

# Admin password hash (only if using legacy AuthManager admin login)
# Run from repo root with Node:
node -e "console.log(require('bcrypt').hashSync('YOUR_ADMIN_PASSWORD', 10))"
```

### Create `.env` on the VPS

```bash
cd /opt/pos
cp .env.production.example .env
chmod 600 .env
```

Edit `.env` (e.g. `nano .env`). Use the variables below. Replace placeholders with your generated/real values.

### Exact `.env` for this repository

```bash
# =============================================================================
# REQUIRED
# =============================================================================
POSTGRES_USER=posuser
POSTGRES_PASSWORD=<paste openssl rand -base64 24>
POSTGRES_DB=pos

# Must match: postgresql://POSTGRES_USER:POSTGRES_PASSWORD@postgres:5432/POSTGRES_DB?schema=public
DATABASE_URL=postgresql://posuser:<SAME_AS_POSTGRES_PASSWORD>@postgres:5432/pos?schema=public

# Min 16 characters (e.g. openssl rand -base64 24)
POS_JWT_SECRET=<paste openssl rand -base64 24>

# =============================================================================
# OPTIONAL (recommended for production)
# =============================================================================
NODE_ENV=production

# Use when accessing via domain (Pesapal, links, browser). Replace with your URL or VPS IP.
APP_BASE_URL=http://YOUR_VPS_IP_OR_DOMAIN
NEXT_PUBLIC_APP_ORIGIN=http://YOUR_VPS_IP_OR_DOMAIN

# =============================================================================
# OPTIONAL — Redis (only if using --profile redis)
# =============================================================================
# REDIS_URL=redis://redis:6379

# =============================================================================
# OPTIONAL — Backups (default in container: /app/backups)
# =============================================================================
BACKUP_DIR=/app/backups

# =============================================================================
# OPTIONAL — Legacy admin login (AuthManager). Bcrypt hash only.
# =============================================================================
# ADMIN_USERNAME=admin
# ADMIN_PASSWORD_HASH=$2b$10$...from node -e "require('bcrypt')..."

# =============================================================================
# OPTIONAL
# =============================================================================
# CAFE_NAME=Café Havilah
```

**Variable summary**

| Variable             | Required | Notes |
|----------------------|----------|--------|
| POSTGRES_USER        | Yes      | e.g. posuser |
| POSTGRES_PASSWORD    | Yes      | Strong; no quotes in .env |
| POSTGRES_DB          | No       | Default: pos |
| DATABASE_URL         | Yes      | Must match POSTGRES_* |
| POS_JWT_SECRET       | Yes      | Min 16 chars |
| NODE_ENV             | No       | Set to production |
| APP_BASE_URL         | No       | Public URL or http://IP |
| NEXT_PUBLIC_APP_ORIGIN | No    | Same as APP_BASE_URL |
| REDIS_URL            | No       | Only if using Redis profile |
| BACKUP_DIR           | No       | Default /app/backups |
| ADMIN_USERNAME       | No       | Legacy admin login |
| ADMIN_PASSWORD_HASH  | No       | Bcrypt only |
| CAFE_NAME            | No       | Print jobs |

---

## 3) Docker Build & Startup

### Build images

```bash
cd /opt/pos
docker compose build --no-cache
```

### Start services (without Redis)

```bash
docker compose up -d
```

### Start with Redis (optional)

```bash
# Add REDIS_URL=redis://redis:6379 to .env, then:
docker compose --profile redis up -d
```

### Verify containers

```bash
docker compose ps
```

Expect: postgres, pos-app, nginx (and redis if profile used) **Up**. Only 80 and 443 should be published.

```bash
docker compose ps -a
# All listed services should show "running" or "Up"
```

---

## 4) Database Migration & Seeding

### Apply migrations (always safe in production)

```bash
docker compose exec pos-app npx prisma migrate deploy
```

**Do not run** `prisma migrate dev` or `db push` in production (can create or alter schema unpredictably).

### Seed database (first time only)

```bash
docker compose exec pos-app npx prisma db seed
```

Creates staff, terminals, tables, and products. **All seeded staff use default password `password123`.** Change every staff password before go-live via **Admin → Staff**.

---

## 5) Health Checks

### API health

```bash
curl -s http://localhost/api/health
```

Expected: `{"status":"ok"}`

From another machine (firewall allowing 80):

```bash
curl -s http://YOUR_VPS_IP/api/health
```

### Container health

```bash
docker compose ps
docker compose exec pos-app wget -q -O - http://localhost:3000/api/health
```

### Logs

```bash
# All services
docker compose logs -f

# App only
docker compose logs -f pos-app

# Last 100 lines
docker compose logs --tail=100 pos-app
```

---

## 6) Access Instructions

All interfaces use the **same base URL**. Login at `/pos/login`; after login you are redirected by role.

### Using VPS IP (no domain)

- Base URL: `http://YOUR_VPS_IP`
- POS login: `http://YOUR_VPS_IP/pos/login`
- After login:
  - **Admin** → `/admin/dashboard`
  - **Manager** → `/manager/dashboard`
  - **Kitchen** → `/kitchen` (then choose shift)
  - **Bar** → `/bar` (then choose shift)
  - **POS** → `/pos/start`

### Using domain

- Set in `.env`: `APP_BASE_URL=https://your-domain.com`, `NEXT_PUBLIC_APP_ORIGIN=https://your-domain.com`
- Restart app: `docker compose restart pos-app`
- Configure TLS at Nginx (see repo `deploy/nginx.conf` and `SETUP_PRODUCTION.md`), then use `https://your-domain.com` as above.

### Direct paths

| Interface        | Path              |
|-----------------|-------------------|
| POS login       | `/pos/login`      |
| POS start       | `/pos/start`      |
| POS order       | `/pos/order`      |
| POS orders list | `/pos/orders`     |
| POS ready       | `/pos/ready`      |
| POS tables      | `/pos/tables`     |
| POS shift       | `/pos/shift`      |
| POS close       | `/pos/close`      |
| Admin dashboard | `/admin/dashboard`|
| Admin staff     | `/admin/staff`    |
| Admin settings  | `/admin/settings` |
| Manager dashboard | `/manager/dashboard` |
| Manager orders  | `/manager/orders` |
| Manager shifts  | `/manager/shifts` |
| Kitchen         | `/kitchen`        |
| Bar             | `/bar`            |

---

## 7) Backup Strategy

### Run database backup (in-app)

From Admin UI: **Admin → Settings → Backup** (triggers pg_dump into BACKUP_DIR).

Or via API (with valid JWT):

```bash
# Backup files land in the pos_backups volume; list from app:
docker compose exec pos-app ls -la /app/backups
```

### Run backup from host (recommended for cron)

```bash
mkdir -p /opt/pos-backups
docker compose exec -T postgres pg_dump -U posuser pos > "/opt/pos-backups/pos_$(date +%Y%m%d_%H%M%S).sql"
```

### Locate backup files

- **In-container (in-app backup):** `/app/backups` inside pos-app (mounted volume `pos_backups`). To copy out:
  ```bash
  docker compose run --rm -v "$(pwd)/backups-out:/out" pos-app sh -c "cp -a /app/backups/. /out/"
  ```
- **Host (pg_dump):** e.g. `/opt/pos-backups/pos_YYYYMMDD_HHMMSS.sql`

### Restore from backup

**Stop app to avoid writes during restore:**

```bash
cd /opt/pos
docker compose stop pos-app nginx
```

Restore into running Postgres:

```bash
docker compose exec -T postgres psql -U posuser -d pos < /opt/pos-backups/pos_YYYYMMDD_HHMMSS.sql
```

Start app again:

```bash
docker compose start pos-app nginx
```

---

## 8) Safe Restart & Maintenance

### Update application (pull and rebuild)

```bash
cd /opt/pos
git fetch origin
git pull origin main
docker compose build --no-cache pos-app
docker compose up -d pos-app
docker compose exec pos-app npx prisma migrate deploy
```

### Restart services

```bash
# All
docker compose restart

# One service
docker compose restart pos-app
docker compose restart nginx
docker compose restart postgres
```

### View logs

```bash
docker compose logs -f pos-app
docker compose logs -f nginx
docker compose logs -f postgres
docker compose logs --tail=200 pos-app
```

### Rolling back (after bad deploy)

```bash
cd /opt/pos
git checkout <previous-commit-or-tag>
docker compose build --no-cache pos-app
docker compose up -d pos-app
# Only run migrate deploy if you had run new migrations on the bad deploy; otherwise skip.
```

**Do not run** `docker compose down -v` unless you intend to destroy database and volumes (data loss).

### Stop without data loss

```bash
docker compose down
# Volumes persist. Start again with:
docker compose up -d
```

---

## Quick reference — full first-time deploy

```bash
# On VPS
sudo mkdir -p /opt/pos && sudo chown "$USER:$USER" /opt/pos
cd /opt/pos && git clone https://github.com/IamLRBA/cafe-havilah.git .
cp .env.production.example .env && chmod 600 .env
# Edit .env: set POSTGRES_PASSWORD, POS_JWT_SECRET, DATABASE_URL, APP_BASE_URL, NEXT_PUBLIC_APP_ORIGIN

docker compose build --no-cache
docker compose up -d
docker compose exec pos-app npx prisma migrate deploy
docker compose exec pos-app npx prisma db seed

curl -s http://localhost/api/health
# Then change all staff passwords via Admin → Staff.
```

With Redis:

```bash
# Add REDIS_URL=redis://redis:6379 to .env
docker compose --profile redis up -d --build
# Then migrate and seed as above.
```
