# Phase 4 — Kitchen Workflow and Role Enforcement - Implementation Summary

## Overview
Implemented kitchen queue read model, kitchen status transitions, API routes, role guard utility, and role enforcement across payment, kitchen, and shift-close operations.

---

## PART 1: KITCHEN QUEUE READ MODEL ✅

**File: `lib/domain/orders.ts`**

```typescript
export type KitchenQueueItem = {
  name: string
  quantity: number
}

export type KitchenQueueOrder = {
  orderId: string
  tableLabel: string | null
  items: KitchenQueueItem[]
  status: string
  createdAt: Date
}

/**
 * Loads kitchen queue: all pending and preparing orders for a shift.
 * Sorted by creation time (oldest first).
 * Read-only, no side effects.
 */
export async function getKitchenQueue(shiftId: string): Promise<KitchenQueueOrder[]> {
  const orders = await prisma.order.findMany({
    where: {
      shiftId,
      status: {
        in: ['pending', 'preparing'],
      },
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
      table: {
        select: {
          code: true,
        },
      },
      orderItems: {
        select: {
          quantity: true,
          product: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          sortOrder: 'asc',
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  return orders.map((order) => ({
    orderId: order.id,
    tableLabel: order.table?.code ?? null,
    items: order.orderItems.map((item) => ({
      name: item.product.name,
      quantity: item.quantity,
    })),
    status: order.status,
    createdAt: order.createdAt,
  }))
}
```

---

## PART 2: KITCHEN STATUS TRANSITIONS ✅

**File: `lib/domain/orders.ts`**

```typescript
export class InvalidKitchenStatusTransitionError extends Error {
  readonly code = 'INVALID_KITCHEN_STATUS_TRANSITION' as const
  constructor(
    public readonly orderId: string,
    public readonly currentStatus: string,
    public readonly attemptedStatus: string
  ) {
    super(
      `Invalid kitchen status transition: ${currentStatus} → ${attemptedStatus} (order: ${orderId})`
    )
    this.name = 'InvalidKitchenStatusTransitionError'
    Object.setPrototypeOf(this, InvalidKitchenStatusTransitionError.prototype)
  }
}

/**
 * Updates kitchen order status.
 * Only allows: pending → preparing, preparing → ready.
 * Cannot skip states or modify served orders.
 * Requires role: kitchen, manager, or admin.
 */
export async function updateKitchenStatus(params: {
  orderId: string
  newStatus: 'preparing' | 'ready'
  staffId: string
}): Promise<string> {
  const { orderId, newStatus, staffId } = params

  await assertStaffRole(staffId, [...KITCHEN_ROLES])

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true },
  })

  if (!order) {
    throw new OrderNotFoundError(orderId)
  }

  // Validate transition
  const currentStatus = order.status
  const validTransitions: Record<string, string[]> = {
    pending: ['preparing'],
    preparing: ['ready'],
  }

  const allowedNext = validTransitions[currentStatus] || []
  if (!allowedNext.includes(newStatus)) {
    throw new InvalidKitchenStatusTransitionError(orderId, currentStatus, newStatus)
  }

  // Update status
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: newStatus,
      updatedByStaffId: staffId,
    },
  })

  return orderId
}
```

---

## PART 3: KITCHEN API ROUTES ✅

**File: `app/api/kitchen/[shiftId]/queue/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getKitchenQueue } from '@/lib/domain/orders'
import { toPosApiResponse } from '@/lib/pos-api-errors'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shiftId: string }> }
) {
  try {
    const { shiftId } = await params
    if (!shiftId) {
      return NextResponse.json({ error: 'shiftId is required' }, { status: 400 })
    }

    const queue = await getKitchenQueue(shiftId)
    return NextResponse.json(queue)
  } catch (error) {
    return toPosApiResponse(error)
  }
}
```

**File: `app/api/kitchen/orders/[orderId]/status/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { updateKitchenStatus } from '@/lib/domain/orders'
import { toPosApiResponse } from '@/lib/pos-api-errors'

const VALID_STATUSES = ['preparing', 'ready'] as const

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    const body = await request.json()
    const { newStatus, staffId } = body

    if (!VALID_STATUSES.includes(newStatus)) {
      return NextResponse.json(
        { error: 'newStatus must be one of: preparing, ready' },
        { status: 400 }
      )
    }

    if (typeof staffId !== 'string' || !staffId) {
      return NextResponse.json({ error: 'staffId is required (string)' }, { status: 400 })
    }

    const updatedOrderId = await updateKitchenStatus({ orderId, newStatus, staffId })
    return NextResponse.json({ orderId: updatedOrderId })
  } catch (error) {
    return toPosApiResponse(error)
  }
}
```

---

## PART 4: ROLE GUARD UTILITY ✅

**File: `lib/domain/role-guard.ts`**

