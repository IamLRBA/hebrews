/**
 * Domain: dine-in order creation and add item to order.
 * Uses Prisma only in order-items; this module orchestrates.
 */

import { prisma } from '@/lib/db'
import type { Order, PaymentMethod } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { getActiveShift } from '@/lib/staff-session'
import { releaseTableForOrder } from '@/lib/table-lifecycle'
import { OrderNotFoundError, InvalidOrderStatusTransitionError } from '@/lib/order-status'
import { assertStaffRole } from '@/lib/domain/role-guard'
import { ShiftAlreadyClosedError } from '@/lib/domain/shifts'
import { config } from '@/lib/config'
import {
  addOrderItem,
  OrderItemNotFoundError,
  updateOrderItemQuantity as updateOrderItemQuantityInOrderItems,
  removeOrderItem as removeOrderItemInOrderItems,
} from '@/lib/order-items'

const PAYMENT_ROLES = ['cashier', 'manager', 'admin'] as const
const KITCHEN_ROLES = ['kitchen', 'manager', 'admin'] as const

/**
 * Creates a dine-in order for the staff's active shift.
 * Generates order number on the server (max order number for that shift + 1).
 * @throws NoActiveShiftError if staff has no active shift
 */
export async function createDineInOrder(params: {
  tableId: string
  createdByStaffId: string
  orderNumber?: string
  assignedWaiterId?: string | null
}): Promise<Order> {
  const { tableId, createdByStaffId, orderNumber: customOrderNumber, assignedWaiterId } = params

  const shift = await getActiveShift(createdByStaffId)

  let orderNumber: string
  if (customOrderNumber && customOrderNumber.trim()) {
    orderNumber = customOrderNumber.trim().slice(0, 32)
  } else {
    const ordersInShift = await prisma.order.findMany({
      where: { shiftId: shift.id },
      select: { orderNumber: true },
    })
    const prefix = `${shift.id.slice(0, 8)}-`
    let nextSeq = 1
    for (const o of ordersInShift) {
      if (o.orderNumber.startsWith(prefix)) {
        const n = parseInt(o.orderNumber.slice(prefix.length), 10)
        if (!Number.isNaN(n) && n >= nextSeq) nextSeq = n + 1
      }
    }
    orderNumber = `${prefix}${nextSeq}`
  }

  return prisma.order.create({
    data: {
      orderNumber,
      orderType: 'dine_in',
      tableId,
      shiftId: shift.id,
      createdByStaffId,
      assignedWaiterId: assignedWaiterId ?? undefined,
      terminalId: shift.terminalId,
      status: 'pending',
      subtotalUgx: 0,
      taxUgx: 0,
      totalUgx: 0,
    },
  })
}

// ---------------------------------------------------------------------------
// Assign waiter to order (Phase 3 waiter workflow)
// ---------------------------------------------------------------------------

const NON_TERMINAL_STATUSES_ORDER = ['pending', 'preparing', 'ready', 'awaiting_payment'] as const

/**
 * Assigns or updates the waiter for an order. Only allowed for non-terminal orders (pending, preparing, ready, awaiting_payment).
 * Manager or admin may assign any waiter; assigned waiter may reassign to themselves; others cannot change assignment.
 */
export async function assignWaiterToOrder(params: {
  orderId: string
  waiterId: string
  staffId: string
}): Promise<void> {
  const { orderId, waiterId, staffId } = params
  await assertStaffRole(staffId, ['cashier', 'manager', 'admin', 'kitchen'])
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, assignedWaiterId: true },
  })
  if (!order) throw new OrderNotFoundError(orderId)
  if (!NON_TERMINAL_STATUSES_ORDER.includes(order.status as (typeof NON_TERMINAL_STATUSES_ORDER)[number])) {
    throw new OrderNotEditableError(orderId, order.status)
  }
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { id: true, role: true },
  })
  const isManagerOrAdmin = staff?.role === 'manager' || staff?.role === 'admin'
  const isCurrentWaiter = order.assignedWaiterId === staffId
  if (!isManagerOrAdmin && !isCurrentWaiter) {
    throw new UnauthorizedWaiterActionError(
      orderId,
      'Only manager/admin or the current assigned waiter can change assignment'
    )
  }
  await prisma.order.update({
    where: { id: orderId },
    data: { assignedWaiterId: waiterId || null, updatedByStaffId: staffId },
  })
}

