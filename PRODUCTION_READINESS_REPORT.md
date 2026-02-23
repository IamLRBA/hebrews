# Production Readiness Report — POS System

**Scope:** Codebase analysis for production deployment (Docker, single VPS).  
**Date:** 2025-02-23

---

## 1. Hardcoded Secrets

| Location | Finding | Severity | Recommendation |
|----------|---------|----------|----------------|
| **`lib/auth.ts`** | Hardcoded admin credentials: `ADMIN_CREDENTIALS = { username: 'IamLRBA', password: 'L@ruba1212' }`. Used by `AuthManager.adminLogin()` (client-side, localStorage). | **High** | Remove or move to environment variables / server-side auth. If this module is unused by the POS (POS uses `lib/pos-auth.ts`), consider removing or disabling the legacy auth path. |
| **`prisma/seed.ts`** | Default password `password123` for all seeded staff. | **High** | Documented; **must change all staff passwords before go-live** via Admin → Staff. Do not rely on seed password in production. |

No other hardcoded secrets found in API routes, auth (pos-auth uses `POS_JWT_SECRET` from env), or config.

---

## 2. Dev-Only Configuration

| Location | Finding | Recommendation |
|----------|---------|----------------|
| **`next.config.js`** | `images.domains: ['localhost']` only. | Add production domain(s) to `images.domains` when using Next.js `<Image>` with external or production URLs (e.g. `['localhost', 'pos.example.com']`). |
| **`lib/db.ts`** | Prisma log level: `development ? ['error','warn'] : ['error']`. | Appropriate; production only logs errors. |
| **`lib/hardware/*.ts`** | Cash drawer, kitchen printer, receipt printer check `NODE_ENV === 'development'` for mock behavior. | Correct; production uses real/muted behavior. |
| **`app/api/auth/login/route.ts`** | Returns detailed error message when `NODE_ENV === 'development'`. | Correct; production uses generic "Invalid username or password". |

---

## 3. Unsafe Defaults

| Item | Default | Recommendation |
|------|---------|----------------|
| **POSTGRES_PASSWORD** | Must be set in `.env` (docker-compose uses `?` so empty fails). | Good; no default. |
| **POS_JWT_SECRET** | Must be ≥16 chars (enforced in `lib/pos-auth.ts`). | Good; app fails fast if missing or short. |
| **Seed staff passwords** | All `password123`. | Change before go-live; no runtime default in app. |
| **CORS** | Same-origin; no explicit CORS middleware in API. | If frontend is ever on a different domain, add CORS configuration. |

---

## 4. Missing Environment Variables

| Variable | Required For | If Missing |
|----------|--------------|------------|
| **DATABASE_URL** | Prisma / DB | App fails at startup or first DB access. |
| **POS_JWT_SECRET** | JWT signing | App throws on first auth use (min 16 chars). |
| **REDIS_URL** | Realtime (multi-instance SSE) | Optional; falls back to in-memory bus (single instance only). |
| **APP_BASE_URL / NEXT_PUBLIC_APP_ORIGIN** | Pesapal callbacks, links | Optional; empty string in config. |
| **PESAPAL_WEBHOOK_SECRET** | Pesapal webhook verification | Webhook returns 500 if not set and webhook is called. |

All required variables are documented in `.env.production.example`.

---

## 5. Debug Logs

| Location | Usage | Recommendation |
|----------|--------|----------------|
| **`app/api/admin/upload/product-image/route.ts`** | `console.error` on upload failure | Acceptable for production (error path). |
| **`app/api/auth/login/route.ts`** | `console.error` for invalid password hash | Acceptable. |
| **`app/api/payments/pesapal/webhook/route.ts`** | `console.error` when webhook secret not configured | Acceptable. |
| **`lib/error-logger.ts`** | Adds stack trace only in development | Correct. |
| **`prisma/seed.ts`** | `console.log` for seeded entities | Runs only during seed; acceptable. |
| **`lib/hardware/*.ts`** | Various `console.log` in dev branches | Only in development; acceptable. |

No widespread `console.log` in production API paths. No change required for production.

---

## 6. Potential Production Issues

| Issue | Description | Mitigation |
|-------|-------------|------------|
| **Single point of failure** | One VPS; no HA for app or DB. | Backups, documented restore, optional managed DB later. |
| **Legacy auth module** | `lib/auth.ts` stores passwords in localStorage and has hardcoded admin credentials. | Confirm if any route or page uses it; if not, remove or secure. |
| **Next.js Image domains** | Only `localhost` in config. | Add production hostname when using external images. |
| **Pesapal webhook** | Returns 500 if `PESAPAL_WEBHOOK_SECRET` not set and webhook is hit. | Set secret when using Pesapal; or return 404/503 if not using. |
| **Backup retention** | `deleteOldBackups()` in codebase not called on a schedule. | Use host cron or scheduled task to trigger backups and cleanup. |
| **File uploads** | Product/table images written to `public/pos-images`. | Ensure volume `pos_uploads` is mounted and backup strategy includes these if needed. |

---

## 7. Summary

- **Secrets:** No hardcoded secrets in POS auth or API; **`lib/auth.ts`** contains hardcoded admin credentials (legacy/customer-facing auth) and should be fixed or removed.
- **Config:** Production env template (`.env.production.example`) and docker-compose are aligned; no dev-only env in production path.
- **Defaults:** Seed password must be changed; no unsafe defaults in runtime for DB or JWT.
- **Logging:** No debug logs in production hot paths; error logging is appropriate.
- **Prisma:** PostgreSQL only; migrations via `prisma migrate deploy`; seed once then change passwords.

**Verdict:** Ready for production deployment with the following manual actions: (1) set strong `POSTGRES_PASSWORD` and `POS_JWT_SECRET` in `.env`, (2) change all seeded staff passwords after first login, (3) add production domain to `next.config.js` `images.domains` if using external images, (4) address `lib/auth.ts` if that module is in use.
