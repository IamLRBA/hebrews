# Koyeb Deployment Analysis — Structured Report

**Repository:** Cafe Havilah POS  
**Target platform:** Koyeb (serverless containers)  
**Analysis date:** 2026-02

---

## 1. Application type

| Item | Finding |
|------|---------|
| **Framework** | Next.js (App Router). Version: **unpinned** (`"next": "latest"` in package.json). Resolve to a specific major (e.g. 14.x or 15.x) for production. |
| **Node version** | **20** (Dockerfile: `node:20-alpine`). No `engines` in package.json. |
| **Monolith or multi-service** | **Monolith.** Single Next.js app. Current VPS setup uses docker-compose with postgres, redis, nginx — those are separate services; the **application** is one service. For Koyeb, deploy only the app container; DB and Redis are external. |
| **Build output type** | **Default.** No `output: 'standalone'` in next.config.js. Build produces `.next` directory; start uses `next start`. |

---

## 2. Runtime requirements

| Item | Finding |
|------|---------|
| **Required Node version** | **20.x** (from Dockerfile; recommend adding `"engines": { "node": ">=20" }` in package.json). |
| **Package manager** | **npm** (package-lock.json present). |
| **Build command** | `npm run build` → runs `next build`. Must be preceded by `npx prisma generate` (Dockerfile does this). |
| **Start command** | `npm start` → `next start`, or `node node_modules/next/dist/bin/next start` (Dockerfile CMD). |

---

## 3. Port configuration

| Item | Finding |
|------|---------|
| **Port app listens on** | Next.js listens on `process.env.PORT` if set, else **3000**. Dockerfile sets `ENV PORT=3000` and `HOSTNAME="0.0.0.0"`. |
| **Respects PORT env var** | **Yes.** Next.js runtime uses `process.env.PORT`. **Action for Koyeb:** Do not set `ENV PORT=3000` in Dockerfile so Koyeb-injected `PORT` (e.g. 8080) is used; or configure Koyeb to use port 3000. |

---

## 4. Environment variables

### Required (must set for app to run)

| Variable | Purpose | Secrets? |
|----------|---------|----------|
| **DATABASE_URL** | Prisma + app DB connection. Format: `postgresql://USER:PASSWORD@HOST:PORT/DB?schema=public`. | **Yes** (contains password). |
| **POS_JWT_SECRET** | JWT signing for staff auth (lib/pos-auth.ts). Min 16 characters. | **Yes.** |

### Optional (have defaults or only for specific features)

| Variable | Purpose | Tied to localhost? |
|----------|---------|--------------------|
| NODE_ENV | Set to `production` in production. | No. |
| APP_BASE_URL | Server-side links, Pesapal callback (lib/config). | Example in .env uses domain; not localhost in code. |
| NEXT_PUBLIC_APP_ORIGIN | Browser origin. | Example uses domain. |
| REDIS_URL | Realtime bus (lib/realtime-bus). If unset, in-memory (single instance). | **Yes in examples:** `.env.production.example` has `redis://redis:6379`; `.env.example` has `redis://localhost:6379`. For Koyeb use external Redis URL. |
| BACKUP_DIR | In-app backup output (default: `process.cwd()/backups`). | No; default is path relative to cwd. |
| POS_UPLOAD_BASE | Upload directory (default: `process.cwd()/public/pos-images`). | No. |
| CAFE_NAME | Print/display name. | No. |
| ADMIN_USERNAME / ADMIN_PASSWORD_HASH | Legacy admin login; unset → admin-login returns 503. | No. |
| PESAPAL_* | Pesapal payment (PESAPAL_BASE_URL, CONSUMER_KEY, CONSUMER_SECRET, IPN_ID, CALLBACK_URL, WEBHOOK_SECRET). | No. |

### Variables tied to local / compose (do not use on Koyeb as-is)

| Variable | Current use | Koyeb action |
|----------|--------------|--------------|
| POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB | Used in docker-compose to build DATABASE_URL with host `postgres`. | Omit; set only **DATABASE_URL** (full URL from Neon/Supabase). |
| DATABASE_URL with host `postgres` | Compose service name. | Replace with managed DB URL. |
| REDIS_URL with host `redis` or `localhost` | Compose / local. | Use external Redis URL (e.g. Koyeb Redis, Upstash) if needed. |
| APP_BASE_URL / NEXT_PUBLIC_APP_ORIGIN `http://localhost:3000` | Dev example. | Set to Koyeb app URL or custom domain. |

### Secrets (must be injected as secrets, never committed)

- **DATABASE_URL**
- **POS_JWT_SECRET**
- **ADMIN_PASSWORD_HASH** (if used)
- **PESAPAL_CONSUMER_SECRET**, **PESAPAL_WEBHOOK_SECRET** (if used)

---

## 5. Database usage

| Item | Finding |
|------|---------|
| **Type** | **PostgreSQL.** |
| **ORM** | **Prisma** (@prisma/client ^5.22.0). |
| **Connection method** | Single `DATABASE_URL` env var; no hardcoded host in app code. |
| **Local vs external** | **Currently:** docker-compose uses local postgres service. **For Koyeb:** Must use **external** managed PostgreSQL (Neon, Supabase, etc.). |
| **Migration strategy** | `prisma migrate deploy` applies migrations. No SSH on Koyeb — run migrations **outside** the app (CI, one-off job, or local with production URL). Seed via `node prisma/seed.js` or `npx prisma db seed` the same way. Managed Postgres often requires SSL: add `?sslmode=require` to DATABASE_URL. |

