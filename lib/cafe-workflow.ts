/**
 * Phase 3 Café Workflow: active orders and table/waiter views.
 * Read-only functions for status, waiter, table; counts for ready/awaiting_payment/active tables.
 */

import { prisma } from '@/lib/db'
import type { OrderStatus } from '@prisma/client'

const ACTIVE_STATUSES: OrderStatus[] = ['pending', 'preparing', 'ready', 'awaiting_payment']
const TERMINAL_STATUSES: OrderStatus[] = ['served', 'cancelled']

export type ActiveOrderSummary = {
  orderId: string
  orderNumber: string
  status: string
  tableId: string | null
  tableCode: string | null
  assignedWaiterId: string | null
  totalUgx: number
  createdAt: Date
}

// ---------------------------------------------------------------------------
// Fetch orders by status (respects order state machine; active statuses only)
// ---------------------------------------------------------------------------

/**
 * Returns orders with the given status. Use status in (pending, preparing, ready, awaiting_payment).
 * Sorted by createdAt ascending (oldest first).
 */
export async function getOrdersByStatus(params: {
  status: OrderStatus
  shiftId?: string | null
}): Promise<ActiveOrderSummary[]> {
  const { status, shiftId } = params
  const where: { status: OrderStatus; shiftId?: string } = { status }
  if (shiftId) where.shiftId = shiftId
  const orders = await prisma.order.findMany({
    where,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      tableId: true,
      totalUgx: true,
      createdAt: true,
      assignedWaiterId: true,
      table: { select: { code: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
  return orders.map((o) => ({
    orderId: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    tableId: o.tableId,
    tableCode: o.table?.code ?? null,
    assignedWaiterId: o.assignedWaiterId,
    totalUgx: Number(o.totalUgx),
    createdAt: o.createdAt,
  }))
}

/**
 * Returns active orders (pending, preparing, ready, awaiting_payment) assigned to the given waiter.
 * Sorted by status priority then createdAt.
 */
export async function getOrdersByAssignedWaiter(params: {
  waiterId: string
  shiftId?: string | null
}): Promise<ActiveOrderSummary[]> {
  const { waiterId, shiftId } = params
  const where: { assignedWaiterId: string; status: { in: OrderStatus[] } } = {
    assignedWaiterId: waiterId,
    status: { in: ACTIVE_STATUSES },
  }
  if (shiftId) (where as Record<string, unknown>).shiftId = shiftId
  const orders = await prisma.order.findMany({
    where,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      tableId: true,
      totalUgx: true,
      createdAt: true,
      assignedWaiterId: true,
      table: { select: { code: true } },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
  })
  return orders.map((o) => ({
    orderId: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    tableId: o.tableId,
    tableCode: o.table?.code ?? null,
    assignedWaiterId: o.assignedWaiterId,
    totalUgx: Number(o.totalUgx),
    createdAt: o.createdAt,
  }))
}

/**
 * Returns active orders for the given table (dine-in only). Sorted by createdAt.
 */
export async function getOrdersByTable(params: {
  tableId: string
  shiftId?: string | null
}): Promise<ActiveOrderSummary[]> {
  const { tableId, shiftId } = params
  const where: { tableId: string; orderType: 'dine_in'; status: { in: OrderStatus[] } } = {
    tableId,
    orderType: 'dine_in',
    status: { in: ACTIVE_STATUSES },
  }
  if (shiftId) (where as Record<string, unknown>).shiftId = shiftId
  const orders = await prisma.order.findMany({
    where,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      tableId: true,
      totalUgx: true,
      createdAt: true,
      assignedWaiterId: true,
      table: { select: { code: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
  return orders.map((o) => ({
    orderId: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    tableId: o.tableId,
    tableCode: o.table?.code ?? null,
    assignedWaiterId: o.assignedWaiterId,
    totalUgx: Number(o.totalUgx),
    createdAt: o.createdAt,
  }))
}

// ---------------------------------------------------------------------------
// Counts: ready-to-serve, awaiting payment, active tables
// ---------------------------------------------------------------------------

export type ActiveOrderCounts = {
  readyCount: number
  awaitingPaymentCount: number
  activeTablesCount: number
  pendingCount: number
  preparingCount: number
}

/**
 * Returns counts for dashboard: orders by status (pending, preparing, ready, awaiting_payment) and number of tables with at least one active order.
 * Optional shiftId to scope to a shift.
 */
export async function getActiveOrderCounts(params: { shiftId?: string | null }): Promise<ActiveOrderCounts> {
  const { shiftId } = params
  const baseWhere: { status: { in: OrderStatus[] }; orderType?: 'dine_in' } = { status: { in: ACTIVE_STATUSES } }
  const withShift = shiftId ? { ...baseWhere, shiftId } : baseWhere

  const [pendingCount, preparingCount, readyCount, awaitingPaymentCount, activeTablesResult] = await Promise.all([
    prisma.order.count({ where: { ...withShift, status: 'pending' } }),
    prisma.order.count({ where: { ...withShift, status: 'preparing' } }),
    prisma.order.count({ where: { ...withShift, status: 'ready' } }),
    prisma.order.count({ where: { ...withShift, status: 'awaiting_payment' } }),
    prisma.order.findMany({
      where: { ...withShift, orderType: 'dine_in', tableId: { not: null } },
      select: { tableId: true },
      distinct: ['tableId'],
    }),
  ])

  const activeTablesCount = activeTablesResult.filter((r) => r.tableId != null).length

  return {
    pendingCount,
    preparingCount,
    readyCount,
    awaitingPaymentCount,
    activeTablesCount,
  }
}
