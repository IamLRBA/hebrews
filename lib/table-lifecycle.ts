import { prisma } from '@/lib/db'

const NON_TERMINAL_STATUSES = ['pending', 'preparing', 'ready'] as const
const TERMINAL_STATUSES = ['served', 'cancelled'] as const

// ---------------------------------------------------------------------------
// Typed errors
// ---------------------------------------------------------------------------

export class OrderNotFoundError extends Error {
  readonly code = 'ORDER_NOT_FOUND' as const
  constructor(public readonly orderId: string) {
    super(`Order not found: ${orderId}`)
    this.name = 'OrderNotFoundError'
    Object.setPrototypeOf(this, OrderNotFoundError.prototype)
  }
}

export class OrderNotTerminalError extends Error {
  readonly code = 'ORDER_NOT_TERMINAL' as const
  constructor(public readonly orderId: string, public readonly status: string) {
    super(`Order is ${status}; table can only be released when order is served or cancelled: ${orderId}`)
    this.name = 'OrderNotTerminalError'
    Object.setPrototypeOf(this, OrderNotTerminalError.prototype)
  }
}

// ---------------------------------------------------------------------------
// Occupancy definition (read-only, deterministic)
// ---------------------------------------------------------------------------

/**
 * A table is occupied if there exists a dine-in order with this tableId
 * and status in (pending, preparing, ready).
 * Takeaway orders never affect tables.
 */
export async function isTableOccupied(tableId: string): Promise<boolean> {
  const order = await prisma.order.findFirst({
    where: {
      tableId,
      orderType: 'dine_in',
      status: { in: [...NON_TERMINAL_STATUSES] },
    },
    select: { id: true },
  })
  return order != null
}

// ---------------------------------------------------------------------------
// Release (write; call when order has reached served or cancelled)
// ---------------------------------------------------------------------------

/**
 * Releases the table for an order that has reached a terminal state (served or cancelled).
 * No-op if the order has no tableId (e.g. takeaway).
 * Throws if order does not exist or is not yet terminal.
 * Does not modify order status, payments, or items.
 */
export async function releaseTableForOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, tableId: true, orderType: true, status: true },
  })

  if (!order) {
    throw new OrderNotFoundError(orderId)
  }
  if (order.tableId == null || order.tableId === '') {
    return
  }
  if (!TERMINAL_STATUSES.includes(order.status as (typeof TERMINAL_STATUSES)[number])) {
    throw new OrderNotTerminalError(orderId, order.status)
  }

  await prisma.restaurantTable.update({
    where: { id: order.tableId },
    data: { status: 'available' },
  })
}
