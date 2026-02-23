/**
 * Offline order lifecycle: create order, add item, update status, pay cash.
 * All operations write to IndexedDB and enqueue for sync. No server calls.
 */

import { getShiftId } from '@/lib/pos-shift-store'
import { getStaffId } from '@/lib/pos-client'
import {
  putOrder,
  putOrderItem,
  putPayment,
  getOrderByLocalId,
  getOrderItemsByOrderLocalId,
  getPaymentsByOrderLocalId,
  getAllOrders,
  getSyncMetadata,
  putSyncMetadata,
  generateLocalId,
  META_ID,
  type OfflineOrder,
  type OfflineOrderItem,
  type OfflinePayment,
} from '@/lib/offline/db'
import {
  enqueueCreateOrder,
  enqueueAddItem,
  enqueueUpdateOrderStatus,
  enqueuePayCash,
  enqueuePayMomo,
  enqueuePayAirtel,
  type EnqueueCreateOrderPayload,
  type EnqueueAddItemPayload,
  type EnqueueUpdateStatusPayload,
  type EnqueuePayCashPayload,
} from '@/lib/offline/queue'

const ORDER_NUMBER_PREFIX = 'OFF-'
let offlineOrderSeq = 0

function nextOfflineOrderNumber(): string {
  offlineOrderSeq += 1
  return `${ORDER_NUMBER_PREFIX}${String(offlineOrderSeq).padStart(4, '0')}`
}

function now(): string {
  return new Date().toISOString()
}

/**
 * Create order offline (dine-in or takeaway). Persists to IndexedDB and enqueues for sync.
 */
export async function createOrderOffline(params: {
  orderType: 'dine_in' | 'takeaway'
  tableId?: string | null
  orderNumber?: string
}): Promise<OfflineOrder> {
  const shiftId = getShiftId()
  const staffId = getStaffId()
  if (!shiftId || !staffId) throw new Error('Shift and staff required')
  let terminalId = 'offline'
  if (typeof window !== 'undefined') {
    try {
      const { getTerminalId } = await import('@/lib/terminal/terminal')
      terminalId = await getTerminalId()
    } catch {
      // keep 'offline' if terminal identity unavailable
    }
  }
  const orderNumber = params.orderNumber ?? nextOfflineOrderNumber()
  const localId = generateLocalId()
  const clientRequestId = generateLocalId()

  const order: OfflineOrder = {
    localId,
    serverId: null,
    orderNumber,
    orderType: params.orderType,
    tableId: params.orderType === 'dine_in' ? (params.tableId ?? null) : null,
    shiftId,
    terminalId,
    createdByStaffId: staffId,
    assignedWaiterId: null,
    status: 'pending',
    subtotalUgx: 0,
    taxUgx: 0,
    totalUgx: 0,
    notes: null,
    customerName: null,
    customerPhone: null,
    createdAt: now(),
    updatedAt: now(),
    syncStatus: 'pending',
  }
  await putOrder(order)
  await enqueueCreateOrder(clientRequestId, {
    localId,
    orderType: params.orderType,
    tableId: params.tableId ?? null,
    shiftId,
    terminalId,
    createdByStaffId: staffId,
    orderNumber,
  })
  return order
}

/**
 * Add item to an offline order. Updates order total; enqueues for sync.
 */
export async function addItemOffline(params: {
  orderLocalId: string
  productId: string
  productName: string
  quantity: number
  unitPriceUgx: number
  size?: string | null
  modifier?: string | null
  notes?: string | null
  sortOrder?: number
}): Promise<OfflineOrderItem> {
  const order = await getOrderByLocalId(params.orderLocalId)
  if (!order) throw new Error('Order not found')
  if (order.status === 'served' || order.isOfflineServed) throw new Error('Order already served')
  const lineTotalUgx = params.unitPriceUgx * params.quantity
  const itemLocalId = generateLocalId()
  const clientRequestId = generateLocalId()
  const item: OfflineOrderItem = {
    localId: itemLocalId,
    serverId: null,
    orderLocalId: params.orderLocalId,
    orderServerId: order.serverId,
    productId: params.productId,
    productName: params.productName,
    quantity: params.quantity,
    unitPriceUgx: params.unitPriceUgx,
    lineTotalUgx,
    size: params.size ?? null,
    modifier: params.modifier ?? null,
    notes: params.notes ?? null,
    sortOrder: params.sortOrder ?? 0,
    createdAt: now(),
    updatedAt: now(),
    syncStatus: 'pending',
  }
  await putOrderItem(item)
  const items = await getOrderItemsByOrderLocalId(params.orderLocalId)
  const subtotalUgx = items.reduce((s, i) => s + i.lineTotalUgx, 0) + lineTotalUgx
  await putOrder({
    ...order,
    subtotalUgx,
    totalUgx: subtotalUgx,
    taxUgx: 0,
    updatedAt: now(),
  })
  await enqueueAddItem(clientRequestId, {
    orderLocalId: params.orderLocalId,
    orderServerId: order.serverId,
    productId: params.productId,
    productName: params.productName,
    quantity: params.quantity,
    unitPriceUgx: params.unitPriceUgx,
    size: params.size ?? null,
    modifier: params.modifier ?? null,
    notes: params.notes ?? null,
    sortOrder: params.sortOrder ?? 0,
  })
  return item
}

