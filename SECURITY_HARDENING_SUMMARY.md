# Security Hardening Pass — Summary

**Date:** 2025-02-23  
**Scope:** Cafe Havilah POS — production deployment safety.

---

## 1) Summary of Security Fixes Applied

| Task | Fix |
|------|-----|
| **TASK 1 — Hardcoded credentials** | Removed all hardcoded admin credentials from `lib/auth.ts`. Added server-side `POST /api/auth/admin-login` that validates against `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH` (bcrypt) from env. Client `AuthManager.adminLogin()` now calls this API; returns 503 if env not set (fail securely). No plaintext passwords stored. |
| **TASK 2 — Redis** | `lib/realtime-bus.ts`: graceful fallback on connection error (no crash); `REDIS_URL` optional (in-memory when unset). Docker Compose: Redis service under profile `redis`; pos-app no longer depends on Redis, so stack runs without Redis. Set `REDIS_URL` in .env and run `docker compose --profile redis up` to enable Redis. |
| **TASK 3 — Storage** | Added `lib/storage-paths.ts`: production-safe defaults (`/app/public/pos-images`, `/app/backups` via `process.cwd()` in container). `ensureUploadDirs()` and `ensureBackupDir()` create directories if missing. Upload routes and backup use these helpers; no crash on missing folders. Optional overrides: `BACKUP_DIR`, `POS_UPLOAD_BASE`. |
| **TASK 4 — Docker Compose** | PostgreSQL, Redis, uploads, and backups use named volumes. Containers use `restart: unless-stopped`. Only ports 80 and 443 exposed. Redis is optional (profile `redis`). Comments updated for Redis and migration/seed. |

---

## 2) Updated Code / Files

### New files
- **`app/api/auth/admin-login/route.ts`** — Server-side admin login; bcrypt compare; 503 if env missing, 401 if invalid.
- **`lib/storage-paths.ts`** — Centralized upload/backup paths; `ensureUploadDirs()`, `ensureBackupDir()`, `getBackupDir()`.

### Modified files
- **`lib/auth.ts`** — Removed `ADMIN_CREDENTIALS` and `Admin` interface. `adminLogin()` is now `async`, calls `/api/auth/admin-login`, no plaintext comparison.
- **`lib/realtime-bus.ts`** — `initBus()` uses `?.trim()` on `REDIS_URL`; error handlers no-op; on catch sets `subscriberReady = false`; no throw.
- **`lib/backup/database-backup.ts`** — Uses `getBackupDir` and `ensureBackupDir` from `lib/storage-paths`; removed local `BACKUP_DIR`/`ensureBackupDir`.
- **`app/api/admin/upload/product-image/route.ts`** — Uses `ensureUploadDirs().products` from `lib/storage-paths`; no inline `mkdir`.
- **`app/api/admin/upload/table-image/route.ts`** — Uses `ensureUploadDirs().tables` from `lib/storage-paths`; no inline `mkdir`.
- **`docker-compose.yml`** — Redis under `profiles: [redis]`; pos-app `depends_on` only postgres; removed `REDIS_URL` from compose env (use .env); comments for Redis and startup.
- **`.env.production.example`** — Added `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` (optional); `REDIS_URL` commented with profile note; `BACKUP_DIR`/`POS_UPLOAD_BASE` documented.

---

## 3) New Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| **ADMIN_USERNAME** | Optional | Username for legacy AuthManager admin login. If both this and ADMIN_PASSWORD_HASH are set, `/api/auth/admin-login` accepts credentials. |
| **ADMIN_PASSWORD_HASH** | Optional | Bcrypt hash of admin password. Generate with `node -e "console.log(require('bcrypt').hashSync('your-password', 10))"`. Never set plaintext. |
| **POS_UPLOAD_BASE** | Optional | Base path for product/table images. Default: `process.cwd()/public/pos-images`. In Docker typically `/app/public/pos-images`. |

Existing: `BACKUP_DIR`, `REDIS_URL` (optional). No other new variables.

---

## 4) Docker Compose (Production Safety)

- **postgres:** named volume `postgres_data`; healthcheck; restart unless-stopped.
- **redis:** named volume `redis_data`; profile `redis` (optional); restart unless-stopped.
- **pos-app:** named volumes `pos_uploads` (/app/public/pos-images), `pos_backups` (/app/backups); depends only on postgres; restart unless-stopped; healthcheck.
- **nginx:** only 80/443 exposed; restart unless-stopped.

No other ports exposed. Redis can be disabled by not using `--profile redis` and not setting `REDIS_URL`.

---

## 5) Production-Safety Confirmation

- **Zero hardcoded secrets** — Admin auth uses env only; POS auth unchanged (JWT + `POS_JWT_SECRET`).
- **Fail securely** — Admin login returns 503 when env not set; Redis failure does not crash app.
- **Data integrity** — Uploads and backups use named volumes; directories ensured at runtime.
- **Safe defaults** — Paths default to container-friendly values; overrides via env.
- **No breaking changes** — POS login, API routes, and realtime behavior unchanged; Redis and admin login remain optional.

System is suitable for production deployment as a restaurant POS with the documented env and run instructions.