// ---------------------------------------------------------------------------
// Add item to order
// ---------------------------------------------------------------------------

export type AddItemToOrderParams = {
  orderId: string
  productId: string
  quantity: number
  size?: string | null
  modifier?: string | null
  notes?: string | null
}

/**
 * Adds an item to an order. Order must exist and be pending or preparing;
 * product must be active. Computes subtotal from product price × quantity,
 * inserts OrderItem, recalculates and updates order totalUgx.
 * All DB logic is in order-items; this is the domain entry point.
 */
export async function addItemToOrder(params: AddItemToOrderParams): Promise<void> {
  await addOrderItem({
    orderId: params.orderId,
    productId: params.productId,
    quantity: params.quantity,
    size: params.size ?? null,
    modifier: params.modifier ?? null,
    notes: params.notes ?? null,
  })
}

// ---------------------------------------------------------------------------
// Update and remove order item
// ---------------------------------------------------------------------------

/**
 * Updates an order item's quantity. Order item must exist; parent order must be pending or preparing; quantity >= 1.
 * Recalculates item subtotal (product price × quantity) and order totals. All DB in order-items.
 * Returns orderId for the updated order.
 */
export async function updateOrderItemQuantity(params: {
  orderItemId: string
  quantity: number
}): Promise<string> {
  const { orderItemId, quantity } = params
  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    select: { orderId: true },
  })
  if (!item) {
    throw new OrderItemNotFoundError(orderItemId)
  }
  await updateOrderItemQuantityInOrderItems({
    orderId: item.orderId,
    orderItemId,
    quantity,
  })
  return item.orderId
}

/**
 * Removes an order item. Order item must exist; parent order must be pending or preparing.
 * Deletes the item and recalculates order totals. All DB in order-items.
 * Returns orderId for the updated order.
 */
export async function removeOrderItem(params: { orderItemId: string }): Promise<string> {
  const { orderItemId } = params
  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    select: { orderId: true },
  })
  if (!item) {
    throw new OrderItemNotFoundError(orderItemId)
  }
  await removeOrderItemInOrderItems({
    orderId: item.orderId,
    orderItemId,
  })
  return item.orderId
}

// ---------------------------------------------------------------------------
// Canonical payment finalization (single source of truth)
// ---------------------------------------------------------------------------

/** Payment allowed only after kitchen has marked order ready (enforces kitchen readiness before payment). */
const PAYMENT_READY_STATUSES = ['ready', 'awaiting_payment'] as const

export class PaymentInsufficientError extends Error {
  readonly code = 'PAYMENT_INSUFFICIENT' as const
  constructor(public readonly amountUgx: number, public readonly orderTotalUgx: number) {
    super(`Cash received (${amountUgx}) must be >= order total (${orderTotalUgx})`)
    this.name = 'PaymentInsufficientError'
    Object.setPrototypeOf(this, PaymentInsufficientError.prototype)
  }
}

/** Thrown when order is already fully paid or served; no additional payments allowed. */
export class DuplicatePaymentError extends Error {
  readonly code = 'DUPLICATE_PAYMENT' as const
  constructor(public readonly orderId: string, reason: string) {
    super(`Duplicate payment rejected: ${reason} (order ${orderId})`)
    this.name = 'DuplicatePaymentError'
    Object.setPrototypeOf(this, DuplicatePaymentError.prototype)
  }
}

/** Thrown when payment is attempted for a cancelled order. */
export class PaymentOrderCancelledError extends Error {
  readonly code = 'PAYMENT_ORDER_CANCELLED' as const
  constructor(public readonly orderId: string) {
    super(`Order is cancelled; payments cannot be recorded: ${orderId}`)
    this.name = 'PaymentOrderCancelledError'
    Object.setPrototypeOf(this, PaymentOrderCancelledError.prototype)
  }
}

/** Thrown when cash received is zero or negative. */
export class PaymentZeroAmountError extends Error {
  readonly code = 'PAYMENT_ZERO_AMOUNT' as const
  constructor() {
    super('Payment amount must be greater than zero')
    this.name = 'PaymentZeroAmountError'
    Object.setPrototypeOf(this, PaymentZeroAmountError.prototype)
  }
}

