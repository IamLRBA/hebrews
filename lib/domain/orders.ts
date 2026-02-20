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
}): Promise<Order> {
  const { tableId, createdByStaffId, orderNumber: customOrderNumber } = params

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
      terminalId: shift.terminalId,
      status: 'pending',
      subtotalUgx: 0,
      taxUgx: 0,
      totalUgx: 0,
    },
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

const PAYABLE_STATUSES = ['pending', 'preparing', 'ready'] as const

export class PaymentInsufficientError extends Error {
  readonly code = 'PAYMENT_INSUFFICIENT' as const
  constructor(public readonly amountUgx: number, public readonly orderTotalUgx: number) {
    super(`Cash received (${amountUgx}) must be >= order total (${orderTotalUgx})`)
    this.name = 'PaymentInsufficientError'
    Object.setPrototypeOf(this, PaymentInsufficientError.prototype)
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

/**
 * CANONICAL PAYMENT FINALIZATION FUNCTION
 * 
 * This is the ONLY function that sets order.status = 'served'.
 * All payment flows (cash, momo, external) must call this function.
 * 
 * Runs inside a Prisma transaction provided by caller.
 * 
 * Behavior:
 * 1. Loads order
 * 2. Validates order exists
 * 3. Validates order status is payable (pending/preparing/ready)
 * 4. Validates payment amount >= order total
 * 5. If externalReference provided: checks for idempotency (returns early if duplicate)
 * 6. Creates Payment record (status: completed)
 * 7. Updates order status to 'served'
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
    externalReference?: string
  }
): Promise<void> {
  const { orderId, amountUgx, method, staffId, externalReference } = params

  // Idempotency check: if externalReference provided and payment already exists, return early
  if (externalReference) {
    const existingPayment = await tx.payment.findUnique({
      where: { externalReference },
      select: { id: true, orderId: true },
    })
    if (existingPayment) {
      // Payment already recorded; idempotent success
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

  // Validate order status is payable
  if (!PAYABLE_STATUSES.includes(order.status as (typeof PAYABLE_STATUSES)[number])) {
    // Order already processed (race condition protection)
    return
  }

  // Validate payment amount
  if (amountUgx < totalUgx) {
    throw new PaymentInsufficientError(amountUgx, totalUgx)
  }

  // Create payment record
  await tx.payment.create({
    data: {
      orderId,
      amountUgx: new Decimal(amountUgx),
      method,
      status: 'completed',
      externalReference: externalReference ?? undefined,
      createdByStaffId: staffId,
    },
  })

  // CRITICAL: This is the ONLY place that sets order.status = 'served'
  await tx.order.update({
    where: { id: orderId },
    data: { status: 'served' },
  })
}

/**
 * Records full cash payment and marks order as served.
 * Order must exist and status be pending, preparing, or ready.
 * amountUgx must be >= order.totalUgx. Creates one Payment (cash, completed), updates order to served, releases table if dine-in.
 * Requires role: cashier, manager, or admin.
 * Returns orderId.
 */
export async function payOrderCash(params: {
  orderId: string
  amountUgx: number
  staffId: string
}): Promise<string> {
  const { orderId, amountUgx, staffId } = params

  await assertStaffRole(staffId, [...PAYMENT_ROLES])

  await prisma.$transaction(async (tx) => {
    await finalizePayment(tx, {
      orderId,
      amountUgx,
      method: 'cash',
      staffId,
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
 * Same rules as payOrderCash: order must be pending, preparing, or ready;
 * amountUgx must be >= order.totalUgx. Creates one Payment (momo, completed), updates order to served, releases table if dine-in.
 * Requires role: cashier, manager, or admin.
 * Returns orderId.
 */
export async function payOrderMomo(params: {
  orderId: string
  amountUgx: number
  staffId: string
}): Promise<string> {
  const { orderId, amountUgx, staffId } = params

  await assertStaffRole(staffId, [...PAYMENT_ROLES])

  await prisma.$transaction(async (tx) => {
    await finalizePayment(tx, {
      orderId,
      amountUgx,
      method: 'mtn_momo',
      staffId,
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
 * Creates a Pesapal payment session for an order. Loads order, ensures payable status, calls Pesapal to create a payment request, returns the payment URL.
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
  if (order.shift.endTime !== null) {
    throw new ShiftAlreadyClosedError(order.shiftId)
  }
  if (!PAYABLE_STATUSES.includes(order.status as (typeof PAYABLE_STATUSES)[number])) {
    throw new InvalidOrderStatusTransitionError(orderId, order.status as import('@prisma/client').OrderStatus, 'served')
  }
  const totalUgx = Number(order.totalUgx)

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
 * Finalizes an order using an external payment provider (e.g. Pesapal).
 * Order must exist and status be pending, preparing, or ready.
 * amountUgx must be >= order.totalUgx.
 * In a single transaction: create Payment (method, completed), set order to served.
 * After transaction: release table for dine-in orders.
 * Returns orderId. Does not call any external APIs.
 * IDEMPOTENT: If externalReference already exists, returns early without error.
 */
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

  await prisma.$transaction(async (tx) => {
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

  // When kitchen marks "ready", auto-transition to "served"
  const targetStatus = newStatus === 'ready' ? 'served' : newStatus

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: targetStatus,
      updatedByStaffId: staffId,
    },
  })

  return orderId
}