---

## 6. External services

| Service | Used? | Provisioning |
|---------|--------|--------------|
| **Redis** | **Optional.** lib/realtime-bus.ts: if REDIS_URL set, uses Redis for multi-instance SSE; else in-memory (single instance). | For multi-instance on Koyeb: provision Redis (Koyeb Redis, Upstash, etc.) and set REDIS_URL. |
| **File storage** | **Yes (local today).** Product/table image uploads and in-app backup write to disk (see §7). | For Koyeb: use object storage (S3, R2, etc.) or accept ephemeral uploads; backups must be reworked or use managed-DB backups. |
| **Email** | **Dependencies only.** @sendgrid/mail, nodemailer in package.json; no active send path found in app code (mock auth in lib/auth.ts). | No provisioning required unless you add email features. |
| **Payment (Pesapal)** | **Optional.** app/api/payments/pesapal, app/api/orders/.../pay-pesapal. Config via PESAPAL_* env. | If using Pesapal: set API keys and webhook URL to Koyeb app domain. |
| **Twilio** | In package.json; no active usage found in API routes. | No provisioning required unless used. |

---

## 7. Filesystem usage

| Location | Purpose | Writable? |
|----------|---------|-----------|
| **process.cwd()/public/pos-images** (or POS_UPLOAD_BASE) | Product image uploads: `app/api/admin/upload/product-image/route.ts` — `writeFile(filePath, buffer)`. Table image uploads: `app/api/admin/upload/table-image/route.ts` — same. | **Yes.** Writes to local disk. |
| **process.cwd()/backups** (or BACKUP_DIR) | In-app backup: `lib/backup/database-backup.ts` runs `pg_dump` and writes `.sql` files; also uses `fs.statSync`, `fs.existsSync`, `fs.unlinkSync`. | **Yes.** Writes to local disk. |
| **Dockerfile** | Creates `/app/public/pos-images` and `/app/backups` in image. | Ephemeral on Koyeb; no persistent volume. |
| **scripts/safe-add-enum.ts** | Writes to `backups/` and migration files (dev-time). | N/A at runtime. |

**Conclusion:** Uploads and backups assume **persistent local disk**. On Koyeb (ephemeral filesystem), data in these paths is lost on restart. **Blocking for stateless deployment** unless uploads/backups are moved to external storage or disabled.

---

## 8. Production blockers for serverless deployment

| Category | Finding |
|----------|---------|
| **Hardcoded IPs or localhost** | **Config only.** next.config.js `images.domains: ['localhost']` — production domain must be added. Example env files use `localhost` / `postgres` / `redis` for local/compose; **no hardcoded hostnames in application code.** |
| **Docker dependencies** | **Image:** Dockerfile installs `postgresql-client` (for in-app pg_dump). Not needed if backup is disabled or moved. **Compose:** App does not depend on compose at runtime; only env (DATABASE_URL, REDIS_URL) must point to external services. |
| **OS-level requirements** | Alpine base: `libc6-compat`, `wget`, `openssl`, `postgresql-client`. Prisma binaryTargets include `linux-musl-openssl-3.0.x` — correct for Alpine. No other OS assumptions. |
| **Background workers** | **None.** No cron, no separate worker process. Backup is on-demand via API. Client-side polling/setInterval and SSE are in-request/in-connection. |
| **Cron jobs** | **None** in repo. |

**Blockers summary:** (1) **Stateful disk** — uploads and backup; (2) **pg_dump** in container (backup); (3) **images.domains** only localhost; (4) **Migrations/seed** must run outside app.

---

## 9. Security issues

| Item | Finding |
|------|---------|
| **Exposed secrets** | **None found.** No .env or real credentials in repo. Example files use placeholders (CHANGE_ME_*, your-secret-*). |
| **Default credentials** | **None in code.** Seed (prisma/seed.js) creates staff with password `password123` — intended for initial setup; must be changed after first login (documented). |
| **Insecure configurations** | **Minor:** next.config.js `images.domains: ['localhost']` only — add production domain to avoid broken Image optimization and to restrict allowed origins. Security headers (HSTS, X-Frame-Options, etc.) are already set. |

---

## 10. Final verdict

### **NEEDS MODIFICATIONS**

The application **can run on Koyeb** after addressing the following.

**Must fix:**

1. **Statelessness** — Replace or disable local file writes:  
   - **Uploads:** Use object storage (S3/R2) or document that uploads are ephemeral.  
   - **Backups:** Use managed-DB backups and/or stream pg_dump to external storage; remove or make optional `postgresql-client` in Dockerfile.
2. **Next.js config** — Add production domain to `images.domains` in next.config.js.
3. **Port** — Omit `ENV PORT=3000` in Dockerfile so Koyeb’s PORT is used, or set Koyeb to use 3000.
4. **Migrations/seed** — Run `prisma migrate deploy` and seed externally (CI or one-off) with production DATABASE_URL.

**Recommended:**

- Pin Next.js (and Node) version.
- Use external PostgreSQL with SSL (`?sslmode=require` in DATABASE_URL).
- Set REDIS_URL only if running multiple instances for SSE.

**Not suitable for:** Deploying as-is with no code or config changes (stateful disk and backup design are incompatible with ephemeral containers).

---

*End of report.*
