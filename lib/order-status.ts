import { prisma } from '@/lib/db'
import type { Order, OrderStatus } from '@prisma/client'

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

export class InvalidOrderStatusTransitionError extends Error {
  readonly code = 'INVALID_ORDER_STATUS_TRANSITION' as const
  constructor(
    public readonly orderId: string,
    public readonly currentStatus: OrderStatus,
    public readonly attemptedStatus: OrderStatus
  ) {
    super(
      `Invalid order status transition: ${currentStatus} → ${attemptedStatus} (order: ${orderId})`
    )
    this.name = 'InvalidOrderStatusTransitionError'
    Object.setPrototypeOf(this, InvalidOrderStatusTransitionError.prototype)
  }
}

// ---------------------------------------------------------------------------
// Allowed transitions (authoritative)
// ---------------------------------------------------------------------------

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['served'],
  served: [],
  cancelled: [],
}

function isTransitionAllowed(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false
}

// ---------------------------------------------------------------------------
// Write utility
// ---------------------------------------------------------------------------

export type SetOrderStatusParams = {
  orderId: string
  newStatus: OrderStatus
  updatedByStaffId: string
}

/**
 * Updates order status if the transition is valid. Records updatedByStaffId.
 * Order must exist. Served and cancelled are terminal.
 */
export async function setOrderStatus(params: SetOrderStatusParams): Promise<Order> {
  const { orderId, newStatus, updatedByStaffId } = params

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true },
  })

  if (!order) {
    throw new OrderNotFoundError(orderId)
  }

  if (!isTransitionAllowed(order.status, newStatus)) {
    throw new InvalidOrderStatusTransitionError(orderId, order.status, newStatus)
  }

  return prisma.order.update({
    where: { id: orderId },
    data: {
      status: newStatus,
      updatedByStaffId,
    },
  })
}
