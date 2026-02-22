/**
 * Realtime sync: shift-scoped and table-wide event delivery over SSE.
 * Uses a shared bus (Redis when REDIS_URL set, else in-memory) for multi-instance correctness.
 */

import { getActiveOrderCounts } from '@/lib/cafe-workflow'
import {
  setLocalDelivery,
  publishShift as busPublishShift,
  publishTable as busPublishTable,
  initBus,
  type BusMessage,
} from '@/lib/realtime-bus'

export type OrderStatusValue =
  | 'pending'
  | 'preparing'
  | 'ready'
  | 'awaiting_payment'
  | 'served'
  | 'cancelled'

// ---------------------------------------------------------------------------
// Event types and payloads
// ---------------------------------------------------------------------------

export type RealtimeEvent =
  | { type: 'ORDER_CREATED'; payload: OrderCreatedPayload }
  | { type: 'ORDER_UPDATED'; payload: OrderUpdatedPayload }
  | { type: 'ORDER_SENT_TO_KITCHEN'; payload: OrderSentToKitchenPayload }
  | { type: 'ORDER_STATUS_CHANGED'; payload: OrderStatusChangedPayload }
  | { type: 'ORDER_CANCELLED'; payload: OrderCancelledPayload }
  | { type: 'ORDER_ASSIGNMENT_CHANGED'; payload: OrderAssignmentChangedPayload }
  | { type: 'PAYMENT_COMPLETED'; payload: PaymentCompletedPayload }
  | { type: 'TABLE_RELEASED'; payload: TableReleasedPayload }
  | { type: 'TABLE_OCCUPIED'; payload: TableOccupiedPayload }
  | { type: 'ORDER_COUNTS_UPDATED'; payload: OrderCountsUpdatedPayload }
  | { type: 'SNAPSHOT'; payload: SnapshotPayload }
  | { type: 'HEARTBEAT'; payload: { ts: string } }

export interface OrderSentToKitchenPayload {
  orderId: string
  shiftId: string
  tableId?: string | null
  status: string
  updatedAt: string
  forKitchen?: boolean
  orderNumber?: string
}

export interface OrderCountsUpdatedPayload {
  shiftId: string
  pendingCount: number
  preparingCount: number
  readyCount: number
  awaitingPaymentCount: number
  activeTablesCount: number
  at: string
}

export interface SnapshotPayload {
  shiftId: string
  orderCounts: OrderCountsUpdatedPayload
  at: string
}

export interface OrderCreatedPayload {
  orderId: string
  shiftId: string
  tableId?: string | null
  orderNumber: string
  status: OrderStatusValue
  assignedWaiterId?: string | null
  createdAt: string
  forKitchen?: boolean
}

export interface OrderUpdatedPayload {
  orderId: string
  shiftId: string
  tableId?: string | null
  status: OrderStatusValue
  updatedAt: string
  forKitchen?: boolean
}

export interface OrderStatusChangedPayload {
  orderId: string
  shiftId: string
  tableId?: string | null
  previousStatus: OrderStatusValue
  newStatus: OrderStatusValue
  updatedAt: string
  forKitchen?: boolean
  orderNumber?: string
}

export interface OrderCancelledPayload {
  orderId: string
  shiftId: string
  tableId?: string | null
  cancelledAt: string
}

export interface OrderAssignmentChangedPayload {
  orderId: string
  shiftId: string
  assignedWaiterId: string | null
  updatedAt: string
}

export interface PaymentCompletedPayload {
  orderId: string
  shiftId: string
  tableId?: string | null
  newStatus: OrderStatusValue
  amountUgx: number
  method: string
  completedAt: string
}

export interface TableReleasedPayload {
  tableId: string
  releasedAt: string
}

export interface TableOccupiedPayload {
  tableId: string
  orderId: string
  at: string
}

// ---------------------------------------------------------------------------
// Connection registry (in-memory; single process)
// ---------------------------------------------------------------------------

