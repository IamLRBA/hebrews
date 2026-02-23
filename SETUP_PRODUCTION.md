# Production Setup — POS System (Single VPS)

Step-by-step instructions to deploy the POS on a single Ubuntu 22.04 VPS using Docker. Assumes **only Docker (and Docker Compose) are installed** (e.g. after Phase 1 server preparation).

---

## Prerequisites

- Ubuntu 22.04 (or compatible) VPS
- Docker Engine and Docker Compose v2 plugin installed
- SSH access as a user that can run `docker compose`
- (Optional) Domain pointing to the VPS for HTTPS later

---

## 1. Copy Project to VPS

From your local machine (replace `posadmin` and `YOUR_VPS_IP`):

```bash
# Option A: Git clone (if repo is in a remote)
ssh posadmin@YOUR_VPS_IP "mkdir -p /opt/pos && cd /opt/pos && git clone https://github.com/YOUR_ORG/YOUR_REPO.git ."

# Option B: rsync from local
rsync -avz --exclude node_modules --exclude .next --exclude .git ./ posadmin@YOUR_VPS_IP:/opt/pos/

# Option C: SCP tarball
tar --exclude=node_modules --exclude=.next --exclude=.git -czf pos-app.tar.gz .
scp pos-app.tar.gz posadmin@YOUR_VPS_IP:/opt/
ssh posadmin@YOUR_VPS_IP "cd /opt && tar -xzf pos-app.tar.gz -C pos && rm pos-app.tar.gz"
```

Then SSH into the VPS:

```bash
ssh posadmin@YOUR_VPS_IP
cd /opt/pos
```

---

## 2. Create `.env`

Create environment file from the production template and edit with real values:

```bash
cp .env.production.example .env
chmod 600 .env
```

Edit `.env` and set at minimum:

- **POSTGRES_PASSWORD** — strong password for PostgreSQL
- **POS_JWT_SECRET** — at least 16 random characters (e.g. `openssl rand -base64 24`)
- **DATABASE_URL** — must match: `postgresql://POSTGRES_USER:POSTGRES_PASSWORD@postgres:5432/POSTGRES_DB?schema=public`

If using a public URL (e.g. for Pesapal or browser):

- **APP_BASE_URL** — e.g. `https://pos.example.com`
- **NEXT_PUBLIC_APP_ORIGIN** — same as APP_BASE_URL

---

## 3. Build Containers

From `/opt/pos`:

```bash
docker compose build --no-cache
```

Expect the build to run `prisma generate` and `next build` inside the builder stage.

---

## 4. Start Services

```bash
docker compose up -d
```

This starts, in order:

1. **postgres** — PostgreSQL 16 (waits for healthy)
2. **redis** — Redis 7 (waits for healthy)
3. **pos-app** — Next.js app (waits for postgres + redis healthy)
4. **nginx** — Reverse proxy (waits for pos-app healthy)

Only ports **80** and **443** are exposed on the host. Internal ports (3000, 5432, 6379) are not published.

---

## 5. Run Migrations

After the stack is up, apply Prisma migrations:

```bash
docker compose exec pos-app npx prisma migrate deploy
```

This applies all migrations in `prisma/migrations/` to the production database. **Do not use** `prisma migrate dev` in production.

---

## 6. Seed Database (First Time Only)

To create initial staff, terminals, tables, and products:

```bash
docker compose exec pos-app npx prisma db seed
```

**Important:** The seed uses a default password (`password123`) for all staff. **Change every staff password** before go-live (via Admin → Staff).

---

## 7. Verify Health Endpoint

From the VPS:

```bash
curl -s http://localhost/api/health
```

Expected: `{"status":"ok"}`

From another machine (if firewall allows):

```bash
curl -s http://YOUR_VPS_IP/api/health
```

---

## 8. Access the App

- **POS / KDS / Manager / Admin:** Open in browser: `http://YOUR_VPS_IP` (or `https://pos.example.com` after configuring TLS).
- **Login:** Use a seeded staff username and the seed password (then change it).
- **Realtime (SSE):** Kitchen/bar displays and POS use the same origin; no extra config if you use the same host.

---

## Useful Commands

| Task | Command |
|------|--------|
| View logs | `docker compose logs -f pos-app` |
| Restart app | `docker compose restart pos-app` |
| Stop all | `docker compose down` |
| Stop and remove volumes | `docker compose down -v` (destroys DB data) |
| Run migrations after pull | `docker compose exec pos-app npx prisma migrate deploy` |
| Backup DB (host) | `docker compose exec -T postgres pg_dump -U posuser pos > backup_$(date +%Y%m%d).sql` |

---

## Prisma Production Notes

- **Schema:** `prisma/schema.prisma` uses `provider = "postgresql"` and `url = env("DATABASE_URL")`. No SQLite; production uses PostgreSQL only.
- **Migrations:** Always run `prisma migrate deploy` in production (not `migrate dev`). This applies existing migration files without creating new ones.
- **Safe migration command:**  
  `docker compose exec pos-app npx prisma migrate deploy`

---

## Enabling HTTPS Later

1. Obtain certificates (e.g. Let’s Encrypt with certbot).
2. Place `fullchain.pem` and `privkey.pem` in `deploy/ssl/` on the VPS.
3. In `deploy/nginx.conf`, uncomment the `server { listen 443 ssl; ... }` block and set `server_name` to your domain.
4. Mount the certs in `docker-compose.yml` (e.g. add volume `./deploy/ssl:/etc/nginx/ssl:ro` for nginx).
5. Restart nginx: `docker compose up -d --force-recreate nginx`.

---

## Exact Command to Start the System on VPS

From the project directory on the VPS (after `.env` is created):

```bash
cd /opt/pos && docker compose up -d --build && docker compose exec pos-app npx prisma migrate deploy
```

Then once, for initial data:

```bash
docker compose exec pos-app npx prisma db seed
```

Then verify:

```bash
curl -s http://localhost/api/health
```