/** Thrown when external payment amount does not match order total (exact match required). */
export class ExternalPaymentAmountMismatchError extends Error {
  readonly code = 'EXTERNAL_PAYMENT_AMOUNT_MISMATCH' as const
  constructor(public readonly orderId: string, public readonly expectedUgx: number, public readonly receivedUgx: number) {
    super(`External payment amount ${receivedUgx} does not match order total ${expectedUgx} (order ${orderId})`)
    this.name = 'ExternalPaymentAmountMismatchError'
    Object.setPrototypeOf(this, ExternalPaymentAmountMismatchError.prototype)
  }
}

export class OrderHasNoItemsError extends Error {
  readonly code = 'ORDER_HAS_NO_ITEMS' as const
  constructor(public readonly orderId: string) {
    super(`Order has no items; cannot process payment: ${orderId}`)
    this.name = 'OrderHasNoItemsError'
    Object.setPrototypeOf(this, OrderHasNoItemsError.prototype)
  }
}

/** Thrown when only the assigned waiter (or manager/admin) may perform the action (e.g. mark order as served). */
export class UnauthorizedWaiterActionError extends Error {
  readonly code = 'UNAUTHORIZED_WAITER_ACTION' as const
  constructor(public readonly orderId: string, public readonly message: string) {
    super(message)
    this.name = 'UnauthorizedWaiterActionError'
    Object.setPrototypeOf(this, UnauthorizedWaiterActionError.prototype)
  }
}

/** Thrown when order is served or cancelled and no longer editable (items, assignment, etc.). */
export class OrderNotEditableError extends Error {
  readonly code = 'ORDER_NOT_EDITABLE' as const
  constructor(public readonly orderId: string, public readonly status: string) {
    super(`Order is ${status}; cannot edit (order ${orderId})`)
    this.name = 'OrderNotEditableError'
    Object.setPrototypeOf(this, OrderNotEditableError.prototype)
  }
}

/** Thrown when payment is attempted before kitchen has marked order ready (status must be ready or awaiting_payment). */
export class OrderNotReadyForPaymentError extends Error {
  readonly code = 'ORDER_NOT_READY_FOR_PAYMENT' as const
  constructor(public readonly orderId: string, public readonly status: string) {
    super(
      `Order must be ready or awaiting_payment before payment; current status: ${status}. Kitchen must mark order ready first. (order ${orderId})`
    )
    this.name = 'OrderNotReadyForPaymentError'
    Object.setPrototypeOf(this, OrderNotReadyForPaymentError.prototype)
  }
}

/**
 * Sum of completed payment amounts for an order (within transaction).
 */
async function getCompletedPaymentSum(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  orderId: string
): Promise<number> {
  const r = await tx.payment.aggregate({
    where: { orderId, status: 'completed' },
    _sum: { amountUgx: true },
  })
  return r._sum.amountUgx != null ? Number(r._sum.amountUgx) : 0
}

/**
 * CANONICAL PAYMENT FINALIZATION FUNCTION
 *
 * This is the ONLY function that sets order.status = 'served'.
 * All payment flows (cash, momo, external) must call this function.
 *
 * Runs inside a Prisma transaction provided by caller.
 *
 * Behavior:
 * 1. Idempotency: if externalReference provided and payment exists, return early.
 * 2. Load order; reject if not found, cancelled, or served.
 * 3. Reject if order already has completed payments covering full total (duplicate).
 * 4. Validate payment amount >= order total; for cash, changeUgx = amountReceived - total (stored).
 * 5. Create Payment record (status: completed); then set order to 'served'.
 *
 * Does NOT release table (caller's responsibility after transaction).
 */
