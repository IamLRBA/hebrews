# Phase 2 — Payment Integrity and Table Safety

## A) Updated payment functions and validations

### 1. Cash: `payOrderCash()` (lib/domain/orders.ts)

- **Parameters:** `orderId`, `amountReceivedUgx`, `staffId`.
- **Validations:**
  - `amountReceivedUgx > 0` → else `PaymentZeroAmountError`.
  - Load order total (from items or `totalUgx`); `amountReceivedUgx >= totalUgx` → else `PaymentInsufficientError`.
  - `changeUgx = amountReceivedUgx - totalUgx`; must be `>= 0` (re-check).
- **Behaviour:** Single full payment only. Calls `finalizePayment(tx, { orderId, amountUgx: totalUgx, method: 'cash', staffId, changeUgx })`. Payment record stores `amountUgx` = order total and `changeUgx` = change given. Then releases table if dine-in.

### 2. MoMo: `payOrderMomo()`

- Rejects `amountUgx <= 0` with `PaymentZeroAmountError`.
- Duplicate and status checks delegated to `finalizePayment`. No `changeUgx`.

### 3. Canonical: `finalizePayment()` (internal)

- **Idempotency (external):** If `externalReference` is provided and a payment with that reference already exists, returns immediately (no duplicate, no status change).
- **Order checks:** Order must exist; shift must not be closed. Throws `PaymentOrderCancelledError` if `status === 'cancelled'`, `DuplicatePaymentError` if `status === 'served'`.
- **Duplicate payment check:** Sum of completed payments for the order must be `< totalUgx`; else `DuplicatePaymentError('order already fully paid')`.
- **Payable status:** Status must be in `['pending','preparing','ready','awaiting_payment']`; else `DuplicatePaymentError`.
- **Amount:** `amountUgx >= totalUgx` → else `PaymentInsufficientError`.
- **Write:** Creates `Payment` with `amountUgx`, optional `changeUgx`, `method`, `status: 'completed'`, `externalReference` (if any), `createdByStaffId`; then sets order `status = 'served'`. Table release is done by caller after transaction.

### 4. External: `recordExternalPayment()`

- Rejects `amountUgx <= 0` with `PaymentZeroAmountError`.
- Loads order; requires `amountUgx === totalUgx` (exact match) → else `ExternalPaymentAmountMismatchError`.
- Calls `finalizePayment` (which enforces served/cancelled/duplicate and idempotency by `externalReference`). Then releases table.

### 5. Session: `createPesapalPaymentSession()`

- Rejects if order `status === 'cancelled'` → `PaymentOrderCancelledError`.
- Rejects if `status === 'served'` → `DuplicatePaymentError('order already served')`.
- Rejects if sum of completed payments for order `>= totalUgx` → `DuplicatePaymentError('order already fully paid')`.
- Otherwise creates session as before (no DB payment record until webhook).

### 6. Table lifecycle (unchanged; confirmed safe)

- `releaseTableForOrder(orderId)` is only called after a successful transaction that sets the order to `served` (by `finalizePayment`) in `payOrderCash`, `payOrderMomo`, and `recordExternalPayment`.
- It throws if order is not in a terminal state (`served` or `cancelled`). No payment failure or retry path releases the table.

---

## B) List of new errors introduced

| Error | Code | When |
|-------|------|------|
| `DuplicatePaymentError` | `DUPLICATE_PAYMENT` | Order already served, or already fully paid, or status not payable when finalizing. |
| `PaymentOrderCancelledError` | `PAYMENT_ORDER_CANCELLED` | Payment attempted for cancelled order. |
| `PaymentZeroAmountError` | `PAYMENT_ZERO_AMOUNT` | Cash or external payment with amount ≤ 0. |
| `ExternalPaymentAmountMismatchError` | `EXTERNAL_PAYMENT_AMOUNT_MISMATCH` | External payment amount ≠ order total (exact match required). |

