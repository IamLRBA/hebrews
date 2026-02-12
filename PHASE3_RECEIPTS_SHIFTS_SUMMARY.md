# Phase 3 — Receipts and Shift Closing - Implementation Summary

## Overview
Implemented complete receipt and shift management functionality with proper domain separation and API endpoints.

---

## PART 1: RECEIPT READ MODEL ✅

### Implementation

**File: `lib/domain/orders.ts`**

Created `getOrderReceipt(orderId: string)` function.

**Full Function Code:**

```typescript
export type OrderReceiptItem = {
  name: string
  quantity: number
  unitPriceUgx: number
  totalUgx: number
}

export type OrderReceiptPayment = {
  method: PaymentMethod
  amountUgx: number
}

export type OrderReceipt = {
  orderId: string
  status: string
  createdAt: Date
  servedAt: Date | null
  staffName: string
  tableLabel: string | null
  items: OrderReceiptItem[]
  totalUgx: number
  payments: OrderReceiptPayment[]
}

/**
 * Loads complete order receipt data for display.
 * Includes order items with product names, payments, staff, and table info.
 * Read-only, no side effects.
 */
export async function getOrderReceipt(orderId: string): Promise<OrderReceipt> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      totalUgx: true,
      createdByStaff: {
        select: {
          fullName: true,
        },
      },
      table: {
        select: {
          code: true,
        },
      },
      orderItems: {
        select: {
          quantity: true,
          unitPriceUgx: true,
          lineTotalUgx: true,
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
      payments: {
        select: {
          method: true,
          amountUgx: true,
          status: true,
        },
        where: {
          status: 'completed',
        },
      },
    },
  })

  if (!order) {
    throw new OrderNotFoundError(orderId)
  }

  const items: OrderReceiptItem[] = order.orderItems.map((item) => ({
    name: item.product.name,
    quantity: item.quantity,
    unitPriceUgx: Number(item.unitPriceUgx),
    totalUgx: Number(item.lineTotalUgx),
  }))

  const payments: OrderReceiptPayment[] = order.payments.map((payment) => ({
    method: payment.method,
    amountUgx: Number(payment.amountUgx),
  }))

  return {
    orderId: order.id,
    status: order.status,
    createdAt: order.createdAt,
    servedAt: order.status === 'served' ? order.updatedAt : null,
    staffName: order.createdByStaff.fullName,
    tableLabel: order.table?.code ?? null,
    items,
    totalUgx: Number(order.totalUgx),
    payments,
  }
}
```

**Features:**
- ✅ Loads order with all related data in single query
- ✅ Includes order items with product names
- ✅ Includes completed payments only
- ✅ Returns staff name and table label
- ✅ Computes servedAt from updatedAt when status is served
- ✅ Throws OrderNotFoundError if order doesn't exist
- ✅ Read-only, no side effects

---

## PART 2: RECEIPT API ✅

### Implementation

**File: `app/api/orders/[orderId]/receipt/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getOrderReceipt } from '@/lib/domain/orders'
import { toPosApiResponse } from '@/lib/pos-api-errors'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    const receipt = await getOrderReceipt(orderId)
    return NextResponse.json(receipt)
  } catch (error) {
    return toPosApiResponse(error)
  }
}
```

**Endpoint:** `GET /api/orders/:orderId/receipt`

**Response Example:**
```json
{
  "orderId": "uuid",
  "status": "served",
  "createdAt": "2026-02-12T10:00:00Z",
  "servedAt": "2026-02-12T10:15:00Z",
  "staffName": "John Doe",
  "tableLabel": "T-5",
  "items": [
    {
      "name": "Cappuccino",
      "quantity": 2,
      "unitPriceUgx": 8000,
      "totalUgx": 16000
    }
  ],
  "totalUgx": 16000,
  "payments": [
    {
      "method": "cash",
      "amountUgx": 16000
    }
  ]
}
```

---

## PART 3: SHIFT SUMMARY DOMAIN ✅

### Implementation

**File: `lib/domain/shifts.ts`** (NEW FILE)

