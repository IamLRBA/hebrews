import { prisma } from '@/lib/db'
import type { Order } from '@prisma/client'
import { setOrderStatus } from '@/lib/order-status'
import { releaseTableForOrder } from '@/lib/table-lifecycle'
import { assertCanMarkOrderServed } from '@/lib/domain/orders'

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

export class OrderNotReadyForCheckoutError extends Error {
  readonly code = 'ORDER_NOT_READY_FOR_CHECKOUT' as const
  constructor(public readonly orderId: string, public readonly status: string) {
    super(`Order is ${status}; only ready or awaiting_payment orders can be checked out: ${orderId}`)
    this.name = 'OrderNotReadyForCheckoutError'
    Object.setPrototypeOf(this, OrderNotReadyForCheckoutError.prototype)
  }
}

export class OrderNotFullyPaidError extends Error {
  readonly code = 'ORDER_NOT_FULLY_PAID' as const
  constructor(
    public readonly orderId: string,
    public readonly orderTotalUgx: number,
    public readonly totalPaidUgx: number
  ) {
    super(
      `Order not fully paid: ${orderId} total ${orderTotalUgx}, paid ${totalPaidUgx}`
    )
    this.name = 'OrderNotFullyPaidError'
    Object.setPrototypeOf(this, OrderNotFullyPaidError.prototype)
  }
}

// ---------------------------------------------------------------------------
// Checkout orchestration
// ---------------------------------------------------------------------------

export type CheckoutOrderParams = {
  orderId: string
  updatedByStaffId: string
}

/**
 * Finalizes an order: validates payment completeness, transitions to served,
 * and releases the table if applicable (dine-in). Takeaway: table release is no-op.
 * Order must exist, must not be served or cancelled, must be ready or awaiting_payment, and must be
 * fully paid (sum of completed payments >= order total). Uses order lifecycle
 * and table lifecycle utilities; does not duplicate payment or status logic.
 * Single authoritative operation for closing an order.
 */
export async function checkoutOrder(params: CheckoutOrderParams): Promise<Order> {
  const { orderId, updatedByStaffId } = params

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, totalUgx: true },
    })

    if (!order) {
      throw new OrderNotFoundError(orderId)
    }
    if (order.status !== 'ready' && order.status !== 'awaiting_payment') {
      throw new OrderNotReadyForCheckoutError(orderId, order.status)
    }

    const paidResult = await tx.payment.aggregate({
      where: {
        orderId,
        status: 'completed',
      },
      _sum: { amountUgx: true },
    })
    const totalPaid = paidResult._sum.amountUgx != null ? Number(paidResult._sum.amountUgx) : 0
    const orderTotal = Number(order.totalUgx)

    if (totalPaid < orderTotal) {
      throw new OrderNotFullyPaidError(orderId, orderTotal, totalPaid)
    }

    // Defer status transition and table release to after tx so we use existing utilities
  })

  await assertCanMarkOrderServed(orderId, updatedByStaffId)

  const order = await setOrderStatus({
    orderId,
    newStatus: 'served',
    updatedByStaffId,
  })

  await releaseTableForOrder(orderId)

  return order
}
