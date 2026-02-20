# POS System - Complete Architectural Analysis
**Date:** February 12, 2026  
**System:** Cafe Havilah & Pizzeria POS  
**Framework:** Next.js 15.5.0 (App Router) + Prisma + PostgreSQL

---

## PHASE 1 — PROJECT STRUCTURE

### Repository Layout

```
Hebrews/
├── app/                          # Next.js App Router
│   ├── (pos)/                    # POS Application Routes
│   │   ├── admin/                # Admin Panel
│   │   │   ├── dashboard/        # Admin dashboard (KPIs, charts)
│   │   │   ├── products/         # Product management (CRUD)
│   │   │   ├── orders/           # Order viewing & details
│   │   │   ├── payments/         # Payment history
│   │   │   ├── shifts/           # Shift management
│   │   │   ├── staff/            # Staff management (CRUD)
│   │   │   ├── tables/           # Table management (CRUD)
│   │   │   └── settings/         # System settings
│   │   ├── manager/              # Manager Panel
│   │   │   ├── dashboard/        # Manager dashboard (orders requiring attention)
│   │   │   ├── orders/          # Order management
│   │   │   ├── payments/        # Payment overview
│   │   │   └── shifts/          # Shift management & closing
│   │   ├── kitchen/              # Kitchen Display System
│   │   │   ├── [shiftId]/       # Kitchen queue for specific shift
│   │   │   └── page.tsx          # Kitchen login/start
│   │   └── pos/                  # Cashier POS Interface
│   │       ├── start/           # Shift start screen
│   │       ├── orders/          # Order creation & management
│   │       ├── orders/[orderId]/ # Order detail & editing
│   │       ├── payment/         # Payment processing
│   │       ├── receipt/         # Receipt display
│   │       └── ready/           # Ready orders queue
│   └── api/                      # API Routes (Server Actions)
│       ├── admin/               # Admin-only endpoints
│       │   ├── products/        # Product CRUD
│       │   ├── staff/           # Staff CRUD
│       │   ├── tables/          # Table CRUD
│       │   └── upload/          # Image uploads (product, table)
│       ├── orders/              # Order operations
│       │   ├── dine-in/         # Create dine-in order
│       │   ├── takeaway/        # Create takeaway order
│       │   └── [orderId]/       # Order-specific ops
│       │       ├── items/       # Add item to order
│       │       ├── submit/      # Submit to kitchen
│       │       ├── status/      # Update status
│       │       ├── cancel/      # Cancel order
│       │       ├── checkout/    # Finalize order
│       │       ├── pay-cash/    # Cash payment
│       │       ├── pay-momo/    # Mobile money payment
│       │       ├── pay-pesapal/  # External payment session
│       │       ├── payments/    # Record payment (generic)
│       │       └── receipt/     # Get receipt data
│       ├── payments/            # Payment endpoints
│       │   └── pesapal/         # Pesapal integration
│       │       └── webhook/     # Payment webhook handler
│       ├── shifts/              # Shift management
│       │   ├── start/          # Start shift
│       │   ├── active/         # Get active shift
│       │   └── [shiftId]/      # Shift operations
│       │       ├── close/      # Close shift
│       │       ├── summary/    # Get shift summary
│       │       └── orders/     # Get shift orders
│       ├── kitchen/            # Kitchen endpoints
│       │   ├── [shiftId]/queue/ # Get kitchen queue
│       │   └── orders/[orderId]/status/ # Update kitchen status
│       ├── pos/                # POS-specific endpoints
│       │   └── products/       # Product catalog (active only)
│       └── products/           # Public product endpoints
│
├── components/                  # React Components
│   ├── admin/                  # Admin components
│   │   ├── AdminNavHeader.tsx  # Admin navigation
│   │   ├── AdminSidebar.tsx    # Admin sidebar menu
│   │   ├── ProductModal.tsx    # Product add/edit modal
│   │   ├── StaffModal.tsx      # Staff add/edit modal
│   │   ├── TableModal.tsx      # Table add/edit modal
│   │   └── [various modals]    # Other admin modals
│   ├── manager/                # Manager components
│   │   ├── ManagerNavHeader.tsx
│   │   └── ManagerSidebar.tsx
│   ├── kitchen/                # Kitchen components
│   │   └── KitchenNavHeader.tsx
│   ├── pos/                    # POS components
│   │   ├── PosNavHeader.tsx    # Cashier navigation
│   │   └── [various]           # POS-specific UI
│   └── ui/                     # Shared UI components
│       ├── ConfirmDialog.tsx   # Confirmation dialogs
│       ├── QuantityStepper.tsx # Number input stepper
│       └── StatusBadge.tsx     # Status indicators
│
├── lib/                        # Business Logic & Utilities
│   ├── db.ts                   # Prisma client singleton
│   ├── pos-client.ts           # Client-side API wrapper (adds x-staff-id header)
│   ├── pos-shift-store.ts      # Shift ID localStorage management
│   ├── config.ts               # Centralized config (Pesapal, app URLs)
│   ├── pos-api-errors.ts       # Error mapping utilities
│   ├── utils/                  # Formatting utilities
│   │   └── format.ts           # Currency, date formatting
│   ├── domain/                 # Domain Logic (Business Rules)
│   │   ├── orders.ts           # Order domain (payment finalization, kitchen queue)
│   │   ├── shifts.ts           # Shift domain (summary, closing)
│   │   └── role-guard.ts       # Role-based access control
│   ├── order-create.ts         # Order creation utilities
│   ├── order-items.ts          # Order item CRUD (transactional)
│   ├── order-status.ts         # Order status transitions
│   ├── payments.ts             # Payment recording utilities
│   ├── checkout.ts             # Order checkout orchestration
│   ├── table-lifecycle.ts      # Table occupancy management
│   ├── shift-lifecycle.ts      # Shift start/end utilities
│   ├── staff-session.ts        # Staff validation & active shift lookup
│   ├── pos-service.ts          # POS Application Service (orchestration layer)
│   └── read-models.ts          # Read-only query utilities
│
├── prisma/                     # Database Schema & Migrations
│   ├── schema.prisma           # Prisma schema definition
│   └── seed.ts                 # Database seeding script
│
├── public/                     # Static Assets
│   └── pos-images/            # Product & table images
│       ├── products/          # Product images
│       ├── tables/            # Table images
│       └── placeholder.svg   # Fallback image
│
└── styles/                     # Global Styles
    ├── globals.css            # Tailwind + custom CSS (button themes, POS overrides)
    └── variables.css          # CSS custom properties (colors, spacing)

```

### Key Architectural Patterns

1. **Layered Architecture:**
   - **Presentation Layer:** `app/(pos)/` - React pages/components
   - **API Layer:** `app/api/` - Next.js API routes
   - **Application Service Layer:** `lib/pos-service.ts` - Orchestration
   - **Domain Layer:** `lib/domain/` - Business logic
   - **Data Access Layer:** Prisma ORM

2. **Separation of Concerns:**
   - **Write Operations:** Domain utilities (`lib/order-items.ts`, `lib/payments.ts`, etc.)
   - **Read Operations:** Read models (`lib/read-models.ts`)
   - **Orchestration:** Application service (`lib/pos-service.ts`)

3. **Client-Server Communication:**
   - Client uses `posFetch()` wrapper (adds `x-staff-id` header)
   - Server validates staff session via `x-staff-id` header
   - Role-based authorization via `assertStaffRole()`

---

## PHASE 2 — DATABASE & DOMAIN MODEL

### Core Entities (Prisma Schema)

#### 1. **Staff**
```prisma
model Staff {
  id           String   @id @default(uuid())
  username     String   @unique
  passwordHash String
  fullName     String
  role         StaffRole  // 'admin' | 'manager' | 'cashier' | 'kitchen'
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  shifts       Shift[]
  createdOrders Order[] @relation("CreatedByStaff")
  updatedOrders Order[] @relation("UpdatedByStaff")
  payments     Payment[]
}
```
**Indexes:** `username` (unique)  
**Relationships:** One-to-many with Shifts, Orders, Payments  
**Lifecycle Role:** Authentication, authorization, audit trail