```typescript
export type ShiftSummary = {
  shiftId: string
  ordersServed: number
  totalSales: number
  cashSales: number
  mtnMomoSales: number
  airtelSales: number
  cardSales: number
}

/**
 * Computes shift summary: orders served and payments grouped by method.
 * Only served orders and completed payments are counted.
 * Read-only, no side effects.
 */
export async function getShiftSummary(shiftId: string): Promise<ShiftSummary> {
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    select: { id: true },
  })

  if (!shift) {
    throw new ShiftNotFoundError(shiftId)
  }

  // Count served orders
  const ordersServed = await prisma.order.count({
    where: {
      shiftId,
      status: 'served',
    },
  })

  // Sum payments by method (only completed payments)
  const payments = await prisma.payment.findMany({
    where: {
      order: {
        shiftId,
        status: 'served',
      },
      status: 'completed',
    },
    select: {
      method: true,
      amountUgx: true,
    },
  })

  let cashSales = 0
  let mtnMomoSales = 0
  let airtelSales = 0
  let cardSales = 0

  for (const payment of payments) {
    const amount = Number(payment.amountUgx)
    switch (payment.method) {
      case 'cash':
        cashSales += amount
        break
      case 'mtn_momo':
        mtnMomoSales += amount
        break
      case 'airtel_money':
        airtelSales += amount
        break
      case 'card':
        cardSales += amount
        break
    }
  }

  const totalSales = cashSales + mtnMomoSales + airtelSales + cardSales

  return {
    shiftId,
    ordersServed,
    totalSales,
    cashSales,
    mtnMomoSales,
    airtelSales,
    cardSales,
  }
}
```

**Features:**
- ✅ Counts only served orders
- ✅ Sums only completed payments
- ✅ Groups sales by payment method (cash, mtn_momo, airtel_money, card)
- ✅ Computes total sales across all methods
- ✅ Throws ShiftNotFoundError if shift doesn't exist
- ✅ Read-only, no side effects

---

## PART 4: SHIFT SUMMARY API ✅

### Implementation

**File: `app/api/shifts/[shiftId]/summary/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getShiftSummary } from '@/lib/domain/shifts'
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

    const summary = await getShiftSummary(shiftId)
    return NextResponse.json(summary)
  } catch (error) {
    return toPosApiResponse(error)
  }
}
```

**Endpoint:** `GET /api/shifts/:shiftId/summary`

**Response Example:**
```json
{
  "shiftId": "uuid",
  "ordersServed": 45,
  "totalSales": 850000,
  "cashSales": 450000,
  "mtnMomoSales": 250000,
  "airtelSales": 100000,
  "cardSales": 50000
}
```

---

## PART 5: SHIFT CLOSE DOMAIN ✅

### Implementation

**File: `lib/domain/shifts.ts`**

```typescript
export type CloseShiftResult = {
  shiftId: string
  expectedCash: number
  countedCashUgx: number
  variance: number
}

/**
 * Closes a shift: validates not already closed, computes cash variance,
 * updates shift with close metadata.
 * Returns reconciliation summary.
 */
export async function closeShift(params: {
  shiftId: string
  countedCashUgx: number
  closedByStaffId: string
}): Promise<CloseShiftResult> {
  const { shiftId, countedCashUgx, closedByStaffId } = params

  // Get shift summary first
  const summary = await getShiftSummary(shiftId)
  const expectedCash = summary.cashSales
  const variance = countedCashUgx - expectedCash

  // Update shift in transaction
  await prisma.$transaction(async (tx) => {
    const shift = await tx.shift.findUnique({
      where: { id: shiftId },
      select: { id: true, endTime: true },
    })

    if (!shift) {
      throw new ShiftNotFoundError(shiftId)
    }

    if (shift.endTime !== null) {
      throw new ShiftAlreadyClosedError(shiftId)
    }

    await tx.shift.update({
      where: { id: shiftId },
      data: {
        endTime: new Date(),
        closedByStaffId,
        countedCashUgx: new Decimal(countedCashUgx),
        cashVarianceUgx: new Decimal(variance),
      },
    })
  })

  return {
    shiftId,
    expectedCash,
    countedCashUgx,
    variance,
  }
}
```

**Features:**
- ✅ Validates shift exists
- ✅ Validates shift not already closed
- ✅ Calls getShiftSummary to compute expected cash
- ✅ Computes variance (counted - expected)
- ✅ Updates shift with:
  - `endTime` (current timestamp)
  - `closedByStaffId`
  - `countedCashUgx`
  - `cashVarianceUgx`