```typescript
import { prisma } from '@/lib/db'
import type { StaffRole } from '@prisma/client'

export class StaffNotFoundError extends Error {
  readonly code = 'STAFF_NOT_FOUND' as const
  constructor(public readonly staffId: string) {
    super(`Staff not found: ${staffId}`)
    this.name = 'StaffNotFoundError'
    Object.setPrototypeOf(this, StaffNotFoundError.prototype)
  }
}

export class UnauthorizedRoleError extends Error {
  readonly code = 'UNAUTHORIZED_ROLE' as const
  constructor(
    public readonly staffId: string,
    public readonly staffRole: StaffRole,
    public readonly requiredRoles: StaffRole[]
  ) {
    super(
      `Staff ${staffId} with role ${staffRole} is not authorized. Required: ${requiredRoles.join(', ')}`
    )
    this.name = 'UnauthorizedRoleError'
    Object.setPrototypeOf(this, UnauthorizedRoleError.prototype)
  }
}

/**
 * Asserts that the staff member has one of the allowed roles.
 * Loads staff by ID, checks role is in allowedRoles.
 * Throws StaffNotFoundError if staff doesn't exist.
 * Throws UnauthorizedRoleError if role not allowed.
 */
export async function assertStaffRole(
  staffId: string,
  allowedRoles: StaffRole[]
): Promise<void> {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { id: true, role: true },
  })

  if (!staff) {
    throw new StaffNotFoundError(staffId)
  }

  if (!allowedRoles.includes(staff.role)) {
    throw new UnauthorizedRoleError(staffId, staff.role, allowedRoles)
  }
}
```

---

## PART 5: ROLE ENFORCEMENT ✅

### payOrderCash (cashier, manager, admin)

```typescript
export async function payOrderCash(params: {
  orderId: string
  amountUgx: number
  staffId: string
}): Promise<string> {
  const { orderId, amountUgx, staffId } = params

  await assertStaffRole(staffId, [...PAYMENT_ROLES])

  await prisma.$transaction(async (tx) => {
    await finalizePayment(tx, { orderId, amountUgx, method: 'cash', staffId })
  })
  // ...
}
```

### payOrderMomo (cashier, manager, admin)

```typescript
export async function payOrderMomo(params: {
  orderId: string
  amountUgx: number
  staffId: string
}): Promise<string> {
  const { orderId, amountUgx, staffId } = params

  await assertStaffRole(staffId, [...PAYMENT_ROLES])

  await prisma.$transaction(async (tx) => {
    await finalizePayment(tx, { orderId, amountUgx, method: 'mtn_momo', staffId })
  })
  // ...
}
```

### recordExternalPayment (cashier, manager, admin — skip for webhook)

```typescript
export async function recordExternalPayment(params: {
  orderId: string
  amountUgx: number
  method: ExternalPaymentMethod
  staffId: string
  externalReference: string
}): Promise<string> {
  const { orderId, amountUgx, method, staffId, externalReference } = params

  // Role check: skip for 'system' (webhook - already authenticated via HMAC)
  if (staffId !== 'system') {
    await assertStaffRole(staffId, [...PAYMENT_ROLES])
  }
  // ...
}
```

### updateKitchenStatus (kitchen, manager, admin)

```typescript
export async function updateKitchenStatus(params: {
  orderId: string
  newStatus: 'preparing' | 'ready'
  staffId: string
}): Promise<string> {
  const { orderId, newStatus, staffId } = params

  await assertStaffRole(staffId, [...KITCHEN_ROLES])
  // ...
}
```

### closeShift (manager, admin)

**File: `lib/domain/shifts.ts`**

```typescript
const CLOSE_SHIFT_ROLES = ['manager', 'admin'] as const

export async function closeShift(params: {
  shiftId: string
  countedCashUgx: number
  closedByStaffId: string
}): Promise<CloseShiftResult> {
  const { shiftId, countedCashUgx, closedByStaffId } = params

  await assertStaffRole(closedByStaffId, [...CLOSE_SHIFT_ROLES])
  // ...
}
```

---

## PRISMA SCHEMA CHANGES ✅

**File: `prisma/schema.prisma`**

Added `manager` to StaffRole enum:

```prisma
enum StaffRole {
  admin
  manager
  cashier
  kitchen
}
```

**Migration required:**
```bash
npx prisma migrate dev --name add_manager_role
```

For PostgreSQL, the migration will add the new enum value to the StaffRole type.

---

## FILES CREATED

1. `lib/domain/role-guard.ts` — Role assertion utility
2. `app/api/kitchen/[shiftId]/queue/route.ts` — Kitchen queue GET endpoint
3. `app/api/kitchen/orders/[orderId]/status/route.ts` — Kitchen status POST endpoint

---

## FILES MODIFIED

1. `prisma/schema.prisma` — Added manager to StaffRole enum
2. `lib/domain/orders.ts` — getKitchenQueue, updateKitchenStatus, role checks
3. `lib/domain/shifts.ts` — Role check in closeShift
4. `lib/pos-api-errors.ts` — UnauthorizedRoleError (403), InvalidKitchenStatusTransitionError (409), RoleGuard StaffNotFoundError (404)

---

## API ENDPOINTS

| Method | Endpoint | Role Required |
|--------|----------|---------------|
| GET | /api/kitchen/:shiftId/queue | None (read-only) |
| POST | /api/kitchen/orders/:orderId/status | kitchen, manager, admin |
| POST | /api/orders/:orderId/pay-cash | cashier, manager, admin |
| POST | /api/orders/:orderId/pay-momo | cashier, manager, admin |
| POST | /api/shifts/:shiftId/close | manager, admin |

---

## COMPLETION CONFIRMATION

✅ PART 1 - Kitchen Queue Read Model: COMPLETE
✅ PART 2 - Kitchen Status Transitions: COMPLETE
✅ PART 3 - Kitchen API Routes: COMPLETE
✅ PART 4 - Role Guard Utility: COMPLETE
✅ PART 5 - Role Enforcement: COMPLETE
✅ Prisma Schema: manager role added

**Phase 4 — Kitchen Workflow and Role Enforcement is COMPLETE.**