#### 2. **Shift**
```prisma
model Shift {
  id              String    @id @default(uuid())
  staffId         String
  terminalId      String
  startTime       DateTime  @default(now())
  endTime         DateTime?
  closedByStaffId String?
  countedCashUgx  Decimal?
  cashVarianceUgx Decimal?
  
  staff           Staff     @relation(fields: [staffId], references: [id])
  orders          Order[]
}
```
**Indexes:** `staffId`, `endTime` (for active shift lookup)  
**Relationships:** Many-to-one with Staff, One-to-many with Orders  
**Lifecycle Role:** Groups orders, tracks cash reconciliation, prevents operations after close

#### 3. **Order**
```prisma
model Order {
  id                String      @id @default(uuid())
  orderNumber       String
  orderType         OrderType   // 'dine_in' | 'takeaway'
  tableId           String?
  shiftId           String
  status            OrderStatus // 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled'
  subtotalUgx       Decimal     @default(0)
  taxUgx            Decimal     @default(0)
  totalUgx          Decimal     @default(0)
  createdByStaffId  String
  updatedByStaffId  String?
  terminalId        String
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  
  shift             Shift       @relation(fields: [shiftId], references: [id])
  table             RestaurantTable? @relation(fields: [tableId], references: [id])
  createdByStaff    Staff       @relation("CreatedByStaff", fields: [createdByStaffId], references: [id])
  updatedByStaff     Staff?      @relation("UpdatedByStaff", fields: [updatedByStaffId], references: [id])
  orderItems         OrderItem[]
  payments           Payment[]
}
```
**Indexes:** `shiftId`, `status`, `tableId`, `orderNumber`  
**Relationships:** Many-to-one with Shift, Table, Staff; One-to-many with OrderItems, Payments  
**Lifecycle Role:** Central entity; tracks order state machine, totals, payment status

#### 4. **OrderItem**
```prisma
model OrderItem {
  id            String   @id @default(uuid())
  orderId       String
  productId     String
  quantity      Int
  unitPriceUgx  Decimal
  lineTotalUgx  Decimal
  size          String?
  modifier      String?
  notes         String?
  sortOrder     Int      @default(0)
  
  order         Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product       Product  @relation(fields: [productId], references: [id])
}
```
**Indexes:** `orderId`, `productId`  
**Relationships:** Many-to-one with Order, Product  
**Lifecycle Role:** Line items; immutable after order served/cancelled; drives order totals

#### 5. **Payment**
```prisma
model Payment {
  id                String        @id @default(uuid())
  orderId           String
  amountUgx          Decimal
  method            PaymentMethod // 'cash' | 'card' | 'mtn_momo' | 'airtel_money'
  status            PaymentStatus // 'pending' | 'completed' | 'failed'
  externalReference String?       @unique
  createdByStaffId  String
  createdAt         DateTime      @default(now())
  
  order             Order         @relation(fields: [orderId], references: [id])
  staff             Staff         @relation(fields: [createdByStaffId], references: [id])
}
```
**Indexes:** `orderId`, `externalReference` (unique for idempotency)  
**Relationships:** Many-to-one with Order, Staff  
**Lifecycle Role:** Payment records; append-only; idempotent via externalReference

#### 6. **Product**
```prisma
model Product {
  id              String    @id @default(uuid())
  name            String
  category        String    // 'Food' | 'Drinks'
  section         String
  sku             String?   @unique
  priceUgx        Decimal
  sizes           String[]
  colors          String[]
  images          String[]
  stockQty        Int       @default(0)
  isActive        Boolean   @default(true)
  isHappyHour     Boolean   @default(false)
  
  orderItems      OrderItem[]
}
```
**Indexes:** `category`, `section`, `sku`, `isActive`  
**Relationships:** One-to-many with OrderItems  
**Lifecycle Role:** Product catalog; only active products appear in POS

#### 7. **RestaurantTable**
```prisma
model RestaurantTable {
  id       String   @id @default(uuid())
  code     String   @unique
  capacity Int?
  status   TableStatus // 'available' | 'occupied'
  images   String[]
  isActive Boolean  @default(true)
  
  orders   Order[]
}
```
**Indexes:** `code` (unique), `status`  
**Relationships:** One-to-many with Orders  
**Lifecycle Role:** Table management; occupancy tracked via order status

### Order State Machine

**Statuses:** `pending` → `preparing` → `ready` → `served` | `cancelled`

**Allowed Transitions** (from `lib/order-status.ts`):
```typescript
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['served'],
  served: [],      // Terminal
  cancelled: [],    // Terminal
}
```

**Transition Rules:**
- **pending → preparing:** Manual (cashier) or automatic (kitchen starts)
- **preparing → ready:** Kitchen marks ready
- **ready → served:** Payment finalization OR checkout endpoint
- **Any → cancelled:** Manager/admin only (via cancel endpoint)
- **served/cancelled:** Immutable (no further transitions)

**Special Case:** Kitchen marking "ready" auto-transitions to "served" (line 761 in `lib/domain/orders.ts`)

### Payment Model

**Methods Supported:**
- `cash` - Cash payment
- `mtn_momo` - MTN Mobile Money
- `airtel_money` - Airtel Money
- `card` - Card payment (via Pesapal)

**Payment Statuses:**
- `pending` - Payment initiated but not confirmed
- `completed` - Payment successful
- `failed` - Payment failed

**Payment Flow:**
1. **Cash/MoMo:** Direct payment → creates Payment(completed) → finalizes order
2. **External (Pesapal):** Create session → redirect → webhook → finalizes order

### Shift Lifecycle

**States:**
- **Active:** `endTime = null`
- **Closed:** `endTime != null`

**Lifecycle:**
1. **Start:** Staff calls `/api/shifts/start` → creates Shift with `endTime = null`
2. **Active:** Orders created, payments processed
3. **Close:** Manager calls `/api/shifts/[shiftId]/close` with `countedCashUgx`
   - Validates: No pending/preparing orders
   - Computes: Cash variance = countedCashUgx - expectedCash
   - Updates: `endTime`, `closedByStaffId`, `countedCashUgx`, `cashVarianceUgx`

**Restrictions:**
- Cannot create orders for closed shifts
- Cannot process payments for orders in closed shifts
- Cannot close shift with unfinished orders

### Role System

**StaffRole Enum:** `'admin' | 'manager' | 'cashier' | 'kitchen'`

**Role Permissions:**
- **admin:** Full access (products, staff, tables, orders, payments, shifts)
- **manager:** Order cancellation, shift closing, payment processing, order viewing
- **cashier:** Order creation, payment processing, order viewing
- **kitchen:** Kitchen status updates (pending → preparing → ready)

**Enforcement:**
- Server-side: `assertStaffRole(staffId, allowedRoles)` in API routes
- Client-side: `<RoleGuard allowedRoles={[...]}>` wrapper component

### Invariants Enforced in Code

1. **Order Immutability:** Orders in `served` or `cancelled` status cannot be modified
2. **Payment Cap:** Sum of payments cannot exceed `order.totalUgx`
3. **Active Product:** Only `isActive = true` products can be added to orders
4. **Shift Active:** Orders can only be created/modified for active shifts (`endTime = null`)
5. **Table Occupancy:** Table is occupied if order exists with `status IN (pending, preparing, ready)`
6. **Order Totals:** `totalUgx` recalculated from `OrderItem.lineTotalUgx` on every item change
7. **Payment Finalization:** Only one function sets `order.status = 'served'` (`finalizePayment` in `lib/domain/orders.ts`)

---

## PHASE 3 — ORDER FLOW END-TO-END

### Complete Order Lifecycle

#### Step 1: **Create Order Shell**

**Trigger:** Cashier clicks "New Order" → selects table (dine-in) or "Takeaway"

**API:** `POST /api/orders/dine-in` or `POST /api/orders/takeaway`

**Function:** `createDineInOrder()` or `createTakeawayOrder()` → `createOrder()`

**Validation:**
- Staff exists and is active (`getStaff()`)
- Staff has active shift (`getActiveShift()`)
- Dine-in: `tableId` required
- Takeaway: `tableId` must be null