/**
 * Update kitchen status offline. Enqueues for sync.
 */
export async function updateOrderStatusOffline(params: {
  orderLocalId: string
  newStatus: string
}): Promise<void> {
  const order = await getOrderByLocalId(params.orderLocalId)
  if (!order) throw new Error('Order not found')
  const staffId = getStaffId()
  if (!staffId) throw new Error('Staff required')
  await putOrder({
    ...order,
    status: params.newStatus === 'ready' ? 'awaiting_payment' : params.newStatus,
    updatedAt: now(),
  })
  const clientRequestId = generateLocalId()
  await enqueueUpdateOrderStatus(clientRequestId, {
    orderLocalId: params.orderLocalId,
    orderServerId: order.serverId,
    newStatus: params.newStatus,
    staffId,
  })
}

/**
 * Record cash payment offline. Order becomes served (offline). No receipt/drawer. Enqueue for sync.
 */
export async function payCashOffline(params: {
  orderLocalId: string
  amountUgx: number
  changeUgx: number | null
}): Promise<OfflinePayment> {
  const order = await getOrderByLocalId(params.orderLocalId)
  if (!order) throw new Error('Order not found')
  if (order.isOfflineServed) throw new Error('Order already paid')
  const staffId = getStaffId()
  if (!staffId) throw new Error('Staff required')
  let terminalId: string | null = null
  if (typeof window !== 'undefined') {
    try {
      const { getTerminalId } = await import('@/lib/terminal/terminal')
      terminalId = await getTerminalId()
    } catch {
      // keep null if terminal identity unavailable
    }
  }
  const paymentLocalId = generateLocalId()
  const clientRequestId = generateLocalId()
  const payment: OfflinePayment = {
    localId: paymentLocalId,
    serverId: null,
    orderLocalId: params.orderLocalId,
    orderServerId: order.serverId,
    amountUgx: params.amountUgx,
    changeUgx: params.changeUgx,
    method: 'cash',
    createdByStaffId: staffId,
    terminalId,
    clientRequestId,
    createdAt: now(),
    syncStatus: 'pending',
  }
  await putPayment(payment)
  await putOrder({
    ...order,
    status: 'served',
    isOfflineServed: true,
    updatedAt: now(),
  })
  await enqueuePayCash(clientRequestId, {
    orderLocalId: params.orderLocalId,
    orderServerId: order.serverId,
    amountUgx: params.amountUgx,
    changeUgx: params.changeUgx,
    staffId,
    terminalId,
    paymentLocalId,
  })
  return payment
}

/**
 * Record MTN MoMo payment offline. Same flow as cash but method mtn_momo; no changeUgx. Enqueue for sync.
 */
export async function payMomoOffline(params: {
  orderLocalId: string
  amountUgx: number
}): Promise<OfflinePayment> {
  const order = await getOrderByLocalId(params.orderLocalId)
  if (!order) throw new Error('Order not found')
  if (order.isOfflineServed) throw new Error('Order already paid')
  const staffId = getStaffId()
  if (!staffId) throw new Error('Staff required')
  let terminalId: string | null = null
  if (typeof window !== 'undefined') {
    try {
      const { getTerminalId } = await import('@/lib/terminal/terminal')
      terminalId = await getTerminalId()
    } catch {
      // keep null if terminal identity unavailable
    }
  }
  const paymentLocalId = generateLocalId()
  const clientRequestId = generateLocalId()
  const payment: OfflinePayment = {
    localId: paymentLocalId,
    serverId: null,
    orderLocalId: params.orderLocalId,
    orderServerId: order.serverId,
    amountUgx: params.amountUgx,
    changeUgx: null,
    method: 'mtn_momo',
    createdByStaffId: staffId,
    terminalId,
    clientRequestId,
    createdAt: now(),
    syncStatus: 'pending',
  }
  await putPayment(payment)
  await putOrder({
    ...order,
    status: 'served',
    isOfflineServed: true,
    updatedAt: now(),
  })
  await enqueuePayMomo(clientRequestId, {
    orderLocalId: params.orderLocalId,
    orderServerId: order.serverId,
    amountUgx: params.amountUgx,
    staffId,
    terminalId,
    paymentLocalId,
  })
  return payment
}

/**
 * Record Airtel Money payment offline. Same flow as cash but method airtel_money; no changeUgx. Enqueue for sync.
 */
