# Phase 3 — Real Café Workflow UX (Backend)

## A) Backend functions supporting the objectives

### 1) Active orders management

- **`getOrdersByStatus({ status, shiftId? })`** — `lib/cafe-workflow.ts`  
  Returns orders with the given status (pending, preparing, ready, awaiting_payment). Optional `shiftId` to scope to a shift. Sorted by `createdAt` ascending.

- **`getOrdersByAssignedWaiter({ waiterId, shiftId? })`** — `lib/cafe-workflow.ts`  
  Returns active orders assigned to the given waiter. Sorted by status then `createdAt`.

- **`getOrdersByTable({ tableId, shiftId? })`** — `lib/cafe-workflow.ts`  
  Returns active dine-in orders for the given table. Sorted by `createdAt`.

- **`getActiveOrderCounts({ shiftId? })`** — `lib/cafe-workflow.ts`  
  Returns `{ pendingCount, preparingCount, readyCount, awaitingPaymentCount, activeTablesCount }`. Respects active statuses only; active tables = distinct tables with at least one non-terminal dine-in order.

### 2) Waiter workflow

- **`assignWaiterToOrder({ orderId, waiterId, staffId })`** — `lib/domain/orders.ts`  
  Sets or updates `assignedWaiterId` on the order. Allowed only for non-terminal orders (pending, preparing, ready, awaiting_payment). Manager or admin may assign any waiter; the current assigned waiter may reassign (e.g. to themselves). Others get `UnauthorizedWaiterActionError`.

- **`assertCanMarkOrderServed(orderId, staffId)`** — `lib/domain/orders.ts`  
  Asserts that the given staff can mark the order as served. If the order has an assigned waiter, only that waiter or a manager/admin may proceed. Used by checkout and can be used before any “mark served” action.

- **Serving rules (enforced in `finalizePayment` and `checkoutOrder`):**
  - Only the assigned waiter (or manager/admin) may finalize payment or run checkout for that order when `assignedWaiterId` is set.
  - “Prevent accidental serving of unready orders” is already satisfied: order becomes served only via payment finalization (amount ≥ total) or checkout (already fully paid). No standalone “mark served” without payment/checkout.

- **Order creation with waiter:**  
  `createDineInOrder` and `createOrder` accept optional `assignedWaiterId` so a waiter can be assigned at creation.

### 3) Table view accuracy

- **`releaseTableForOrder(orderId)`** — `lib/table-lifecycle.ts` (updated)  
  Table is released only when **all** dine-in orders for that table are in a terminal state (served or cancelled). When one order goes terminal, we count non-terminal orders on the same table; if any remain, we do not set the table to available.

- **`isTableOccupied(tableId)`** — unchanged.  
  True if there is at least one dine-in order on the table with status in (pending, preparing, ready, awaiting_payment). Table status is therefore accurate for “real-time” views that query orders by table and status.

### 4) Order editing safeguards

- **Item edits** — `lib/order-items.ts`  
  `assertOrderEditable` allows edits only when order status is **pending** or **preparing**. Used by `addOrderItem`, `updateOrderItemQuantity`, `removeOrderItem`. Served or cancelled orders throw `OrderImmutableError`.

- **Waiter assignment** — `assignWaiterToOrder` throws `OrderNotEditableError` when order is served or cancelled.

- **Payment/table rules** — Phase 2 rules unchanged: no payment for served/cancelled; no duplicate payments; table release only after terminal state. Removing items after payment is already impossible because item edits are only allowed in pending/preparing.

### 5) Integration with Phase 2 payment and table safety

- **Payment:**  
  `finalizePayment` and `recordExternalPayment` unchanged in Phase 2 rules (amount, idempotency, duplicate/served/cancelled checks). Added: waiter check when `assignedWaiterId` is set; `servedAt` set when order becomes served.

- **Table release:**  
  Phase 2: release only when order is terminal. Phase 3: release only when **all** orders on that table are terminal. No payment failure or retry path releases the table; release happens only after a successful transition to served (or cancelled) and only when the table has no remaining active orders.

### 6) Audit and staff tracking

- **Order:**  
  `updatedByStaffId` is set on status/assignment updates (e.g. `setOrderStatus`, `assignWaiterToOrder`).  
  **`servedAt`** (new) is set when order transitions to served (in `finalizePayment` and `setOrderStatus` when `newStatus === 'served'`).  
  `createdAt` / `updatedAt` give general timestamps; status transitions are reflected in `updatedAt` (and `servedAt` for served).