**Database Writes:**
- Creates `Order` record:
  - `status = 'pending'`
  - `subtotalUgx = 0`, `taxUgx = 0`, `totalUgx = 0`
  - Links to `shiftId`, `createdByStaffId`, `terminalId`
  - Generates `orderNumber` (format: `{shiftId-prefix}-{sequence}`)

**Side Effects:**
- Table status set to `'occupied'` (if dine-in)
- Order appears in POS active orders list

**Race Condition Prevention:** None (order creation is idempotent via orderNumber uniqueness)

---

#### Step 2: **Add Items to Order**

**Trigger:** Cashier selects product from catalog → enters quantity/size/modifier

**API:** `POST /api/orders/[orderId]/items`

**Function:** `addItemToOrder()` → `addOrderItem()` (in `lib/order-items.ts`)

**Validation:**
- Order exists and is editable (`status IN ('pending', 'preparing')`)
- Product exists and is active (`isActive = true`)
- Quantity >= 1

**Database Writes (Transactional):**
```typescript
prisma.$transaction(async (tx) => {
  // 1. Assert order editable
  await assertOrderEditable(tx, orderId)
  
  // 2. Assert product active
  const product = await assertProductActive(tx, productId)
  
  // 3. Create OrderItem
  await tx.orderItem.create({
    data: {
      orderId,
      productId,
      quantity,
      unitPriceUgx: product.priceUgx,
      lineTotalUgx: unitPrice * quantity,
      size, modifier, notes, sortOrder
    }
  })
  
  // 4. Recalculate order totals
  await recalcAndUpdateOrderTotals(tx, orderId)
})
```

**Total Recalculation:**
- Sums all `OrderItem.lineTotalUgx`
- Updates `Order.subtotalUgx`, `Order.totalUgx` (tax = 0 currently)

**Side Effects:**
- Order total updated
- Order appears in kitchen queue (if status = 'preparing')

**Race Condition Prevention:** Transaction ensures atomicity; order status checked inside transaction

---

#### Step 3: **Submit Order to Kitchen**

**Trigger:** Cashier clicks "Submit" button

**API:** `POST /api/orders/[orderId]/submit`

**Function:** `transitionOrderStatus()` → `setOrderStatus()`

**Validation:**
- Order exists
- Current status = `'pending'`
- Transition `pending → preparing` is allowed

**Database Writes:**
- Updates `Order.status = 'preparing'`
- Sets `Order.updatedByStaffId`

**Side Effects:**
- Order appears in kitchen display (`/api/kitchen/[shiftId]/queue`)
- Order removed from "pending" list in POS

**Race Condition Prevention:** Status check inside `setOrderStatus()` prevents double-submission

---

#### Step 4: **Kitchen Prepares Order**

**Trigger:** Kitchen staff clicks "Start Preparing" on kitchen display

**API:** `POST /api/kitchen/orders/[orderId]/status` with `newStatus = 'preparing'`

**Function:** `updateKitchenStatus()` in `lib/domain/orders.ts`

**Validation:**
- Order exists
- Current status = `'pending'`
- Staff role IN (`'kitchen'`, `'manager'`, `'admin'`)

**Database Writes:**
- Updates `Order.status = 'preparing'` (if not already)
- Sets `Order.updatedByStaffId`

**Side Effects:**
- Order moves to "preparing" section in kitchen display
- Order still editable in POS (can add items)

**Note:** This step is optional if order was already submitted to kitchen

---

#### Step 5: **Kitchen Marks Ready**

**Trigger:** Kitchen staff clicks "Mark Ready"

**API:** `POST /api/kitchen/orders/[orderId]/status` with `newStatus = 'ready'`

**Function:** `updateKitchenStatus()`

**Validation:**
- Order exists
- Current status = `'preparing'`
- Staff role IN (`'kitchen'`, `'manager'`, `'admin'`)

**Database Writes:**
- Updates `Order.status = 'served'` (AUTO-TRANSITION - line 761)
  - **CRITICAL:** Kitchen marking "ready" immediately sets status to "served"
  - This bypasses the normal `ready → served` transition

**Side Effects:**
- Order removed from kitchen queue
- Order appears in "Ready for Payment" section
- Table released (if dine-in)

**Race Condition Prevention:** Status check prevents invalid transitions

**⚠️ ARCHITECTURAL ISSUE:** Kitchen marking "ready" auto-transitions to "served" without payment validation. This may be intentional (kitchen finalizes) or a bug.

---

#### Step 6: **Payment Processing**

**Three Payment Paths:**

##### Path A: **Cash Payment**

**Trigger:** Cashier enters cash amount → clicks "Pay Cash"

**API:** `POST /api/orders/[orderId]/pay-cash`

**Function:** `payOrderCash()` → `finalizePayment()` (in `lib/domain/orders.ts`)

**Validation (inside transaction):**
- Order exists
- Order status IN (`'pending'`, `'preparing'`, `'ready'`)
- Shift is active (`shift.endTime = null`)
- Order has items (`orderItems.length > 0`)
- `amountUgx >= order.totalUgx` (sufficient payment)
- Staff role IN (`'cashier'`, `'manager'`, `'admin'`)

**Database Writes (Transactional):**
```typescript
prisma.$transaction(async (tx) => {
  // 1. Recalculate order total from items (hardening)
  const summedTotal = order.orderItems.reduce((s, i) => s + Number(i.lineTotalUgx), 0)
  if (Math.abs(summedTotal - storedTotal) > 0.01) {
    await tx.order.update({ data: { totalUgx: summedTotal } })
  }
  
  // 2. Create Payment record
  await tx.payment.create({
    data: {
      orderId,
      amountUgx,
      method: 'cash',
      status: 'completed',
      createdByStaffId: staffId
    }
  })
  
  // 3. CRITICAL: Set order.status = 'served' (ONLY place this happens)
  await tx.order.update({
    where: { id: orderId },
    data: { status: 'served' }
  })
})
```

**After Transaction:**
- Releases table (if dine-in) via `releaseTableForOrder()`

**Side Effects:**
- Order marked as served
- Table becomes available
- Order appears in shift summary

**Race Condition Prevention:** Transaction + status check prevents double-payment

---

##### Path B: **Mobile Money Payment**

**Trigger:** Cashier enters amount → clicks "Pay MoMo"

**API:** `POST /api/orders/[orderId]/pay-momo`

**Function:** `payOrderMomo()` → `finalizePayment()`

**Flow:** Identical to cash payment, except `method = 'mtn_momo'`

---

##### Path C: **External Payment (Pesapal)**

**Trigger:** Cashier clicks "Pay with Card/MoMo" → redirects to Pesapal

**API:** `POST /api/orders/[orderId]/pay-pesapal`

**Function:** `createPesapalPaymentSession()`

**Flow:**
1. Validates order is payable
2. Calls Pesapal API to create payment session
3. Returns `paymentUrl` for redirect
4. User completes payment on Pesapal
5. Pesapal webhook calls `/api/payments/pesapal/webhook`
6. Webhook handler calls `recordExternalPayment()` → `finalizePayment()`

**Webhook Handler** (`app/api/payments/pesapal/webhook/route.ts`):
- Verifies HMAC signature
- Maps Pesapal payment method to internal method
- Calls `recordExternalPayment()` with `staffId = 'system'` (bypasses role check)
- Uses `externalReference` (transaction_tracking_id) for idempotency

**Idempotency:** If `externalReference` already exists, `finalizePayment()` returns early

---

#### Step 7: **Order Finalization (Alternative Path)**

**Trigger:** Cashier clicks "Checkout" (for orders already marked ready)

**API:** `POST /api/orders/[orderId]/checkout`

**Function:** `checkoutOrder()` in `lib/checkout.ts`

**Validation:**
- Order exists
- Order status = `'ready'`
- Sum of completed payments >= order total

**Database Writes:**
- Updates `Order.status = 'served'` (via `setOrderStatus()`)
- Releases table (if dine-in)

**Use Case:** For orders that reached "ready" status but payment was recorded separately

---

#### Step 8: **Receipt Generation**

**Trigger:** After payment → redirect to receipt page OR manual "View Receipt"