export async function payAirtelOffline(params: {
  orderLocalId: string
  amountUgx: number
}): Promise<OfflinePayment> {
  const order = await getOrderByLocalId(params.orderLocalId)
  if (!order) throw new Error('Order not found')
  if (order.isOfflineServed) throw new Error('Order already paid')
  const staffId = getStaffId()
  if (!staffId) throw new Error('Staff required')
  let terminalId: string | null = null
  if (typeof window !== 'undefined') {
    try {
      const { getTerminalId } = await import('@/lib/terminal/terminal')
      terminalId = await getTerminalId()
    } catch {
      // keep null if terminal identity unavailable
    }
  }
  const paymentLocalId = generateLocalId()
  const clientRequestId = generateLocalId()
  const payment: OfflinePayment = {
    localId: paymentLocalId,
    serverId: null,
    orderLocalId: params.orderLocalId,
    orderServerId: order.serverId,
    amountUgx: params.amountUgx,
    changeUgx: null,
    method: 'airtel_money',
    createdByStaffId: staffId,
    terminalId,
    clientRequestId,
    createdAt: now(),
    syncStatus: 'pending',
  }
  await putPayment(payment)
  await putOrder({
    ...order,
    status: 'served',
    isOfflineServed: true,
    updatedAt: now(),
  })
  await enqueuePayAirtel(clientRequestId, {
    orderLocalId: params.orderLocalId,
    orderServerId: order.serverId,
    amountUgx: params.amountUgx,
    staffId,
    terminalId,
    paymentLocalId,
  })
  return payment
}

/**
 * Get all orders for the current shift from local store (offline orders + synced orders we have locally).
 */
export async function getActiveOrdersOffline(): Promise<OfflineOrder[]> {
  const shiftId = getShiftId()
  if (!shiftId) return []
  const all = await getAllOrders()
  return all.filter(
    (o) =>
      o.shiftId === shiftId &&
      o.syncStatus !== 'synced' &&
      !o.isOfflineServed &&
      o.status !== 'cancelled'
  )
}

/**
 * Get order detail for one order (order + items + payments) from local store.
 */
export async function getOrderDetailOffline(orderLocalId: string): Promise<{
  order: OfflineOrder
  items: OfflineOrderItem[]
  payments: OfflinePayment[]
} | null> {
  const order = await getOrderByLocalId(orderLocalId)
  if (!order) return null
  const items = await getOrderItemsByOrderLocalId(orderLocalId)
  const payments = await getPaymentsByOrderLocalId(orderLocalId)
  return { order, items, payments }
}

/**
 * Same shape as API getOrderDetail for UI: orderId, orderNumber, status, totalUgx, items, etc.
 */
export async function getOrderDetailOfflineFormatted(orderLocalId: string): Promise<{
  orderId: string
  orderNumber: string
  orderType: string
  tableId: string | null
  tableCode: string | null
  status: string
  totalUgx: number
  createdAt: string
  items: Array<{
    id: string
    productId: string
    productName: string
    quantity: number
    size: string | null
    modifier: string | null
    notes: string | null
    subtotalUgx: number
    lineTotalUgx?: number
  }>
  payments: Array<{ method: string; amountUgx: number }>
} | null> {
  const raw = await getOrderDetailOffline(orderLocalId)
  if (!raw) return null
  const { order, items, payments } = raw
  return {
    orderId: order.localId,
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    tableId: order.tableId,
    tableCode: null,
    status: order.status,
    totalUgx: order.totalUgx,
    createdAt: order.createdAt,
    items: items.map((i) => ({
      id: i.localId,
      productId: i.productId,
      productName: i.productName,
      quantity: i.quantity,
      size: i.size,
      modifier: i.modifier,
      notes: i.notes,
      subtotalUgx: i.lineTotalUgx,
      lineTotalUgx: i.lineTotalUgx,
    })),
    payments: payments.map((p) => ({ method: p.method, amountUgx: p.amountUgx })),
  }
}

/** Receipt shape for offline-paid orders (matches API receipt for UI). */
export type OfflineReceipt = {
  orderId: string
  status: string
  createdAt: string
  servedAt: string | null
  staffName: string
  tableLabel: string | null
  items: Array<{ name: string; imageUrl?: string | null; quantity: number; unitPriceUgx: number; totalUgx: number }>
  totalUgx: number
  payments: Array<{ method: string; amountUgx: number }>
  isOffline?: boolean
}

/**
 * Get receipt data for an offline-paid order (for receipt page when orderId is localId).
 */
export async function getReceiptDataOffline(orderLocalId: string): Promise<OfflineReceipt | null> {
  const raw = await getOrderDetailOffline(orderLocalId)
  if (!raw) return null
  const { order, items, payments } = raw
  if (!order.isOfflineServed && order.status !== 'served') return null
  return {
    orderId: order.localId,
    status: order.status,
    createdAt: order.createdAt,
    servedAt: order.isOfflineServed ? order.updatedAt : null,
    staffName: 'Staff',
    tableLabel: order.tableId ? `Table ${order.tableId}` : 'Takeaway',
    items: items.map((i) => ({
      name: i.productName,
      imageUrl: null,
      quantity: i.quantity,
      unitPriceUgx: i.unitPriceUgx,
      totalUgx: i.lineTotalUgx,
    })),
    totalUgx: order.totalUgx,
    payments: payments.map((p) => ({ method: p.method, amountUgx: p.amountUgx })),
    isOffline: true,
  }
}
