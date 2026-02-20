# Phase 4 — Deployment Readiness (Authentication, Terminals, Audit, Logging)

Prepare the POS backend for real-world deployment with secure authentication, device identity, audit logging, and production-safe error logging.

---

## A) Authentication implementation details

### Replacing x-staff-id

- **Before:** Clients sent `x-staff-id` in headers; the server trusted it. Any client could impersonate any staff member.
- **After:** Staff authenticate with username/password; the server issues a **JWT** and returns it in the login response. Every protected request must send `Authorization: Bearer <token>`. Identity is derived from the verified token, not from client-supplied headers.

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **JWT creation** | `lib/pos-auth.ts` — `createStaffToken({ staffId, role, tokenVersion })` | Called after successful login; returns a signed JWT (default expiry 8h). Payload includes `v` (tokenVersion) for revocation (Phase 5). |
| **JWT verification** | `lib/pos-auth.ts` — `verifyStaffToken(token)` | Validates signature, expiry, and DB: rejects if staff inactive or `staff.tokenVersion > token.v`. Returns `{ staffId, role }` or null. |
| **Request identity** | `lib/pos-auth.ts` — `getAuthenticatedStaff(request)` | Reads `Authorization: Bearer <token>`, verifies token (including version/active), returns `{ staffId, role }`. Throws `UnauthorizedError` (no token) or `InvalidTokenError` (invalid/expired/revoked). |
| **Login** | `app/api/auth/login/route.ts` | Validates username/password (bcrypt), issues JWT via `createStaffToken`, returns `{ token, staffId, role, fullName }`. Writes `AUTH_LOGIN` audit entry. |
| **Session check** | `app/api/auth/me/route.ts` | Uses `getAuthenticatedStaff(request)`; returns current staff profile. No use of `x-staff-id`. |
| **Client** | `lib/pos-client.ts` | After login, stores token with `setStaffSession(token, staffId, role)`. `posFetch()` sends `Authorization: Bearer <token>`. No longer sends `x-staff-id` as proof of identity. |

### Environment

- **`POS_JWT_SECRET`** (required): Secret for signing/verifying JWTs. Must be at least 16 characters. Set in production and never commit.

### Roles

Authorization supports roles: **cashier**, **waiter**, **kitchen**, **manager**, **admin**. Role is embedded in the JWT and used by existing role guards (e.g. `assertStaffRole` in `lib/domain/role-guard.ts`). Phase 3 workflow rules (e.g. assigned waiter, manager override) use the **authenticated** `staffId` from the token.

### Migration pattern for API routes

Replace:

```ts
const staffId = request.headers.get('x-staff-id')?.trim()
if (!staffId) return NextResponse.json({ error: 'Staff session required' }, { status: 401 })
```

With:

```ts
const { staffId } = await getAuthenticatedStaff(request)
```

Catch errors and return `toPosApiResponse(error)` so 401/403 are returned correctly. Routes that currently take `staffId` from the request body (e.g. pay-cash, pay-momo, kitchen status) must use the authenticated `staffId` instead and **must not** trust body-supplied `staffId`.

### Routes updated in Phase 4 (example)

- `POST /api/auth/login` — issues JWT; audit `AUTH_LOGIN`.
- `GET /api/auth/me` — verifies JWT only.
- `POST /api/orders/[orderId]/pay-cash` — uses `getAuthenticatedStaff`; optional `x-terminal-id`; audit `PAYMENT`.
- `POST /api/shifts/start` — uses `getAuthenticatedStaff`; terminal from body or `x-terminal-id`, validated against DB; audit `SHIFT_START`.

**Other routes** that still read `x-staff-id` or body `staffId` should be migrated to `getAuthenticatedStaff(request)` in a follow-up pass (see list in section G).

---

## B) Terminal / device identity system

### Schema

- **`Terminal`** table: `id`, `code` (unique), `name`, `type` (enum: POS, KDS, manager, mobile), `location` (optional), `isActive`, timestamps.
- Requests that need terminal context send **terminal code** via header **`x-terminal-id`** or (where documented) in the request body as `terminalId`. The server validates the code against the database and checks `isActive`.

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **Lookup** | `lib/terminal.ts` — `getTerminalByCode(code)` | Returns terminal info or null. |
| **Require terminal** | `lib/terminal.ts` — `requireTerminalId(request)` | Reads `x-terminal-id`, validates, returns `TerminalInfo` or throws `TerminalNotFoundError` / `TerminalInactiveError`. |
| **Optional terminal** | `lib/terminal.ts` — `getOptionalTerminal(request)` | Same validation; returns null if header missing. |
| **Shift start** | `app/api/shifts/start/route.ts` | Validates terminal (body or header); defaults to `pos-1` if not provided; records terminal on shift. |
| **Payment** | `Payment.terminalId` (optional) | Cash/MoMo payment APIs accept optional terminal; stored on `Payment` and in audit. |