async function finalizePayment(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  params: {
    orderId: string
    amountUgx: number
    method: import('@prisma/client').PaymentMethod
    staffId: string
    terminalId?: string | null
    externalReference?: string
    changeUgx?: number
  }
): Promise<void> {
  const { orderId, amountUgx, method, staffId, terminalId, externalReference, changeUgx } = params

  // Idempotency: if externalReference provided and payment already exists, return early (no duplicate)
  if (externalReference) {
    const existingPayment = await tx.payment.findUnique({
      where: { externalReference },
      select: { id: true, orderId: true },
    })
    if (existingPayment) {
      return
    }
  }

  // Load order with items and shift inside transaction to prevent race conditions
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      totalUgx: true,
      shiftId: true,
      assignedWaiterId: true,
      shift: { select: { endTime: true } },
      orderItems: { select: { lineTotalUgx: true } },
    },
  })
  if (!order) {
    throw new OrderNotFoundError(orderId)
  }
  if (order.shift.endTime !== null) {
    throw new ShiftAlreadyClosedError(order.shiftId)
  }

  // Reject payments for cancelled or served orders (payment integrity)
  if (order.status === 'cancelled') {
    throw new PaymentOrderCancelledError(orderId)
  }
  if (order.status === 'served') {
    throw new DuplicatePaymentError(orderId, 'order already served')
  }

  // Waiter workflow: only assigned waiter (or manager/admin) may finalize payment and mark as served. System (e.g. webhook) may bypass.
  if (staffId !== 'system' && order.assignedWaiterId != null && order.assignedWaiterId !== '') {
    const staff = await tx.staff.findUnique({
      where: { id: staffId },
      select: { id: true, role: true },
    })
    const isAssignedWaiter = staff?.id === order.assignedWaiterId
    const isManagerOrAdmin = staff?.role === 'manager' || staff?.role === 'admin'
    if (!isAssignedWaiter && !isManagerOrAdmin) {
      throw new UnauthorizedWaiterActionError(
        orderId,
        `Only the assigned waiter or manager/admin can mark this order as served`
      )
    }
  }

  // Prevent payment for orders with zero items
  if (!order.orderItems || order.orderItems.length === 0) {
    throw new OrderHasNoItemsError(orderId)
  }

  // Recalculate order total from items (hardening: ensure correct total before payment)
  const summedTotal = order.orderItems.reduce((s, i) => s + Number(i.lineTotalUgx), 0)
  const storedTotal = Number(order.totalUgx)
  if (Math.abs(summedTotal - storedTotal) > 0.01) {
    await tx.order.update({
      where: { id: orderId },
      data: { totalUgx: new Decimal(summedTotal) },
    })
  }
  const totalUgx = summedTotal

  // Reject if order already has a completed payment covering the full amount (duplicate)
  const existingPaid = await getCompletedPaymentSum(tx, orderId)
  if (existingPaid >= totalUgx) {
    throw new DuplicatePaymentError(orderId, 'order already fully paid')
  }

  // Enforce kitchen readiness before payment: only ready or awaiting_payment may accept payment
  if (!PAYMENT_READY_STATUSES.includes(order.status as (typeof PAYMENT_READY_STATUSES)[number])) {
    throw new OrderNotReadyForPaymentError(orderId, order.status)
  }

  // Validate payment amount
  if (amountUgx < totalUgx) {
    throw new PaymentInsufficientError(amountUgx, totalUgx)
  }

  // Create payment record (audit: method, amountUgx, changeUgx when cash, externalReference when external, staffId, terminalId, createdAt)
  await tx.payment.create({
    data: {
      orderId,
      amountUgx: new Decimal(amountUgx),
      changeUgx: changeUgx != null ? new Decimal(changeUgx) : undefined,
      method,
      status: 'completed',
      externalReference: externalReference ?? undefined,
      createdByStaffId: staffId,
      terminalId: terminalId ?? undefined,
    },
  })

  // CRITICAL: This is the ONLY place that sets order.status = 'served'
  await tx.order.update({
    where: { id: orderId },
    data: { status: 'served', servedAt: new Date() },
  })
}

/**
 * Records full cash payment and marks order as served.
 * - amountReceivedUgx must be >= order total (rejects underpayment with PaymentInsufficientError).
 * - Rejects zero or negative amount with PaymentZeroAmountError.
 * - changeUgx = amountReceivedUgx - order total (stored on payment record; must be >= 0).
 * - Order must not be served or cancelled; no duplicate payments (DuplicatePaymentError).
 * Creates one Payment (cash, completed) with amountUgx = order total and changeUgx; updates order to served; releases table if dine-in.
 * Requires role: cashier, manager, or admin.
 * Returns orderId.
 */