- ✅ Returns reconciliation summary
- ✅ Atomic transaction

---

## PART 6: SHIFT CLOSE API ✅

### Implementation

**File: `app/api/shifts/[shiftId]/close/route.ts`** (UPDATED)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { closeShift } from '@/lib/domain/shifts'
import { toPosApiResponse } from '@/lib/pos-api-errors'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shiftId: string }> }
) {
  try {
    const { shiftId } = await params
    if (!shiftId) {
      return NextResponse.json({ error: 'shiftId is required' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const { closedByStaffId, countedCashUgx } = body

    if (typeof closedByStaffId !== 'string' || !closedByStaffId) {
      return NextResponse.json({ error: 'closedByStaffId is required (string)' }, { status: 400 })
    }

    if (typeof countedCashUgx !== 'number') {
      return NextResponse.json({ error: 'countedCashUgx is required (number)' }, { status: 400 })
    }

    const result = await closeShift({
      shiftId,
      closedByStaffId,
      countedCashUgx,
    })
    return NextResponse.json(result)
  } catch (error) {
    return toPosApiResponse(error)
  }
}
```

**Endpoint:** `POST /api/shifts/:shiftId/close`

**Request Body:**
```json
{
  "closedByStaffId": "uuid",
  "countedCashUgx": 450000
}
```

**Response Example:**
```json
{
  "shiftId": "uuid",
  "expectedCash": 450000,
  "countedCashUgx": 450000,
  "variance": 0
}
```

**Variance Examples:**
- `countedCashUgx: 450000, expectedCash: 450000` → `variance: 0` (exact match)
- `countedCashUgx: 455000, expectedCash: 450000` → `variance: 5000` (overage)
- `countedCashUgx: 445000, expectedCash: 450000` → `variance: -5000` (shortage)

---

## PRISMA SCHEMA CHANGES

### Shift Model Updates

**File: `prisma/schema.prisma`**

**Added Fields:**

```prisma
model Shift {
  id                String    @id @default(uuid()) @db.Uuid
  staffId           String    @map("staff_id") @db.Uuid
  terminalId        String    @map("terminal_id") @db.VarChar(32)
  startTime         DateTime  @map("start_time")
  endTime           DateTime? @map("end_time")
  totalSales        Decimal   @default(0) @map("total_sales") @db.Decimal(12, 2)
  closedByStaffId   String?   @map("closed_by_staff_id") @db.Uuid        // NEW
  countedCashUgx    Decimal?  @map("counted_cash_ugx") @db.Decimal(12, 2)  // NEW
  cashVarianceUgx   Decimal?  @map("cash_variance_ugx") @db.Decimal(12, 2) // NEW
  createdAt         DateTime  @default(now()) @map("created_at")

  staff         Staff   @relation("ShiftStaff", fields: [staffId], references: [id])
  closedByStaff Staff?  @relation("ShiftClosedBy", fields: [closedByStaffId], references: [id])  // NEW
  orders        Order[]

  @@index([staffId])
  @@index([terminalId])
  @@index([startTime])
}
```

### Staff Model Updates

**Updated Relations:**

```prisma
model Staff {
  id           String    @id @default(uuid()) @db.Uuid
  username     String    @unique @db.VarChar(64)
  passwordHash String   @map("password_hash") @db.VarChar(255)
  fullName     String   @map("full_name") @db.VarChar(255)
  role         StaffRole
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  shifts          Shift[]   @relation("ShiftStaff")      // UPDATED
  shiftsClosed    Shift[]   @relation("ShiftClosedBy")   // NEW
  ordersCreated   Order[]   @relation("CreatedByStaff")
  ordersUpdated   Order[]   @relation("UpdatedByStaff")
  payments        Payment[]

  @@index([role])
  @@index([isActive])
}
```

### Migration SQL

```sql
-- Add new fields to Shift table
ALTER TABLE "Shift" ADD COLUMN "closed_by_staff_id" UUID;
ALTER TABLE "Shift" ADD COLUMN "counted_cash_ugx" DECIMAL(12, 2);
ALTER TABLE "Shift" ADD COLUMN "cash_variance_ugx" DECIMAL(12, 2);

-- Add foreign key constraint
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_closed_by_staff_id_fkey" 
  FOREIGN KEY ("closed_by_staff_id") REFERENCES "Staff"("id");
```

---

## FILES CREATED

1. ✅ `lib/domain/shifts.ts` - New domain module for shift operations
2. ✅ `app/api/orders/[orderId]/receipt/route.ts` - Receipt API endpoint
3. ✅ `app/api/shifts/[shiftId]/summary/route.ts` - Shift summary API endpoint

---

## FILES MODIFIED

1. ✅ `prisma/schema.prisma` - Added shift closing fields
2. ✅ `lib/domain/orders.ts` - Added getOrderReceipt function
3. ✅ `app/api/shifts/[shiftId]/close/route.ts` - Updated to use new domain function
4. ✅ `lib/pos-service.ts` - Updated imports and exports

---

## ARCHITECTURE

### Domain Layer

```
lib/domain/
├── orders.ts
│   ├── createDineInOrder
│   ├── payOrderCash
│   ├── payOrderMomo
│   ├── recordExternalPayment
│   └── getOrderReceipt ← NEW
└── shifts.ts ← NEW FILE
    ├── getShiftSummary
    └── closeShift
```

### API Layer

```
app/api/
├── orders/[orderId]/
│   └── receipt/
│       └── route.ts ← NEW
└── shifts/[shiftId]/
    ├── summary/
    │   └── route.ts ← NEW
    └── close/
        └── route.ts (UPDATED)
```

---

## TESTING CHECKLIST

### Receipt Functionality
- [ ] GET /api/orders/:orderId/receipt returns complete receipt
- [ ] Receipt includes all order items with product names
- [ ] Receipt includes only completed payments
- [ ] Receipt shows staff name and table label
- [ ] Receipt computes servedAt correctly
- [ ] Returns 404 for non-existent order

### Shift Summary
- [ ] GET /api/shifts/:shiftId/summary returns correct totals
- [ ] Only served orders are counted
- [ ] Only completed payments are summed
- [ ] Sales grouped correctly by payment method
- [ ] Total sales = sum of all payment methods
- [ ] Returns 404 for non-existent shift

### Shift Closing
- [ ] POST /api/shifts/:shiftId/close closes shift successfully
- [ ] Computes variance correctly (positive and negative)
- [ ] Sets endTime to current timestamp
- [ ] Records closedByStaffId
- [ ] Records countedCashUgx and cashVarianceUgx
- [ ] Cannot close already-closed shift
- [ ] Returns 404 for non-existent shift

---

## NEXT STEPS

1. **Run Prisma Migration:**
   ```bash
   npx prisma migrate dev --name add_shift_closing_fields
   ```

2. **Verify Schema:**
   ```bash
   npx prisma generate
   ```

3. **Test Endpoints:**
   - Test receipt retrieval for various order states
   - Test shift summary with multiple payment methods
   - Test shift closing with cash variance scenarios

---

## COMPLETION CONFIRMATION

✅ **PART 1 - Receipt Read Model:** COMPLETE
- getOrderReceipt function created
- Returns complete receipt data
- Read-only, no side effects

✅ **PART 2 - Receipt API:** COMPLETE
- GET /api/orders/:orderId/receipt endpoint created
- Proper error handling with toPosApiResponse

✅ **PART 3 - Shift Summary Domain:** COMPLETE
- getShiftSummary function created
- Groups sales by payment method
- Counts served orders only

✅ **PART 4 - Shift Summary API:** COMPLETE
- GET /api/shifts/:shiftId/summary endpoint created
- Returns sales breakdown

✅ **PART 5 - Shift Close Domain:** COMPLETE
- closeShift function created
- Computes cash variance
- Updates shift with close metadata
- Atomic transaction

✅ **PART 6 - Shift Close API:** COMPLETE
- POST /api/shifts/:shiftId/close endpoint updated
- Uses new domain function
- Requires countedCashUgx parameter

✅ **Prisma Schema Changes:** COMPLETE
- Added closedByStaffId, countedCashUgx, cashVarianceUgx to Shift
- Added shiftsClosed relation to Staff
- Migration SQL provided

**Phase 3 — Receipts and Shift Closing is COMPLETE.**