**API:** `GET /api/orders/[orderId]/receipt`

**Function:** `getOrderReceipt()` in `lib/domain/orders.ts`

**Data Returned:**
- Order details (number, type, table, status, dates)
- Items (name, image, quantity, prices)
- Payments (method, amount)
- Staff name

**Side Effects:** None (read-only)

**Printing:** Client-side `window.print()` with thermal receipt CSS (80mm width)

---

#### Step 9: **Shift Reporting**

**Trigger:** Manager views shift details or closes shift

**API:** `GET /api/shifts/[shiftId]/summary`

**Function:** `getShiftSummary()` in `lib/domain/shifts.ts`

**Computation:**
- Counts orders with `status = 'served'`
- Sums payments by method (only `status = 'completed'`)
- Groups: cash, mtn_momo, airtel_money, card

**Side Effects:** None (read-only)

---

### Race Condition Prevention Mechanisms

1. **Transactions:** All write operations use `prisma.$transaction()` for atomicity
2. **Status Checks:** Order status validated inside transactions before updates
3. **Idempotency:** External payments use `externalReference` unique constraint
4. **Locking:** Prisma transactions provide row-level locking

### Single Source of Truth Functions

1. **Order Status Transitions:** `setOrderStatus()` in `lib/order-status.ts`
2. **Payment Finalization:** `finalizePayment()` in `lib/domain/orders.ts` (ONLY function that sets `status = 'served'`)
3. **Order Totals:** `recalcAndUpdateOrderTotals()` in `lib/order-items.ts`
4. **Table Release:** `releaseTableForOrder()` in `lib/table-lifecycle.ts`
5. **Shift Summary:** `getShiftSummary()` in `lib/domain/shifts.ts`

### Duplicated Logic

**⚠️ ISSUE:** Kitchen status update (`updateKitchenStatus`) duplicates order status transition logic but adds auto-transition to "served". Consider consolidating.

---

## PHASE 4 — PAYMENT ARCHITECTURE

### Payment Flow Summary

**Canonical Payment Finalizer:** `finalizePayment()` function in `lib/domain/orders.ts` (lines 197-284)

This is the **ONLY** function that sets `order.status = 'served'`. All payment paths converge here.

### Payment Paths

#### 1. **Cash Flow**

**Entry Point:** `POST /api/orders/[orderId]/pay-cash`

**Function Chain:**
```
payOrderCash() → finalizePayment() → releaseTableForOrder()
```

**Validation:**
- Order status IN (`pending`, `preparing`, `ready`)
- `amountUgx >= order.totalUgx`
- Shift active
- Order has items

**Database Writes:**
- Creates `Payment(method='cash', status='completed')`
- Updates `Order.status = 'served'`

**Idempotency:** None (cash payments are not idempotent by design)

---

#### 2. **Mobile Money Flow**

**Entry Point:** `POST /api/orders/[orderId]/pay-momo`

**Function Chain:**
```
payOrderMomo() → finalizePayment() → releaseTableForOrder()
```

**Flow:** Identical to cash, except `method = 'mtn_momo'`

---

#### 3. **External Payment Flow (Pesapal)**

**Entry Point:** `POST /api/orders/[orderId]/pay-pesapal` → Webhook: `POST /api/payments/pesapal/webhook`

**Function Chain:**
```
createPesapalPaymentSession() → [User redirects] → 
Webhook → recordExternalPayment() → finalizePayment() → releaseTableForOrder()
```

**Session Creation:**
- Validates order payable
- Calls Pesapal `/Auth/RequestToken` → gets bearer token
- Calls Pesapal `/Transactions/SubmitOrderRequest` → gets `redirect_url`
- Returns `paymentUrl` to client

**Webhook Processing:**
- Verifies HMAC signature (`x-pesapal-signature` header)
- Maps payment method (MTN → `mtn_momo`, AIRTEL → `airtel_money`, VISA/MASTERCARD → `card`)
- Calls `recordExternalPayment()` with `externalReference = transaction_tracking_id`

**Idempotency:** 
- `externalReference` is unique constraint
- `finalizePayment()` checks for existing payment with same `externalReference`
- If exists, returns early (idempotent success)

**Race Condition Protection:** Transaction ensures atomic payment creation + status update

---

### Amount Validation

**Rules:**
1. Payment amount must be > 0 (`PaymentAmountInvalidError`)
2. Sum of all payments (any status) cannot exceed `order.totalUgx` (`PaymentExceedsOrderTotalError`)
3. For finalization: `amountUgx >= order.totalUgx` (`PaymentInsufficientError`)

**Enforcement:**
- Checked in `recordPayment()` (prevents overpayment)
- Checked in `finalizePayment()` (ensures sufficient payment)

---

### Order Finalization Logic

**Two Paths to "Served":**

1. **Direct Payment Finalization:**
   - Cash/MoMo: `payOrderCash()` / `payOrderMomo()` → `finalizePayment()` → sets `served`
   - External: Webhook → `recordExternalPayment()` → `finalizePayment()` → sets `served`

2. **Checkout Endpoint:**
   - `checkoutOrder()` validates payments complete → calls `setOrderStatus(served)`
   - Used when payment recorded separately from status update

**Critical Function:** `finalizePayment()` (lines 197-284 in `lib/domain/orders.ts`)
- Loads order with items and shift inside transaction
- Recalculates total from items (hardening)
- Validates status is payable
- Validates payment amount
- Creates Payment record
- **Sets `order.status = 'served'`** ← ONLY place this happens

---

### Table Release Behavior

**Function:** `releaseTableForOrder()` in `lib/table-lifecycle.ts`

**Logic:**
- Checks order exists and is terminal (`status IN ('served', 'cancelled')`)
- If `tableId` is null (takeaway), no-op
- Updates `RestaurantTable.status = 'available'`

**Called After:**
- Payment finalization (cash, momo, external)
- Order cancellation
- Checkout completion

**Race Condition:** None (table release happens after transaction commits)

---

### Receipt Generation Dependency

**Function:** `getOrderReceipt()` in `lib/domain/orders.ts`

**Requirements:**
- Order must exist
- Order can be any status (receipt shows current state)

**Data Sources:**
- Order table (status, dates, totals)
- OrderItems (with Product names via join)
- Payments (only `status = 'completed'`)
- Staff table (for `createdByStaff.fullName`)
- Table table (for `table.code`)

**Side Effects:** None (read-only)

---

### Payment API Endpoints

| Endpoint | Method | Purpose | Authorization |
|----------|--------|---------|---------------|
| `/api/orders/[orderId]/pay-cash` | POST | Cash payment | cashier, manager, admin |
| `/api/orders/[orderId]/pay-momo` | POST | Mobile money payment | cashier, manager, admin |
| `/api/orders/[orderId]/pay-pesapal` | POST | Create external payment session | cashier, manager, admin |
| `/api/orders/[orderId]/payments` | POST | Generic payment recording | cashier, manager, admin |
| `/api/payments/pesapal/webhook` | POST | External payment webhook | HMAC signature |
| `/api/orders/[orderId]/checkout` | POST | Finalize order (validate payments) | cashier, manager, admin |

---

## PHASE 5 — SHIFT MANAGEMENT

### Shift Start

**Entry Point:** `POST /api/shifts/start`

**Function:** `startShift()` in `lib/shift-lifecycle.ts`

**Validation:**
- Staff exists and is active (`getStaff()`)
- Staff does not already have active shift (`endTime = null`)

**Database Writes:**
- Creates `Shift` record:
  - `staffId`, `terminalId` (default: `'pos-1'`)
  - `startTime = now()`
  - `endTime = null`

**Error Handling:**
- If `StaffAlreadyHasActiveShiftError`: Returns existing shift (allows continuation)

**Client Storage:**
- Shift ID stored in `localStorage` via `setShiftId()` (`lib/pos-shift-store.ts`)
- Key: `'pos_shift_id'`

**Side Effects:**
- Staff can now create orders
- Orders linked to this shift

---

### Shift Storage

**Client-Side:** `localStorage.getItem('pos_shift_id')`