export async function payOrderCash(params: {
  orderId: string
  amountReceivedUgx: number
  staffId: string
  terminalId?: string | null
}): Promise<string> {
  const { orderId, amountReceivedUgx, staffId, terminalId } = params

  if (amountReceivedUgx <= 0) {
    throw new PaymentZeroAmountError()
  }

  await assertStaffRole(staffId, [...PAYMENT_ROLES])

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { totalUgx: true, orderItems: { select: { lineTotalUgx: true } } },
    })
    if (!order) throw new OrderNotFoundError(orderId)
    const totalUgx = order.orderItems?.length
      ? order.orderItems.reduce((s, i) => s + Number(i.lineTotalUgx), 0)
      : Number(order.totalUgx)
    if (amountReceivedUgx < totalUgx) {
      throw new PaymentInsufficientError(amountReceivedUgx, totalUgx)
    }
    const changeUgx = amountReceivedUgx - totalUgx
    if (changeUgx < 0) {
      throw new PaymentInsufficientError(amountReceivedUgx, totalUgx)
    }
    await finalizePayment(tx, {
      orderId,
      amountUgx: totalUgx,
      method: 'cash',
      staffId,
      terminalId: terminalId ?? undefined,
      changeUgx,
    })
  })

  await releaseTableForOrder(orderId)
  return orderId
}

// ---------------------------------------------------------------------------
// Pay order with Mobile Money (MoMo) and complete
// ---------------------------------------------------------------------------

/**
 * Records full Mobile Money payment and marks order as served.
 * Same rules as payOrderCash: order must not be served or cancelled; amountUgx must be >= order total.
 * Rejects zero amount. No duplicate payments (finalizePayment enforces).
 * Creates one Payment (momo, completed), updates order to served, releases table if dine-in.
 * Requires role: cashier, manager, or admin.
 * Returns orderId.
 */
export async function payOrderMomo(params: {
  orderId: string
  amountUgx: number
  staffId: string
  terminalId?: string | null
}): Promise<string> {
  const { orderId, amountUgx, staffId, terminalId } = params

  if (amountUgx <= 0) {
    throw new PaymentZeroAmountError()
  }

  await assertStaffRole(staffId, [...PAYMENT_ROLES])

  await prisma.$transaction(async (tx) => {
    await finalizePayment(tx, {
      orderId,
      amountUgx,
      method: 'mtn_momo',
      staffId,
      terminalId: terminalId ?? undefined,
    })
  })

  await releaseTableForOrder(orderId)
  return orderId
}

// ---------------------------------------------------------------------------
// Pesapal payment session (create payment URL; no DB change)
// ---------------------------------------------------------------------------

function getPesapalConfig() {
  const { pesapal } = config
  const baseUrl = pesapal.baseUrl
  const consumerKey = pesapal.consumerKey
  const consumerSecret = pesapal.consumerSecret
  const ipnId = pesapal.ipnId
  if (!baseUrl || !consumerKey || !consumerSecret || !ipnId) {
    throw new Error(
      'Pesapal config missing: set PESAPAL_BASE_URL, PESAPAL_CONSUMER_KEY, PESAPAL_CONSUMER_SECRET, PESAPAL_IPN_ID'
    )
  }
  return { baseUrl: baseUrl.replace(/\/$/, ''), consumerKey, consumerSecret, ipnId }
}

async function getPesapalBearerToken(baseUrl: string, consumerKey: string, consumerSecret: string): Promise<string> {
  const res = await fetch(`${baseUrl}/Auth/RequestToken`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ consumer_key: consumerKey, consumer_secret: consumerSecret }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Pesapal auth failed: ${res.status} ${text}`)
  }
  const data = (await res.json()) as { token?: string; error?: unknown; status?: string }
  if (data.error || !data.token) {
    throw new Error(`Pesapal auth error: ${JSON.stringify(data.error ?? 'no token')}`)
  }
  return data.token
}

async function submitPesapalOrder(params: {
  baseUrl: string
  bearerToken: string
  notificationId: string
  orderId: string
  amountUgx: number
  callbackUrl: string
}): Promise<string> {
  const { baseUrl, bearerToken, notificationId, orderId, amountUgx, callbackUrl } = params
  const body = {
    id: orderId,
    currency: 'UGX',
    amount: Number(amountUgx),
    description: `Order ${orderId.slice(0, 8)}`,
    callback_url: callbackUrl,
    notification_id: notificationId,
    billing_address: {
      email_address: 'pos@merchant.local',
      phone_number: '0000000000',
      country_code: 'UG',
      first_name: '',
      middle_name: '',
      last_name: '',
      line_1: '',
      line_2: '',
      city: '',
      state: '',
      postal_code: '',
      zip_code: '',
    },
  }
  const res = await fetch(`${baseUrl}/Transactions/SubmitOrderRequest`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Pesapal SubmitOrderRequest failed: ${res.status} ${text}`)
  }
  const data = (await res.json()) as { redirect_url?: string; error?: unknown }
  if (data.error || !data.redirect_url) {
    throw new Error(`Pesapal SubmitOrderRequest error: ${JSON.stringify(data.error ?? 'no redirect_url')}`)
  }
  return data.redirect_url
}

