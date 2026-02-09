/**
 * Domain: dine-in order creation and add item to order.
 * Uses Prisma only in order-items; this module orchestrates.
 */

import { prisma } from '@/lib/db'
import type { Order } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { getActiveShift } from '@/lib/staff-session'
import { releaseTableForOrder } from '@/lib/table-lifecycle'
import { OrderNotFoundError, InvalidOrderStatusTransitionError } from '@/lib/order-status'
import {
  addOrderItem,
  OrderItemNotFoundError,
  updateOrderItemQuantity as updateOrderItemQuantityInOrderItems,
  removeOrderItem as removeOrderItemInOrderItems,
} from '@/lib/order-items'

/**
 * Creates a dine-in order for the staff's active shift.
 * Generates order number on the server (max order number for that shift + 1).
 * @throws NoActiveShiftError if staff has no active shift
 */
export async function createDineInOrder(params: {
  tableId: string
  createdByStaffId: string
}): Promise<Order> {
  const { tableId, createdByStaffId } = params

  const shift = await getActiveShift(createdByStaffId)

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
  const orderNumber = `${prefix}${nextSeq}`

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
// Pay order with cash and complete
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

/**
 * Records full cash payment and marks order as served.
 * Order must exist and status be pending, preparing, or ready.
 * amountUgx must be >= order.totalUgx. Creates one Payment (cash, completed), updates order to served, releases table if dine-in.
 * Returns orderId.
 */
export async function payOrderCash(params: {
  orderId: string
  amountUgx: number
  staffId: string
}): Promise<string> {
  const { orderId, amountUgx, staffId } = params

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, totalUgx: true },
    })
    if (!order) {
      throw new OrderNotFoundError(orderId)
    }
    if (!PAYABLE_STATUSES.includes(order.status as (typeof PAYABLE_STATUSES)[number])) {
      throw new InvalidOrderStatusTransitionError(orderId, order.status as import('@prisma/client').OrderStatus, 'served')
    }
    const totalUgx = Number(order.totalUgx)
    if (amountUgx < totalUgx) {
      throw new PaymentInsufficientError(amountUgx, totalUgx)
    }

    await tx.payment.create({
      data: {
        orderId,
        amountUgx: new Decimal(amountUgx),
        method: 'cash',
        status: 'completed',
        createdByStaffId: staffId,
      },
    })

    await tx.order.update({
      where: { id: orderId },
      data: { status: 'served' },
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
 * Returns orderId.
 */
export async function payOrderMomo(params: {
  orderId: string
  amountUgx: number
  staffId: string
}): Promise<string> {
  const { orderId, amountUgx, staffId } = params

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, totalUgx: true },
    })
    if (!order) {
      throw new OrderNotFoundError(orderId)
    }
    if (!PAYABLE_STATUSES.includes(order.status as (typeof PAYABLE_STATUSES)[number])) {
      throw new InvalidOrderStatusTransitionError(orderId, order.status as import('@prisma/client').OrderStatus, 'served')
    }
    const totalUgx = Number(order.totalUgx)
    if (amountUgx < totalUgx) {
      throw new PaymentInsufficientError(amountUgx, totalUgx)
    }

    await tx.payment.create({
      data: {
        orderId,
        amountUgx: new Decimal(amountUgx),
        method: 'mtn_momo',
        status: 'completed',
        createdByStaffId: staffId,
      },
    })

    await tx.order.update({
      where: { id: orderId },
      data: { status: 'served' },
    })
  })

  await releaseTableForOrder(orderId)
  return orderId
}

// ---------------------------------------------------------------------------
// Pesapal payment session (create payment URL; no DB change)
// ---------------------------------------------------------------------------

function getPesapalConfig() {
  const baseUrl = process.env.PESAPAL_BASE_URL
  const consumerKey = process.env.PESAPAL_CONSUMER_KEY
  const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET
  const ipnId = process.env.PESAPAL_IPN_ID
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
    select: { id: true, status: true, totalUgx: true },
  })
  if (!order) {
    throw new OrderNotFoundError(orderId)
  }
  if (!PAYABLE_STATUSES.includes(order.status as (typeof PAYABLE_STATUSES)[number])) {
    throw new InvalidOrderStatusTransitionError(orderId, order.status as import('@prisma/client').OrderStatus, 'served')
  }
  const totalUgx = Number(order.totalUgx)

  const { baseUrl, consumerKey, consumerSecret, ipnId } = getPesapalConfig()
  const base = appBaseUrl.replace(/\/$/, '')
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
 */
export async function recordExternalPayment(params: {
  orderId: string
  amountUgx: number
  method: ExternalPaymentMethod
  staffId: string
}): Promise<string> {
  const { orderId, amountUgx, method, staffId } = params

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, totalUgx: true },
    })
    if (!order) {
      throw new OrderNotFoundError(orderId)
    }
    if (!PAYABLE_STATUSES.includes(order.status as (typeof PAYABLE_STATUSES)[number])) {
      throw new InvalidOrderStatusTransitionError(orderId, order.status as import('@prisma/client').OrderStatus, 'served')
    }
    const totalUgx = Number(order.totalUgx)
    if (amountUgx < totalUgx) {
      throw new PaymentInsufficientError(amountUgx, totalUgx)
    }

    await tx.payment.create({
      data: {
        orderId,
        amountUgx: new Decimal(amountUgx),
        method,
        status: 'completed',
        createdByStaffId: staffId,
      },
    })

    await tx.order.update({
      where: { id: orderId },
      data: { status: 'served' },
    })
  })

  await releaseTableForOrder(orderId)
  return orderId
}