Existing: `PaymentInsufficientError`, `OrderHasNoItemsError`, `OrderNotFoundError`, `ShiftAlreadyClosedError`, etc., unchanged.

---

## C) Confirmation: duplicate payments are prevented

- **finalizePayment:** Before creating a payment, it checks (1) order status is not `served` or `cancelled`, (2) sum of completed payments for the order is `< totalUgx`. Otherwise it throws `DuplicatePaymentError`.
- **Idempotency for external:** If `externalReference` is provided and a payment with that reference already exists, `finalizePayment` returns without creating a second payment or updating the order again.
- **createPesapalPaymentSession:** Refuses to create a new session if the order is already served or already fully paid.

---

## D) Confirmation: underpayment is rejected

- **Cash:** `payOrderCash` loads the order total and throws `PaymentInsufficientError(amountReceivedUgx, totalUgx)` if `amountReceivedUgx < totalUgx`. `finalizePayment` is then called with `amountUgx = totalUgx` (and `changeUgx`), so the stored payment amount is always the full total.
- **External:** `recordExternalPayment` requires `amountUgx === totalUgx`; otherwise `ExternalPaymentAmountMismatchError`. So underpayment is rejected.
- **finalizePayment:** Also enforces `amountUgx >= totalUgx` and throws `PaymentInsufficientError` if not.

---

## E) Confirmation: external callbacks are idempotent

- **recordExternalPayment** passes `externalReference` (e.g. Pesapal `transaction_tracking_id`) into `finalizePayment`.
- **finalizePayment** starts with: if `externalReference` is set, look up payment by `externalReference`; if found, return immediately without creating a new payment or updating the order.
- So the same webhook/callback can be applied multiple times; only the first call creates the payment and sets the order to served; subsequent calls are no-ops (idempotent success).

---

## F) Schema changes required

- **Payment table:** Added optional `change_ugx` (Decimal) for cash payments. Migration: `prisma/migrations/20260212000000_add_payment_change_ugx/migration.sql` adds column `change_ugx` to `Payment`.
- **Apply:** Run `npx prisma migrate deploy` (or `prisma migrate dev`) so the new column exists. No other schema changes.

---

## G) Testing recommendations

1. **Cash**
   - Pay with `amountReceivedUgx < total` → expect 400 and `PaymentInsufficientError`.
   - Pay with `amountReceivedUgx === 0` (or negative) → expect 400 and `PaymentZeroAmountError`.
   - Pay with `amountReceivedUgx >= total` → success; payment row has `amountUgx = total`, `changeUgx = amountReceivedUgx - total`.
   - Pay same order again (already served) → expect 409 and `DuplicatePaymentError`.

2. **Duplicate / state**
   - Call pay (cash or external) for order with `status: served` → `DuplicatePaymentError`.
   - Call pay for order with `status: cancelled` → `PaymentOrderCancelledError`.
   - For an order that already has a completed payment covering the full total, attempt another payment → `DuplicatePaymentError`.

3. **External**
   - Webhook with `amount` ≠ order total → `ExternalPaymentAmountMismatchError`.
   - Same webhook (same `externalReference`) sent twice → first call succeeds and sets order to served; second call returns success without creating a second payment (idempotent).
   - Webhook for order already served → `DuplicatePaymentError`.

4. **Pesapal session**
   - Create session for order that is already served or already fully paid → `DuplicatePaymentError` (or `PaymentOrderCancelledError` for cancelled).

5. **Tables**
   - After successful cash/MoMo/external payment (order → served), table is released.
   - After any payment failure (validation or duplicate), order status is unchanged and table is not released.
   - Do not release table on payment retry or webhook retry unless the order actually transitions to served in that attempt (current code only releases after successful finalizePayment path).

6. **Audit**
   - Payment records: `method`, `amountUgx`, `changeUgx` (cash), `externalReference` (when applicable), `createdByStaffId`, `createdAt` are stored; no UI changes required for this phase.