- **Payment records** (Phase 2): method, amountUgx, changeUgx (cash), externalReference, createdByStaffId, createdAt.

---

## B) New errors introduced

| Error | Code | When |
|-------|------|------|
| `UnauthorizedWaiterActionError` | `UNAUTHORIZED_WAITER_ACTION` | Only assigned waiter or manager/admin may mark order as served (or change assignment); caller is not allowed. |
| `OrderNotEditableError` | `ORDER_NOT_EDITABLE` | Edit (e.g. assign waiter, or conceptually item edit) attempted on a served or cancelled order. |

Existing: `OrderImmutableError` (order-items) for item edits on non–pending/preparing orders. Phase 3 adds `OrderNotEditableError` in domain/orders for waiter assignment on terminal orders; both are wired in `pos-api-errors` (e.g. 409).

---

## C) Confirmation: order assignment, serving, and table release

- **Assignment:**  
  `assignWaiterToOrder` updates `assignedWaiterId` only for non-terminal orders. Manager/admin or current assigned waiter may change assignment.

- **Serving:**  
  Order becomes served only via (1) `finalizePayment` (cash/MoMo/external) or (2) `checkoutOrder`. In both paths, when `assignedWaiterId` is set, only that waiter or manager/admin may perform the action (`finalizePayment` and `assertCanMarkOrderServed` in checkout).

- **Table release:**  
  `releaseTableForOrder(orderId)` is called only after an order has transitioned to served (or cancelled). It then sets the table to available only if there are no remaining dine-in orders on that table in non-terminal status.

---

## D) Integration notes with Phase 2 payment system

- **No bypass of finalized payments:**  
  Phase 2 duplicate and idempotency rules are unchanged. No new code path creates a second payment or marks an order served without going through `finalizePayment` or `checkoutOrder`.

- **Waiter check in payment flow:**  
  Inside `finalizePayment`, when `assignedWaiterId` is set, `staffId` must equal `assignedWaiterId` or staff role must be manager/admin. When `staffId === 'system'` (e.g. Pesapal webhook), the waiter check is skipped so external callbacks can complete without an assigned waiter.

- **Table release logic:**  
  Phase 2: one order terminal → release table. Phase 3: release only when all orders on the table are terminal. This is the only behavioral change for tables; payment and payment-triggered release remain consistent with Phase 2.

---

## E) Testing recommendations

1. **Table release (Phase 3)**  
   - Two active orders on the same table; complete payment for one → order becomes served, table stays occupied.  
   - Complete payment (or cancel) the second → table becomes available.  
   - One order on table, pay → table released.

2. **Waiter assignment**  
   - Assign waiter to pending order as manager → success.  
   - As cashier (non-assigned), try to assign → UnauthorizedWaiterActionError (or success if policy is “any payment role”).  
   - Assign waiter, then as that waiter run checkout/finalize payment → success.  
   - As another cashier (not manager/admin, not assigned waiter), run checkout for that order → UnauthorizedWaiterActionError.

3. **Order editing**  
   - Add/update/remove item on pending or preparing order → success.  
   - Same on ready or awaiting_payment → OrderImmutableError.  
   - Assign waiter to served order → OrderNotEditableError.

4. **Active orders and counts**  
   - `getOrdersByStatus('ready')` returns only ready orders.  
   - `getOrdersByAssignedWaiter(waiterId)` returns only active orders assigned to that waiter.  
   - `getOrdersByTable(tableId)` returns only active dine-in orders for that table.  
   - `getActiveOrderCounts()`: create orders in different statuses and on different tables; assert readyCount, awaitingPaymentCount, activeTablesCount match.

5. **ServedAt and audit**  
   - After payment or checkout, order has `servedAt` set and `updatedByStaffId` (where applicable).  
   - Payment records still include method, amountUgx, changeUgx (cash), externalReference, createdByStaffId, createdAt (Phase 2).

---

## F) Schema changes (optional tracking)

- **Order**
  - **`assignedWaiterId`** (optional, UUID, FK to Staff): assigned waiter for waiter workflow.
  - **`servedAt`** (optional, DateTime): set when order transitions to served (audit/timestamps).

- **Staff**  
  - New relation: `ordersAssigned` (Order[] via `AssignedWaiter`).

- **Migration**  
  - `prisma/migrations/20260212000001_phase3_waiter_served_at/migration.sql`: adds `assigned_waiter_id`, `served_at`, and index on `Order.assigned_waiter_id`.

Apply with `npx prisma migrate deploy` (or `prisma migrate dev`). No UI changes required for Phase 3; backend is ready for café workflow and Phase 2 payment/table safety.