**Server-Side:** Shift stored in database; active shift queried via `getActiveShift(staffId)`

**Cross-Device Behavior:**
- Shift is server-side (database)
- Multiple devices can use same shift if same staff logs in
- Shift ID in localStorage is for client convenience only

**Assumption:** One active shift per staff member (enforced by `startShift()`)

---

### Shift Guards

**Enforcement Points:**

1. **Order Creation:** `createOrder()` calls `getActiveShift()` - throws if no active shift
2. **Payment Processing:** `finalizePayment()` checks `shift.endTime === null` - throws if closed
3. **Shift Closing:** `closeShift()` checks for unfinished orders - throws if pending/preparing orders exist

**Guard Functions:**
- `getActiveShift(staffId)` - Returns active shift or throws `NoActiveShiftError`
- Shift validation in `finalizePayment()` - Prevents payments for closed shifts

---

### Summary Computation

**Function:** `getShiftSummary()` in `lib/domain/shifts.ts`

**Computation:**
```typescript
// Count served orders
ordersServed = COUNT(Order WHERE shiftId = X AND status = 'served')

// Sum payments by method (only completed payments for served orders)
payments = Payment WHERE order.shiftId = X 
           AND order.status = 'served' 
           AND status = 'completed'

cashSales = SUM(payments WHERE method = 'cash')
mtnMomoSales = SUM(payments WHERE method = 'mtn_momo')
airtelSales = SUM(payments WHERE method = 'airtel_money')
cardSales = SUM(payments WHERE method = 'card')

totalSales = cashSales + mtnMomoSales + airtelSales + cardSales
```

**Read-Only:** No database writes

---

### Closing Logic

**Entry Point:** `POST /api/shifts/[shiftId]/close`

**Function:** `closeShift()` in `lib/domain/shifts.ts`

**Validation:**
- Shift exists
- Shift not already closed (`endTime === null`)
- No unfinished orders (`status IN ('pending', 'preparing')`)
- Staff role IN (`'manager'`, `'admin'`)

**Computation:**
1. Gets shift summary (`getShiftSummary()`)
2. Calculates variance: `variance = countedCashUgx - expectedCash` (where `expectedCash = cashSales`)

**Database Writes (Transactional):**
```typescript
prisma.$transaction(async (tx) => {
  await tx.shift.update({
    where: { id: shiftId },
    data: {
      endTime: new Date(),
      closedByStaffId,
      countedCashUgx: new Decimal(countedCashUgx),
      cashVarianceUgx: new Decimal(variance)
    }
  })
})
```

**Return Value:**
```typescript
{
  shiftId,
  expectedCash,      // From shift summary
  countedCashUgx,    // User input
  variance           // countedCashUgx - expectedCash
}
```

---

### Restrictions on Closing

1. **Unfinished Orders:** Cannot close if orders exist with `status IN ('pending', 'preparing')`
2. **Already Closed:** Cannot close shift that already has `endTime != null`
3. **Role Required:** Only manager or admin can close shifts

**Error:** `ShiftHasUnfinishedOrdersError` if pending/preparing orders exist

---

### Assumptions

1. **One Shift Per Terminal:** Not enforced - multiple shifts can have same `terminalId`
2. **One Active Shift Per Staff:** Enforced - `startShift()` throws if active shift exists
3. **Cross-Device Behavior:** Shift is server-side; multiple devices can access same shift if same staff

---

## PHASE 6 — KITCHEN WORKFLOW

### Kitchen Queue Generation

**Entry Point:** `GET /api/kitchen/[shiftId]/queue`

**Function:** `getKitchenQueue()` in `lib/domain/orders.ts`

**Query:**
```typescript
orders = Order.findMany({
  where: {
    shiftId,
    status: { in: ['pending', 'preparing'] }
  },
  orderBy: { createdAt: 'asc' },  // Oldest first
  select: {
    id, status, createdAt,
    table: { code },
    orderItems: {
      product: { name, images },
      quantity
    }
  }
})
```

**Returns:** Array of orders with items, sorted by creation time

**Read-Only:** No database writes

---

### Status Updates

**Entry Point:** `POST /api/kitchen/orders/[orderId]/status`

**Function:** `updateKitchenStatus()` in `lib/domain/orders.ts`

**Allowed Transitions:**
- `pending → preparing`
- `preparing → ready`

**Validation:**
- Order exists
- Current status allows transition
- Staff role IN (`'kitchen'`, `'manager'`, `'admin'`)

**Database Writes:**
- Updates `Order.status`
- Sets `Order.updatedByStaffId`

**Special Behavior:** When marking "ready", status is set to `'served'` (line 761)
```typescript
const targetStatus = newStatus === 'ready' ? 'served' : newStatus
```

**⚠️ ARCHITECTURAL ISSUE:** Kitchen marking "ready" bypasses payment validation and immediately serves order. This may be intentional (kitchen finalizes) or a bug.

---

### Role Restrictions

**Kitchen Roles:** `'kitchen'`, `'manager'`, `'admin'`

**Enforcement:** `assertStaffRole(staffId, KITCHEN_ROLES)` in `updateKitchenStatus()`

**Cashier Access:** Cashiers cannot update kitchen status (enforced server-side)

---

### Polling Behavior

**Kitchen Display:** Polls `/api/kitchen/[shiftId]/queue` every 5 seconds (line 103 in `app/(pos)/kitchen/[shiftId]/page.tsx`)

**Real-time:** No WebSocket or Server-Sent Events - polling only

---

### Auto-Transitions

**Kitchen "Ready" → "Served":**
- When kitchen marks order as "ready", status automatically transitions to "served"
- This happens in `updateKitchenStatus()` (line 761)
- Bypasses normal `ready → served` transition that requires payment validation

**Rationale:** Unclear - may be intentional (kitchen finalizes order) or bug

---

### Effects on Order Lifecycle

**Kitchen Actions:**
- **Start Preparing:** Order becomes non-editable in POS (status = 'preparing')
- **Mark Ready:** Order immediately becomes "served" (bypasses payment)

**Kitchen Cannot:**
- Cancel orders (manager/admin only)
- Process payments
- Modify order items
- Finalize orders (except via "ready" auto-transition)

---

## PHASE 7 — FRONTEND ROUTES & SCREENS

### POS Routes (Cashier Interface)

| Route | Purpose | Data Sources | Key Actions | Dependencies |
|-------|---------|--------------|-------------|--------------|
| `/pos/login` | Staff login | `POST /api/auth/login` | Login | None |
| `/pos/start` | Start shift | `POST /api/shifts/start` | Start shift, set terminal ID | Staff session |
| `/pos/orders` | Order management | `GET /api/pos/products`, `GET /api/orders/active` | Create order, add items, submit to kitchen | Active shift |
| `/pos/orders/[orderId]` | Order detail/edit | `GET /api/orders/[orderId]`, `POST /api/orders/[orderId]/items` | Add/edit/remove items, submit order | Active shift |
| `/pos/payment/[orderId]` | Payment processing | `GET /api/orders/[orderId]`, `POST /api/orders/[orderId]/pay-*` | Process cash/momo/external payment | Active shift, order ready |
| `/pos/receipt/[orderId]` | Receipt display | `GET /api/orders/[orderId]/receipt` | View/print receipt | Order served |
| `/pos/ready` | Ready orders queue | `GET /api/orders/active` (filter ready) | View ready orders | Active shift |

### Kitchen Routes

| Route | Purpose | Data Sources | Key Actions | Dependencies |
|-------|---------|--------------|-------------|--------------|
| `/kitchen` | Kitchen login/start | `GET /api/shifts/active` | Select shift | Staff session (kitchen role) |
| `/kitchen/[shiftId]` | Kitchen display | `GET /api/kitchen/[shiftId]/queue` | Update order status (preparing/ready) | Active shift, kitchen role |

### Manager Routes