### Errors

- **`TerminalNotFoundError`** — 404.
- **`TerminalInactiveError`** — 403.

Both are mapped in `lib/pos-api-errors.ts`.

### Seed

Default terminals are created in `prisma/seed.ts`: e.g. `pos-1` (POS), `kds-1` (KDS), `mgr-1` (manager). Run `npx prisma db seed` after migrations.

---

## C) Audit logging design and functions

### Schema

- **`AuditLog`** table: `id`, `staffId` (optional), `terminalId` (optional), `actionType`, `entityType`, `entityId` (optional), `previousState` (JSON, optional), `newState` (JSON, optional), `createdAt`.
- **Append-only:** No update or delete from application code. No normal API to edit or delete audit rows.

### API

- **`appendAuditLog(params)`** — `lib/audit-log.ts`  
  Writes one row. Parameters: `staffId?`, `terminalId?`, `actionType`, `entityType`, `entityId?`, `previousState?`, `newState?`. Use for all critical actions.

### Action and entity types

- **Action types:** `ORDER_CREATE`, `ORDER_UPDATE`, `ORDER_STATUS`, `ORDER_CANCEL`, `PAYMENT`, `PAYMENT_EXTERNAL`, `TABLE_RELEASE`, `SHIFT_START`, `SHIFT_CLOSE`, `AUTH_LOGIN`, `AUTH_LOGOUT`.
- **Entity types:** `order`, `payment`, `table`, `shift`, `auth`.

### Where audit is used (Phase 4)

| Action | Route / flow | Audit call |
|--------|----------------|------------|
| Login | `POST /api/auth/login` | `AUTH_LOGIN`, entityType `auth`, entityId staffId, newState `{ username }`. |
| Cash payment | `POST /api/orders/[orderId]/pay-cash` | `PAYMENT`, entityType `payment`, entityId orderId, newState `{ method: 'cash', amountUgx }`. |
| Shift start | `POST /api/shifts/start` | `SHIFT_START`, entityType `shift`, entityId shiftId, newState `{ startTime }`. |

Additional wiring (order create/edit, status transitions, cancellations, table release, shift close, external payment) should call `appendAuditLog` in the same way; use `staffId`/`terminalId` from authenticated context and from request where available. For **external callbacks** (e.g. webhooks), use `staffId: null`, `terminalId: null` or a sentinel like `"system"`, and `actionType: PAYMENT_EXTERNAL` so the source is clear.

---

## D) Error logging mechanism

### Component

- **`logError(error, context?)`** — `lib/error-logger.ts`  
  Logs a JSON payload with `message`, optional `staffId`, `terminalId`, `path`, `method`. In development, stack trace is included. Do not expose stack or internal details to API responses.

### Usage

- In API route `catch` blocks or in a central error handler, call `logError(e, { staffId, terminalId, path: request.nextUrl?.pathname, method: request.method })` before returning `toPosApiResponse(error)`.
- Use for unexpected exceptions; distinguish operational errors (handled by `toPosApiResponse`) from system failures (log and return generic 500 message to client).

### Future

- Can be extended to send logs to an external system (e.g. logging service) without changing call sites.

---

## E) Database schema changes

- **`StaffRole`:** Added **`waiter`**.
- **`TerminalType` enum:** POS, KDS, manager, mobile.
- **`Terminal` model:** id, code (unique), name, type, location (optional), isActive, createdAt, updatedAt.
- **`AuditLog` model:** id, staffId (optional), terminalId (optional), actionType, entityType, entityId (optional), previousState (Json), newState (Json), createdAt. Indexes on staffId, terminalId, actionType, entityType, entityId, createdAt.
- **`Payment`:** Added optional **`terminalId`** (VarChar 32).

Apply Phase 4 schema and seed:

**Option A — Migrations (recommended when your migration history applies cleanly):**

```bash
npx prisma migrate dev --name phase4_auth_terminal_audit
npx prisma db seed
```

**Option B — If `migrate dev` fails with P3006/P1014 (e.g. “The underlying table for model Payment does not exist” in the shadow database):**  
Your migrations are incremental and assume base tables already exist, so the shadow DB has nothing to apply the first migration to. You can either:

1. **Apply only pending migrations to your existing DB** (no shadow DB):

   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```

   This applies any unapplied migrations (including `20260212100000_phase4_terminal_audit`) to your current database.

2. **Or push the current schema without migration history:**

   ```bash
   npx prisma db push
   npx prisma db seed
   ```

The seed is resilient: if the `Terminal` table does not exist yet, it logs a warning and continues (staff and tables still seed). After applying the Phase 4 migration or `db push`, run seed again to create default terminals.

Ensure `POS_JWT_SECRET` is set (e.g. in `.env`) with at least 16 characters.

---

## F) New security-related errors

| Error | Module | HTTP | When |
|-------|--------|------|------|
| `UnauthorizedError` | `lib/pos-auth.ts` | 401 | Missing or invalid Authorization header. |
| `InvalidTokenError` | `lib/pos-auth.ts` | 401 | Token invalid or expired. |
| `TerminalNotFoundError` | `lib/terminal.ts` | 404 | Terminal code not in DB. |
| `TerminalInactiveError` | `lib/terminal.ts` | 403 | Terminal exists but is inactive. |

All are mapped in `lib/pos-api-errors.ts`. Clients receive a safe, generic message; do not expose internal details.

---

## G) Testing recommendations

### Authentication

- **Login:** Valid credentials return 200 and `token`, `staffId`, `role`, `fullName`. Invalid credentials return 401. No token in response for invalid login.
- **GET /api/auth/me:** With valid `Authorization: Bearer <token>` returns current staff. Without token or with invalid/expired token returns 401.
- **Protected routes:** Call a protected endpoint (e.g. pay-cash, shifts/start) without token → 401. With valid token → success (subject to business rules). With token that has wrong or tampered payload → 401.

### Terminal

- **Shift start:** With valid terminal code (e.g. `pos-1`) in body or `x-terminal-id` → shift created and audit has terminalId. With unknown code → 404. With inactive terminal → 403. Without terminal (and default `pos-1` seeded) → success using default.
- **Payment:** Optional `x-terminal-id`; when provided and valid, payment and audit record terminalId.

### Audit

- **Append-only:** No API or service should update/delete `AuditLog` rows.
- **Coverage:** After login, pay-cash, shift start, verify corresponding rows in `AuditLog` with correct actionType, entityType, staffId, terminalId (when applicable), and timestamp.
- **External payment:** When a webhook or external callback records a payment, audit entry has actionType `PAYMENT_EXTERNAL` and staffId/terminalId null or "system".

### Error logging

- Trigger an unexpected error in a route (e.g. throw in a branch); confirm `logError` is invoked with context and that the client receives a generic 500 message without stack or internal details.

### Phase 2 and Phase 3

- **Payment integrity:** Phase 2 rules unchanged: no payment for served/cancelled, no duplicate payments, table release only when all orders on table are terminal. All payment flows use **authenticated** staffId (and optional terminalId).
- **Workflow and table lifecycle:** Phase 3 rules (waiter assignment, who can mark served, table release) use the **authenticated** staff identity; no bypass via x-staff-id or body staffId.

### Routes still to migrate to getAuthenticatedStaff

The following routes still use `x-staff-id` or body `staffId` and should be updated to use `getAuthenticatedStaff(request)` and, where relevant, `getOptionalTerminal(request)` and audit:

- `app/api/orders/[orderId]/pay-momo/route.ts`
- `app/api/orders/[orderId]/submit/route.ts`
- `app/api/orders/takeaway/route.ts`
- `app/api/orders/[orderId]/pay/route.ts`
- `app/api/kitchen/orders/[orderId]/status/route.ts`
- `app/api/shifts/active/route.ts`
- `app/api/kitchen/shifts/route.ts`
- `app/api/admin/*` (products, tables, upload, analytics, payments, shifts)
- `app/api/staff/route.ts`, `app/api/staff/[staffId]/route.ts`, `app/api/staff/[staffId]/toggle-active/route.ts`
- Manager/order cancellation and shift-close routes (if they read staffId from header/body)

Use the same pattern: `const { staffId } = await getAuthenticatedStaff(request)` and return `toPosApiResponse(error)` in catch. Add audit and optional terminal where specified in Phase 4 objectives.

---

## Secure external callback context

External payment callbacks (e.g. Pesapal webhook):

- **Identify the order** via a secure reference (e.g. orderId or externalReference in payload), not via client-supplied headers.
- **Bypass staff authentication** for the webhook route only; do **not** call `getAuthenticatedStaff` for the callback.
- **Validate cryptographically** (e.g. signature/HMAC) before processing; reject invalid payloads.
- **Record source:** When writing audit for the payment, use `staffId: null` (or "system"), `terminalId: null`, and `actionType: PAYMENT_EXTERNAL` so the log clearly indicates an external/system source.

This keeps payment integrity (Phase 2) and audit traceability while allowing callbacks to operate without a staff session.
