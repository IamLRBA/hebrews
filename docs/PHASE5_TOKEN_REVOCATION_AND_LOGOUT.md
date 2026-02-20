# Phase 5 — Token Revocation & Logout Tracking

Addresses the critical gap that **JWT alone cannot revoke sessions immediately**. When staff leave, a device is stolen, a token leaks, or an account is disabled, tokens remain valid until expiry unless the server can invalidate them.

---

## Token versioning (Option A)

### Design

- **`Staff.tokenVersion`** (integer, default 0) is stored in the database.
- Every JWT payload includes **`v`** (tokenVersion at issue time).
- On each authenticated request, the server decodes the JWT and loads the staff row; if **`staff.tokenVersion > token.v`**, the token is rejected (revoked).
- **Increment** `Staff.tokenVersion` when:
  - Password is changed (self or admin).
  - Account is deactivated (toggle active → false).
  - “Logout all devices” is requested.

### Implementation

| Piece | Location | Behavior |
|-------|----------|----------|
| Schema | `Staff.tokenVersion` | Int, default 0. |
| JWT creation | `lib/pos-auth.ts` — `createStaffToken({ staffId, role, tokenVersion })` | Payload includes `v: tokenVersion`. |
| JWT verification | `lib/pos-auth.ts` — `verifyStaffToken(token)` | After signature/expiry check, loads staff; rejects if `!staff.isActive` or `staff.tokenVersion > decoded.v`. |
| Revoke helper | `lib/pos-auth.ts` — `incrementTokenVersion(staffId)` | `tokenVersion` += 1 for that staff. |
| Login | `app/api/auth/login/route.ts` | Selects `tokenVersion`, passes to `createStaffToken`. |
| Password change | `app/api/staff/[staffId]/route.ts` (PUT) | After update, if password changed or `isActive === false`, calls `incrementTokenVersion(targetStaffId)`. |
| Toggle active | `app/api/staff/[staffId]/toggle-active/route.ts` | When setting `isActive` to false, calls `incrementTokenVersion(targetStaffId)`. |
| Logout all | `POST /api/auth/logout-all` | Authenticated; calls `incrementTokenVersion(staffId)`, then records audit. |

### Migration

- `prisma/migrations/20260212110000_phase5_token_version/migration.sql`:  
  `ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "token_version" INTEGER NOT NULL DEFAULT 0;`  
  Apply with `npx prisma migrate deploy` or `npx prisma db push`.

---

## Logout tracking (audit)

### Explicit logout

- **`POST /api/auth/logout`**  
  Requires valid JWT. Records **AUTH_LOGOUT** in the audit log (staffId, optional terminalId, `newState: { event: 'logout' }`). Does **not** increment tokenVersion; token remains valid until expiry. Client should clear the token and redirect to login.

- **Client**  
  `lib/pos-client.ts` — **`logout()`**: calls `POST /api/auth/logout` (with Bearer token via `posFetch`), then `clearStaffSession()`. Used by AdminSidebar, ManagerSidebar, and SettingsDropdown so every UI logout is recorded.

### Logout all devices

- **`POST /api/auth/logout-all`**  
  Requires valid JWT. Increments `Staff.tokenVersion` (invalidating all existing tokens), then records **AUTH_LOGOUT** with `newState: { event: 'logout_all' }`. Client should then clear local token and redirect.

Use for:
- “Log out everywhere” in settings.
- Security response (e.g. suspected token leak).

---

## Audit log usage

- **AUTH_LOGOUT** is used for:
  - Single-session logout: `event: 'logout'`.
  - Logout all devices: `event: 'logout_all'`.
- Supports shift audits, device misuse investigations, and security monitoring.

---

## Summary

| Scenario | Action | Effect |
|----------|--------|--------|
| Staff leaves / device stolen / token leak | Admin deactivates account or staff uses “logout all” | `tokenVersion` incremented → all tokens rejected. |
| Manager disables account | Toggle active → false | `tokenVersion` incremented. |
| Password change | Admin or self updates password | `tokenVersion` incremented. |
| Normal logout (UI) | User clicks Logout | AUTH_LOGOUT recorded; token still valid until expiry; client clears it. |

No session table is required; one integer column and verification on each request provide immediate revocation where needed.