interface Connection {
  shiftId: string
  staffId: string
  terminalId: string | null
  send: (event: RealtimeEvent) => void
}

const connections: Connection[] = []
let eventId = 0
let busInitialized = false

function ensureBus(): void {
  if (busInitialized) return
  busInitialized = true
  setLocalDelivery((msg: BusMessage) => {
    if (msg.kind === 'shift') broadcastToShift(msg.shiftId, msg.event)
    else broadcastToAll(msg.event)
  })
  initBus().catch(() => {})
}

function nextEventId(): number {
  return ++eventId
}

function safeSend(c: Connection, event: RealtimeEvent): boolean {
  try {
    c.send(event)
    return true
  } catch {
    return false
  }
}

function broadcastToShift(shiftId: string, event: RealtimeEvent): void {
  const dead: Connection[] = []
  for (const c of connections) {
    if (c.shiftId !== shiftId) continue
    if (!safeSend(c, event)) dead.push(c)
  }
  for (const c of dead) {
    const i = connections.indexOf(c)
    if (i !== -1) connections.splice(i, 1)
  }
}

function broadcastToAll(event: RealtimeEvent): void {
  const dead: Connection[] = []
  for (const c of connections) {
    if (!safeSend(c, event)) dead.push(c)
  }
  for (const c of dead) {
    const i = connections.indexOf(c)
    if (i !== -1) connections.splice(i, 1)
  }
}

export function addConnection(conn: Connection): void {
  ensureBus()
  connections.push(conn)
}

export function removeConnection(sendRef: (event: RealtimeEvent) => void): void {
  const i = connections.findIndex((c) => c.send === sendRef)
  if (i !== -1) connections.splice(i, 1)
}

/**
 * Broadcast an order-related event to all connections subscribed to this shift.
 * Uses shared bus when REDIS_URL is set so all instances receive it.
 */
export function emitToShift(shiftId: string, event: RealtimeEvent): void {
  ensureBus()
  busPublishShift(shiftId, event)
}

/**
 * Broadcast a table event to all connections (all shifts see table updates).
 * Optional branchId reserved for future multi-branch partitioning.
 */
export function emitTableEvent(event: RealtimeEvent, _branchId?: string): void {
  ensureBus()
  busPublishTable(event, _branchId)
}

/**
 * Emit ORDER_COUNTS_UPDATED for a shift. Caller must pass counts (e.g. from getActiveOrderCounts).
 * Use this after order create/cancel/status change/payment so dashboards update without polling.
 */
export function emitOrderCountsToShift(
  shiftId: string,
  counts: Omit<OrderCountsUpdatedPayload, 'shiftId' | 'at'>
): void {
  emitToShift(shiftId, {
    type: 'ORDER_COUNTS_UPDATED',
    payload: {
      shiftId,
      ...counts,
      at: new Date().toISOString(),
    },
  })
}

/**
 * Fetch current order counts for the shift and emit ORDER_COUNTS_UPDATED.
 * Call after any mutation that changes order counts or table occupancy.
 */
export async function emitOrderCountsForShift(shiftId: string): Promise<void> {
  const counts = await getActiveOrderCounts({ shiftId })
  emitOrderCountsToShift(shiftId, {
    pendingCount: counts.pendingCount,
    preparingCount: counts.preparingCount,
    readyCount: counts.readyCount,
    awaitingPaymentCount: counts.awaitingPaymentCount,
    activeTablesCount: counts.activeTablesCount,
  })
}

/**
 * Serialize event for SSE: "id: N\ndata: JSON\n\n"
 */
export function formatSSE(event: RealtimeEvent): string {
  const id = nextEventId()
  const data = JSON.stringify(event)
  return `id: ${id}\ndata: ${data}\n\n`
}

/**
 * Heartbeat comment line to keep connection alive.
 */
export function formatHeartbeat(): string {
  return ': heartbeat\n\n'
}