| Route | Purpose | Data Sources | Key Actions | Dependencies |
|-------|---------|--------------|-------------|--------------|
| `/manager/dashboard` | Manager dashboard | `GET /api/orders/active`, shift summary | View orders requiring attention | Manager role |
| `/manager/orders` | Order management | `GET /api/orders/active` | View orders, cancel orders | Manager role |
| `/manager/payments` | Payment overview | `GET /api/admin/payments` | View payment history | Manager role |
| `/manager/shifts` | Shift management | `GET /api/shifts/active`, `GET /api/shifts/[shiftId]/summary` | View/close shifts | Manager role |
| `/manager/shifts/[shiftId]` | Shift details | `GET /api/shifts/[shiftId]/summary` | View shift summary, close shift | Manager role |

### Admin Routes

| Route | Purpose | Data Sources | Key Actions | Dependencies |
|-------|---------|--------------|-------------|--------------|
| `/admin/dashboard` | Admin dashboard | Various aggregated queries | View KPIs, charts | Admin role |
| `/admin/products` | Product management | `GET /api/admin/products` | CRUD products | Admin role |
| `/admin/staff` | Staff management | `GET /api/staff` | CRUD staff | Admin role |
| `/admin/tables` | Table management | `GET /api/admin/tables` | CRUD tables | Admin role |
| `/admin/orders` | Order viewing | `GET /api/admin/orders` | View orders, cancel orders | Admin role |
| `/admin/payments` | Payment history | `GET /api/admin/payments` | View payments | Admin role |
| `/admin/shifts` | Shift viewing | `GET /api/shifts` | View shifts | Admin role |
| `/admin/settings` | System settings | Various | Configure system | Admin role |

### Navigation Flow

**Cashier Flow:**
```
Login → Start Shift → Orders → [Create Order] → [Add Items] → 
[Submit to Kitchen] → [Payment] → Receipt
```

**Kitchen Flow:**
```
Login → Select Shift → Kitchen Display → [Start Preparing] → [Mark Ready]
```

**Manager Flow:**
```
Login → Dashboard → [View Orders/Payments/Shifts] → [Close Shift]
```

---

## PHASE 8 — API SURFACE

### Orders Domain

| Endpoint | Method | Purpose | Input | Output | Side Effects | Auth |
|----------|--------|---------|-------|--------|-------------|------|
| `/api/orders/dine-in` | POST | Create dine-in order | `{tableId, createdByStaffId, orderNumber?}` | Order | Creates order, occupies table | Staff session |
| `/api/orders/takeaway` | POST | Create takeaway order | `{staffId, orderNumber}` | Order | Creates order | Staff session |
| `/api/orders/[orderId]` | GET | Get order detail | - | OrderDetail | None | Staff session |
| `/api/orders/[orderId]/items` | POST | Add item to order | `{productId, quantity, size?, modifier?, notes?}` | OrderDetail | Creates OrderItem, updates totals | Staff session |
| `/api/orders/[orderId]/submit` | POST | Submit to kitchen | `{updatedByStaffId}` | OrderDetail | Updates status to 'preparing' | Staff session |
| `/api/orders/[orderId]/status` | POST | Update order status | `{newStatus, updatedByStaffId}` | Order | Updates status | Staff session |
| `/api/orders/[orderId]/cancel` | POST | Cancel order | `{cancelledByStaffId}` | Order | Sets status to 'cancelled', releases table | Manager/Admin |
| `/api/orders/[orderId]/checkout` | POST | Finalize order | `{updatedByStaffId}` | Order | Validates payments, sets 'served', releases table | Staff session |
| `/api/orders/[orderId]/pay-cash` | POST | Cash payment | `{amountUgx, staffId}` | OrderDetail | Creates payment, sets 'served', releases table | Cashier/Manager/Admin |
| `/api/orders/[orderId]/pay-momo` | POST | Mobile money payment | `{amountUgx, staffId}` | OrderDetail | Creates payment, sets 'served', releases table | Cashier/Manager/Admin |
| `/api/orders/[orderId]/pay-pesapal` | POST | Create external payment | `{appBaseUrl?}` | `{paymentUrl}` | Creates Pesapal session | Cashier/Manager/Admin |
| `/api/orders/[orderId]/payments` | POST | Record payment (generic) | `{amountUgx, method, status, createdByStaffId, reference?}` | Payment | Creates payment record | Cashier/Manager/Admin |
| `/api/orders/[orderId]/receipt` | GET | Get receipt data | - | OrderReceipt | None | Staff session |
| `/api/orders/active` | GET | Get active orders | - | ActiveOrderForPos[] | None | Staff session |

### Payments Domain

| Endpoint | Method | Purpose | Input | Output | Side Effects | Auth |
|----------|--------|---------|-------|--------|-------------|------|
| `/api/payments/pesapal/webhook` | POST | Pesapal payment webhook | Pesapal webhook payload | `{success: true}` | Creates payment, sets 'served', releases table | HMAC signature |

### Shifts Domain

| Endpoint | Method | Purpose | Input | Output | Side Effects | Auth |
|----------|--------|---------|-------|--------|-------------|------|
| `/api/shifts/start` | POST | Start shift | `{terminalId?}` | Shift | Creates shift | Staff session |
| `/api/shifts/active` | GET | Get active shift | - | Shift | None | Staff session |
| `/api/shifts/[shiftId]/close` | POST | Close shift | `{closedByStaffId, countedCashUgx}` | CloseShiftResult | Sets endTime, computes variance | Manager/Admin |
| `/api/shifts/[shiftId]/summary` | GET | Get shift summary | - | ShiftSummary | None | Staff session |
| `/api/shifts/[shiftId]/orders` | GET | Get shift orders | - | Order[] | None | Staff session |

### Kitchen Domain

| Endpoint | Method | Purpose | Input | Output | Side Effects | Auth |
|----------|--------|---------|-------|--------|-------------|------|
| `/api/kitchen/[shiftId]/queue` | GET | Get kitchen queue | - | KitchenQueueOrder[] | None | Staff session |
| `/api/kitchen/orders/[orderId]/status` | POST | Update kitchen status | `{newStatus, staffId}` | `{orderId}` | Updates order status | Kitchen/Manager/Admin |

### Products Domain

| Endpoint | Method | Purpose | Input | Output | Side Effects | Auth |
|----------|--------|---------|-------|--------|-------------|------|
| `/api/pos/products` | GET | Get active products (POS) | - | PosProduct[] | None | None |
| `/api/products` | GET | Get active products | - | ProductForPos[] | None | None |
| `/api/products/active` | GET | Get active products | - | ProductForPos[] | None | None |
| `/api/admin/products` | GET | Get all products | - | Product[] | None | Admin |
| `/api/admin/products` | POST | Create product | `{name, category, section, priceUgx, ...}` | Product | Creates product | Admin |
| `/api/admin/products/[productId]` | PUT | Update product | `{name, category, ...}` | Product | Updates product | Admin |
| `/api/admin/products/[productId]` | DELETE | Delete product | - | `{success: true}` | Deletes product, order items | Admin |
| `/api/admin/upload/product-image` | POST | Upload product image | FormData | `{path}` | Saves image file | Admin |

### Staff Domain

| Endpoint | Method | Purpose | Input | Output | Side Effects | Auth |
|----------|--------|---------|-------|--------|-------------|------|
| `/api/staff` | GET | Get all staff | - | Staff[] | None | Admin |
| `/api/staff` | POST | Create staff | `{username, fullName, role, password, isActive}` | Staff | Creates staff | Admin |
| `/api/staff/[staffId]` | PUT | Update staff | `{username?, fullName?, role?, password?, isActive?}` | Staff | Updates staff | Admin |
| `/api/staff/[staffId]` | DELETE | Delete staff | - | `{success: true}` | Deletes staff | Admin |

### Tables Domain

| Endpoint | Method | Purpose | Input | Output | Side Effects | Auth |
|----------|--------|---------|-------|--------|-------------|------|
| `/api/admin/tables` | GET | Get all tables | - | Table[] | None | Admin |
| `/api/admin/tables` | POST | Create table | `{code, capacity?, images?}` | Table | Creates table | Admin |
| `/api/admin/tables/[tableId]` | PUT | Update table | `{code?, capacity?, images?}` | Table | Updates table | Admin |
| `/api/admin/tables/[tableId]` | DELETE | Delete table | - | `{success: true}` | Sets isActive=false | Admin |
| `/api/admin/upload/table-image` | POST | Upload table image | FormData | `{path}` | Saves image file | Admin |
| `/api/pos/tables` | GET | Get available tables | `?shiftId=X` | Table[] | None | Staff session |