/**
 * Creates a Pesapal payment session for an order.
 * Rejects if order is already served or already fully paid (duplicate session prevention).
 * Loads order, ensures payable status, calls Pesapal to create a payment request, returns the payment URL.
 * Does not change the database or order status. Payment is finalized later via webhook.
 */
export async function createPesapalPaymentSession(params: {
  orderId: string
  appBaseUrl: string
}): Promise<{ paymentUrl: string }> {
  const { orderId, appBaseUrl } = params

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, totalUgx: true, shiftId: true, shift: { select: { endTime: true } } },
  })
  if (!order) {
    throw new OrderNotFoundError(orderId)
  }
  if (order.status === 'cancelled') {
    throw new PaymentOrderCancelledError(orderId)
  }
  if (order.status === 'served') {
    throw new DuplicatePaymentError(orderId, 'order already served')
  }
  if (order.shift.endTime !== null) {
    throw new ShiftAlreadyClosedError(order.shiftId)
  }
  if (!PAYMENT_READY_STATUSES.includes(order.status as (typeof PAYMENT_READY_STATUSES)[number])) {
    throw new OrderNotReadyForPaymentError(orderId, order.status)
  }
  const totalUgx = Number(order.totalUgx)
  const completedSum = await prisma.payment.aggregate({
    where: { orderId, status: 'completed' },
    _sum: { amountUgx: true },
  })
  const totalPaid = completedSum._sum.amountUgx != null ? Number(completedSum._sum.amountUgx) : 0
  if (totalPaid >= totalUgx) {
    throw new DuplicatePaymentError(orderId, 'order already fully paid')
  }

  const { baseUrl, consumerKey, consumerSecret, ipnId } = getPesapalConfig()
  const base = (config.pesapal.callbackUrl || appBaseUrl || config.appBaseUrl).replace(/\/$/, '')
  const callbackUrl = `${base}/pos/orders/${orderId}/payment-callback`

  const bearerToken = await getPesapalBearerToken(baseUrl, consumerKey, consumerSecret)
  const paymentUrl = await submitPesapalOrder({
    baseUrl,
    bearerToken,
    notificationId: ipnId,
    orderId,
    amountUgx: totalUgx,
    callbackUrl,
  })

  return { paymentUrl }
}

// ---------------------------------------------------------------------------
// Record external payment (gateway-agnostic: e.g. Pesapal webhook)
// ---------------------------------------------------------------------------

const EXTERNAL_PAYMENT_METHODS = ['card', 'mtn_momo', 'airtel_money'] as const
export type ExternalPaymentMethod = (typeof EXTERNAL_PAYMENT_METHODS)[number]

/**
 * Finalizes an order using an external payment provider (e.g. Pesapal webhook).
 * - Order must exist and be in payable state (ready or awaiting_payment); rejects if served or cancelled.
 * - amountUgx must exactly match order total (external payments require full amount in one transaction).
 * - Idempotent: same externalReference twice does not duplicate payment.
 * In a single transaction: create Payment (method, completed), set order to served.
 * After transaction: release table for dine-in orders.
 * Returns orderId. Does not call any external APIs.
 */
export async function recordExternalPayment(params: {
  orderId: string
  amountUgx: number
  method: ExternalPaymentMethod
  staffId: string
  externalReference: string
}): Promise<string> {
  const { orderId, amountUgx, method, staffId, externalReference } = params

  if (amountUgx <= 0) {
    throw new PaymentZeroAmountError()
  }

  // Role check: skip for 'system' (webhook - already authenticated via HMAC)
  if (staffId !== 'system') {
    await assertStaffRole(staffId, [...PAYMENT_ROLES])
  }

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { totalUgx: true, status: true, orderItems: { select: { lineTotalUgx: true } } },
    })
    if (!order) throw new OrderNotFoundError(orderId)
    const totalUgx = order.orderItems?.length
      ? order.orderItems.reduce((s, i) => s + Number(i.lineTotalUgx), 0)
      : Number(order.totalUgx)
    if (amountUgx !== totalUgx) {
      throw new ExternalPaymentAmountMismatchError(orderId, totalUgx, amountUgx)
    }
    await finalizePayment(tx, {
      orderId,
      amountUgx,
      method,
      staffId,
      externalReference,
    })
  })

  await releaseTableForOrder(orderId)
  return orderId
}