---

## PHASE 9 — ROLE & SECURITY MODEL

### Authorization Enforcement

**Server-Side Enforcement:**

1. **Role Checks:** `assertStaffRole(staffId, allowedRoles)` in `lib/domain/role-guard.ts`
   - Loads staff from database
   - Validates role is in allowed list
   - Throws `UnauthorizedRoleError` if not allowed

2. **API Route Protection:**
   - All API routes read `x-staff-id` header
   - Call `assertStaffRole()` before sensitive operations
   - Returns 401/403 on unauthorized access

3. **Domain Function Protection:**
   - Domain functions (e.g., `payOrderCash()`, `closeShift()`) call `assertStaffRole()`
   - Prevents unauthorized operations even if API route is bypassed

**Client-Side Enforcement:**

1. **RoleGuard Component:** `<RoleGuard allowedRoles={[...]}>`
   - Wraps pages/components
   - Checks `localStorage.getItem('pos_staff_role')`
   - Redirects if role not allowed

2. **Limitation:** Client-side checks can be bypassed - server-side is authoritative

### Trust Boundaries

1. **Client → API:** `x-staff-id` header (can be spoofed - mitigated by server validation)
2. **API → Domain:** Staff ID validated against database
3. **Domain → Database:** Prisma transactions ensure atomicity

### System-Level Actors

**Special Staff ID:** `'system'` (used in Pesapal webhook handler)
- Bypasses role check in `recordExternalPayment()`
- Authenticated via HMAC signature verification
- Used for external payment webhooks

### Missing Protections / Risks

**⚠️ RISKS:**

1. **Client-Side Staff ID:** `x-staff-id` header can be manipulated - mitigated by server validation
2. **No Session Expiration:** Staff sessions stored in localStorage - no expiration
3. **No Rate Limiting:** API endpoints lack rate limiting
4. **Webhook Security:** Pesapal webhook relies on HMAC - if secret leaked, payments can be faked
5. **No Audit Logging:** No comprehensive audit trail for sensitive operations
6. **Shift ID in localStorage:** Can be manipulated - mitigated by server validation

---

## PHASE 10 — EXTERNAL INTEGRATIONS

### Payment Providers

#### Pesapal Integration

**Status:** ✅ Fully Implemented

**Components:**
- Payment session creation (`createPesapalPaymentSession()`)
- Webhook handler (`/api/payments/pesapal/webhook`)
- HMAC signature verification
- Idempotency via `externalReference`

**Configuration:**
- `PESAPAL_BASE_URL`
- `PESAPAL_CONSUMER_KEY`
- `PESAPAL_CONSUMER_SECRET`
- `PESAPAL_IPN_ID`
- `PESAPAL_WEBHOOK_SECRET`
- `PESAPAL_CALLBACK_URL`

**Flow:**
1. Create payment session → get `redirect_url`
2. User redirects to Pesapal
3. User completes payment
4. Pesapal calls webhook
5. Webhook verifies signature → finalizes payment

**Status:** Production-ready (if credentials configured)

---

### Printers

**Status:** ❌ Not Present

**Current Implementation:**
- Receipt page uses `window.print()` with thermal CSS (80mm width)
- No direct printer integration
- Relies on browser print dialog

**Gap:** No automatic receipt printing, no thermal printer API

---

### Authentication Services

**Status:** ⚠️ Partially Implemented

**Current Implementation:**
- Custom authentication (`lib/auth.ts` - appears to be for main site, not POS)
- POS uses simple localStorage-based session (`pos_staff_id`)
- No JWT tokens
- No session expiration
- No password reset flow

**Gap:** Basic authentication only - no advanced features

---

### Reporting Tools

**Status:** ⚠️ Partially Implemented

**Current Implementation:**
- Shift summary (orders served, sales by method)
- Admin dashboard (KPIs, charts)
- Payment history viewing

**Missing:**
- Export to CSV/PDF
- Daily/weekly/monthly reports
- Product sales reports
- Staff performance reports

---

### Hardware Dependencies

**Status:** ❌ Not Present

**No Integration With:**
- Barcode scanners
- Cash drawers
- Receipt printers (thermal)
- Kitchen display systems (KDS) hardware
- Payment terminals

**Current:** Software-only POS system

---

## PHASE 11 — RUNTIME FLOW (REAL OPERATION)

### Complete Shift Flow

#### 1. **Staff Starts Shift**

**Manual Steps:**
1. Staff logs in at `/pos/login`
2. Staff enters credentials → authenticated
3. Staff redirected to `/pos/start`
4. Staff enters terminal ID (default: `'pos-1'`)
5. Staff clicks "Start Shift"

**System Actions:**
- Creates `Shift` record in database
- Stores `shiftId` in localStorage
- Redirects to `/pos/orders`

**Duration:** ~30 seconds

---

#### 2. **Orders Are Taken**

**Manual Steps:**
1. Cashier clicks "New Order"
2. Selects table (dine-in) or "Takeaway"
3. Enters order name (optional)
4. Selects products from catalog
5. Adjusts quantity, size, modifiers
6. Clicks "Submit to Kitchen"

**System Actions:**
- Creates order shell (`status = 'pending'`)
- Adds items (creates OrderItems, updates totals)
- Submits to kitchen (`status = 'preparing'`)
- Order appears in kitchen display

**Duration:** 2-5 minutes per order

---

#### 3. **Kitchen Prepares Food**

**Manual Steps:**
1. Kitchen staff views kitchen display (`/kitchen/[shiftId]`)
2. Sees pending orders
3. Clicks "Start Preparing" on order
4. Prepares food
5. Clicks "Mark Ready" when done

**System Actions:**
- Updates order status (`preparing → ready`)
- **CRITICAL:** Auto-transitions to `'served'` (bypasses payment)
- Order removed from kitchen queue
- Table released (if dine-in)

**Duration:** 10-30 minutes per order

**⚠️ ISSUE:** Kitchen marking "ready" immediately serves order without payment validation

---

#### 4. **Customers Pay**

**Manual Steps:**

**Option A - Cash:**
1. Cashier navigates to order detail
2. Clicks "Pay Cash"
3. Enters cash amount received
4. Clicks "Pay"

**Option B - Mobile Money:**
1. Cashier clicks "Pay MoMo"
2. Enters amount
3. Customer completes payment on phone
4. Cashier confirms payment

**Option C - External (Pesapal):**
1. Cashier clicks "Pay with Card/MoMo"
2. Redirects to Pesapal
3. Customer completes payment
4. Redirects back to receipt

**System Actions:**
- Creates Payment record
- Sets order status to `'served'` (if not already)
- Releases table (if dine-in)
- Redirects to receipt

**Duration:** 1-2 minutes

---

#### 5. **Receipts Printed**

**Manual Steps:**
1. After payment → auto-redirect to receipt page
2. Cashier clicks "Print Receipt"
3. Browser print dialog opens
4. Cashier selects printer
5. Prints receipt

**System Actions:**
- Loads receipt data (read-only)
- Formats for thermal printing (80mm width)
- Uses browser print API

**Duration:** ~30 seconds

**Gap:** No automatic printing - manual step required

---

#### 6. **Shift Closed**

**Manual Steps:**
1. Manager navigates to `/manager/shifts/[shiftId]`
2. Views shift summary
3. Counts physical cash
4. Enters counted cash amount
5. Clicks "Close Shift"

**System Actions:**
- Validates no unfinished orders
- Computes cash variance
- Sets `shift.endTime`
- Stores `countedCashUgx` and `cashVarianceUgx`

**Duration:** 5-10 minutes

**Restrictions:**
- Cannot close if pending/preparing orders exist
- Only manager/admin can close

---

### Manual Steps Required

1. **Shift Start:** Manual (staff must start shift)
2. **Order Creation:** Manual (cashier creates orders)
3. **Kitchen Status:** Manual (kitchen updates status)
4. **Payment:** Manual (cashier processes payment)
5. **Receipt Printing:** Manual (browser print dialog)
6. **Shift Closing:** Manual (manager counts cash and closes)