// ---------------------------------------------------------------------------
// Waiter workflow: who can mark order as served
// ---------------------------------------------------------------------------

/**
 * Asserts that the given staff can mark the order as served (e.g. for checkout).
 * If the order has an assigned waiter, only that waiter or a manager/admin may proceed.
 * Throws UnauthorizedWaiterActionError otherwise. Use before setOrderStatus(..., 'served') or checkout.
 */
export async function assertCanMarkOrderServed(orderId: string, staffId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, assignedWaiterId: true },
  })
  if (!order) throw new OrderNotFoundError(orderId)
  if (order.assignedWaiterId == null || order.assignedWaiterId === '') {
    return
  }
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { id: true, role: true },
  })
  const isAssignedWaiter = staff?.id === order.assignedWaiterId
  const isManagerOrAdmin = staff?.role === 'manager' || staff?.role === 'admin'
  if (!isAssignedWaiter && !isManagerOrAdmin) {
    throw new UnauthorizedWaiterActionError(
      orderId,
      'Only the assigned waiter or manager/admin can mark this order as served'
    )
  }
}

// ---------------------------------------------------------------------------
// Order receipt (read-only)
// ---------------------------------------------------------------------------

export type OrderReceiptItem = {
  name: string
  imageUrl: string | null
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
              images: true,
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
    imageUrl: item.product?.images?.[0] ?? null,
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

// ---------------------------------------------------------------------------
// Kitchen queue (read-only)
// ---------------------------------------------------------------------------

export type KitchenQueueItem = {
  name: string
  imageUrl: string | null
  quantity: number
}

export type KitchenQueueOrder = {
  orderId: string
  tableLabel: string | null
  customerName: string | null
  items: KitchenQueueItem[]
  status: string
  createdAt: Date
}

/**
 * Loads kitchen queue: all pending and preparing orders from any active shift
 * (shift where endTime is null). So the kitchen display shows all current orders
 * regardless of which cashier/terminal created them.
 * Sorted by creation time (oldest first).
 * Read-only, no side effects.
 */
export async function getKitchenQueueFromAllActiveShifts(): Promise<KitchenQueueOrder[]> {
  const orders = await prisma.order.findMany({
    where: {
      status: { in: ['pending', 'preparing'] },
      shift: { endTime: null },
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
      customerName: true,
      orderNumber: true,
      table: {
        select: { code: true },
      },
      orderItems: {
        select: {
          quantity: true,
          product: {
            select: { name: true, images: true },
          },
        },
        orderBy: { sortOrder: 'asc' as const },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return orders.map((order) => ({
    orderId: order.id,
    tableLabel: order.table?.code ?? null,
    customerName: order.customerName ?? order.orderNumber,
    items: order.orderItems.map((item) => ({
      name: item.product.name,
      imageUrl: item.product?.images?.[0] ?? null,
      quantity: item.quantity,
    })),
    status: order.status,
    createdAt: order.createdAt,
  }))
}

/**
 * Loads kitchen queue: all pending and preparing orders for a given shift.
 * Prefer getKitchenQueueFromAllActiveShifts() so kitchen sees all orders.
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
      orderNumber: true,
      table: {
        select: {
          code: true,
        },
      },
      customerName: true,
      orderItems: {
        select: {
          quantity: true,
          product: {
            select: {
              name: true,
              images: true,
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
    customerName: order.customerName ?? order.orderNumber,
    items: order.orderItems.map((item) => ({
      name: item.product.name,
      imageUrl: item.product?.images?.[0] ?? null,
      quantity: item.quantity,
    })),
    status: order.status,
    createdAt: order.createdAt,
  }))
}

// ---------------------------------------------------------------------------
// Kitchen status transitions
// ---------------------------------------------------------------------------

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
 * When marking ready, order transitions to awaiting_payment (NOT served).
 * Kitchen CANNOT mark orders as served - only payment finalization can do that.
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

  // When kitchen marks "ready", transition to "awaiting_payment" (NOT served)
  // Payment finalization is the ONLY mechanism that can set status to "served"
  const targetStatus = newStatus === 'ready' ? 'awaiting_payment' : newStatus

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: targetStatus,
      updatedByStaffId: staffId,
    },
  })

  return orderId
}