**Automation:** Minimal - most steps require human interaction

---

## PHASE 12 — CURRENT COMPLETENESS ASSESSMENT

### ✔ Production-Ready Components

1. **Order Management:**
   - Order creation, item management, status transitions
   - Transactional integrity
   - Race condition prevention

2. **Payment Processing:**
   - Cash, mobile money, external payments
   - Idempotency for external payments
   - Payment validation and finalization

3. **Kitchen Workflow:**
   - Kitchen queue generation
   - Status updates
   - Role-based access

4. **Shift Management:**
   - Shift start/close
   - Summary computation
   - Cash reconciliation

5. **Product Management:**
   - CRUD operations
   - Image uploads
   - Active/inactive filtering

6. **Staff Management:**
   - CRUD operations
   - Role-based access control
   - Password hashing (bcrypt)

7. **Table Management:**
   - CRUD operations
   - Occupancy tracking
   - Image uploads

8. **Data Integrity:**
   - Foreign key constraints
   - Transactional operations
   - Status validation

---

### ⚠ Fragile or Incomplete Components

1. **Kitchen Auto-Transition:**
   - Kitchen marking "ready" auto-transitions to "served" without payment
   - **Risk:** Orders can be served without payment if kitchen marks ready
   - **Impact:** Financial loss, data inconsistency

2. **Session Management:**
   - No session expiration
   - localStorage-based (can be cleared)
   - No refresh tokens
   - **Risk:** Security vulnerability, user experience issues

3. **Receipt Printing:**
   - Browser print dialog only
   - No automatic printing
   - No thermal printer integration
   - **Impact:** Manual step required, slower service

4. **Error Handling:**
   - Basic error messages
   - No comprehensive error logging
   - No error recovery mechanisms
   - **Impact:** Difficult debugging, poor user experience on errors

5. **Data Validation:**
   - Client-side validation only for some fields
   - No comprehensive input sanitization
   - **Risk:** Data corruption, security vulnerabilities

6. **Concurrency:**
   - Basic transaction support
   - No optimistic locking
   - **Risk:** Race conditions in high-traffic scenarios

7. **Reporting:**
   - Basic shift summary
   - No export functionality
   - Limited analytics
   - **Impact:** Manual reporting required

---

### ❌ Missing for Real Café Deployment

1. **Hardware Integration:**
   - No barcode scanner support
   - No cash drawer integration
   - No thermal printer API
   - No payment terminal integration
   - **Impact:** Manual processes, slower service

2. **Advanced Features:**
   - No split payments
   - No partial payments
   - No refunds
   - No discounts/coupons
   - No loyalty programs
   - **Impact:** Limited payment options, no customer retention

3. **Operational Features:**
   - No inventory management (stock tracking)
   - No ingredient tracking
   - No recipe management
   - No supplier management
   - **Impact:** Manual inventory tracking required

4. **Security Features:**
   - No session expiration
   - No password reset flow
   - No two-factor authentication
   - No audit logging
   - **Risk:** Security vulnerabilities

5. **Backup & Recovery:**
   - No automated backups
   - No data export
   - No disaster recovery plan
   - **Risk:** Data loss

6. **Multi-Location:**
   - No multi-location support
   - No centralized reporting
   - **Impact:** Single location only

7. **Customer Management:**
   - No customer database
   - No customer history
   - No customer preferences
   - **Impact:** No customer relationship management

8. **Analytics:**
   - Basic reporting only
   - No predictive analytics
   - No sales forecasting
   - **Impact:** Limited business insights

---

### Reliability Risks

1. **Single Point of Failure:** Database (PostgreSQL) - no replication
2. **No Load Balancing:** Single server deployment
3. **No Caching:** Every request hits database
4. **No Rate Limiting:** API endpoints vulnerable to abuse
5. **No Monitoring:** No application performance monitoring
6. **No Alerts:** No error alerting system

---

### Data Integrity Risks

1. **Kitchen Auto-Transition:** Orders can be served without payment
2. **No Validation:** Some fields lack comprehensive validation
3. **Race Conditions:** Possible in high-concurrency scenarios
4. **No Backup:** Risk of data loss

---

### UX Gaps

1. **No Offline Mode:** Requires internet connection
2. **No Mobile App:** Web-only interface
3. **Manual Printing:** Receipt printing requires manual step
4. **No Search:** Limited search functionality
5. **No Filters:** Limited filtering options

---

### Operational Gaps

1. **No Training Mode:** Cannot train staff without affecting production data
2. **No Demo Mode:** No demonstration mode
3. **No Multi-Language:** English only
4. **No Accessibility:** Limited accessibility features
5. **No Help System:** No built-in help/documentation

---

## PHASE 13 — SAFE NEXT STEPS (DO NOT IMPLEMENT)

### Priority 1: Critical Fixes

1. **Fix Kitchen Auto-Transition Bug**
   - **Issue:** Kitchen marking "ready" auto-transitions to "served" without payment
   - **Action:** Remove auto-transition; require payment before serving
   - **Impact:** Prevents financial loss, ensures payment validation

2. **Add Session Expiration**
   - **Issue:** Sessions never expire
   - **Action:** Implement session timeout (e.g., 8 hours)
   - **Impact:** Security improvement

3. **Add Comprehensive Error Logging**
   - **Issue:** Limited error visibility
   - **Action:** Implement structured logging (e.g., Winston, Pino)
   - **Impact:** Better debugging, monitoring

---

### Priority 2: Data Integrity

4. **Add Input Validation**
   - **Issue:** Limited validation
   - **Action:** Add comprehensive input sanitization and validation
   - **Impact:** Prevents data corruption, security vulnerabilities

5. **Add Audit Logging**
   - **Issue:** No audit trail
   - **Action:** Log all sensitive operations (payments, cancellations, shift closes)
   - **Impact:** Compliance, accountability

6. **Add Backup System**
   - **Issue:** No automated backups
   - **Action:** Implement daily database backups
   - **Impact:** Data loss prevention

---

### Priority 3: Operational Improvements

7. **Add Receipt Auto-Printing**
   - **Issue:** Manual printing required
   - **Action:** Integrate thermal printer API or browser print automation
   - **Impact:** Faster service, better UX

8. **Add Partial Payments**
   - **Issue:** Cannot split payments
   - **Action:** Allow multiple payments per order
   - **Impact:** More payment flexibility

9. **Add Refund Functionality**
   - **Issue:** No refunds
   - **Action:** Implement refund workflow
   - **Impact:** Customer service improvement

---

### Priority 4: Feature Enhancements

10. **Add Inventory Management**
    - **Issue:** No stock tracking
    - **Action:** Implement inventory tracking, low stock alerts
    - **Impact:** Better inventory control

11. **Add Discounts/Coupons**
    - **Issue:** No discount system
    - **Action:** Implement discount codes, percentage discounts
    - **Impact:** Marketing capabilities

12. **Add Export Functionality**
    - **Issue:** No data export
    - **Action:** Add CSV/PDF export for reports
    - **Impact:** Better reporting

---

### Priority 5: Infrastructure

13. **Add Monitoring**
    - **Issue:** No application monitoring
    - **Action:** Implement APM (e.g., Sentry, Datadog)
    - **Impact:** Proactive issue detection

14. **Add Rate Limiting**
    - **Issue:** No rate limiting
    - **Action:** Implement rate limiting on API endpoints
    - **Impact:** Prevents abuse

15. **Add Caching**
    - **Issue:** Every request hits database
    - **Action:** Implement Redis caching for products, shifts
    - **Impact:** Performance improvement

---

### Development Recommendations

1. **Testing:** Add unit tests for domain logic, integration tests for API endpoints
2. **Documentation:** Add API documentation (OpenAPI/Swagger)
3. **Code Quality:** Add ESLint/Prettier, type checking improvements
4. **Performance:** Optimize database queries, add indexes where needed
5. **Security:** Security audit, penetration testing

---

**END OF ARCHITECTURAL ANALYSIS**
