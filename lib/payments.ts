import { prisma } from '@/lib/db'
import type { Payment, PaymentMethod, PaymentStatus } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

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

export class OrderCancelledError extends Error {
  readonly code = 'ORDER_CANCELLED' as const
  constructor(public readonly orderId: string) {
    super(`Order is cancelled; payments cannot be recorded: ${orderId}`)
    this.name = 'OrderCancelledError'
    Object.setPrototypeOf(this, OrderCancelledError.prototype)
  }
}

export class PaymentAmountInvalidError extends Error {
  readonly code = 'PAYMENT_AMOUNT_INVALID' as const
  constructor(public readonly amountUgx: number) {
    super(`Payment amount must be > 0, got: ${amountUgx}`)
    this.name = 'PaymentAmountInvalidError'
    Object.setPrototypeOf(this, PaymentAmountInvalidError.prototype)
  }
}

export class PaymentExceedsOrderTotalError extends Error {
  readonly code = 'PAYMENT_EXCEEDS_ORDER_TOTAL' as const
  constructor(
    public readonly orderId: string,
    public readonly orderTotalUgx: number,
    public readonly currentTotalPaymentsUgx: number,
    public readonly attemptedAmountUgx: number
  ) {
    super(
      `Payment would exceed order total: order ${orderId} total ${orderTotalUgx}, current payments ${currentTotalPaymentsUgx}, attempted ${attemptedAmountUgx}`
    )
    this.name = 'PaymentExceedsOrderTotalError'
    Object.setPrototypeOf(this, PaymentExceedsOrderTotalError.prototype)
  }
}

// ---------------------------------------------------------------------------
// Read helpers (used by recordPayment and exported for callers)
// ---------------------------------------------------------------------------

/**
 * Sum of payment amounts for an order. Only completed payments count as paid.
 */
export async function getTotalPaid(orderId: string): Promise<number> {
  const result = await prisma.payment.aggregate({
    where: {
      orderId,
      status: 'completed',
    },
    _sum: { amountUgx: true },
  })
  const sum = result._sum.amountUgx
  return sum != null ? Number(sum) : 0
}

/**
 * Sum of all payment amounts for an order (any status). Used to enforce cap when recording.
 */
async function getTotalPaymentAmountsForOrder(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  orderId: string
): Promise<number> {
  const result = await tx.payment.aggregate({
    where: { orderId },
    _sum: { amountUgx: true },
  })
  const sum = result._sum.amountUgx
  return sum != null ? Number(sum) : 0
}

/**
 * True if the order's completed payments sum >= order.totalUgx.
 * Order must exist; cancelled orders return false (no payments recorded).
 */
export async function isOrderFullyPaid(orderId: string): Promise<boolean> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, totalUgx: true },
  })
  if (!order || order.status === 'cancelled') {
    return false
  }
  const totalPaid = await getTotalPaid(orderId)
  return totalPaid >= Number(order.totalUgx)
}

// ---------------------------------------------------------------------------
// Write utility (append-only, atomic)
// ---------------------------------------------------------------------------

export type RecordPaymentParams = {
  orderId: string
  amountUgx: number
  method: PaymentMethod
  status: PaymentStatus
  reference?: string | null
  createdByStaffId: string
}

/**
 * Records a payment against an order. Append-only; does not change order status.
 * Order must exist and not be cancelled. Amount must be > 0. Sum of all payment amounts must not exceed order.totalUgx.
 * Transactional.
 */
export async function recordPayment(params: RecordPaymentParams): Promise<Payment> {
  const { orderId, amountUgx, method, status, reference, createdByStaffId } = params

  if (amountUgx <= 0) {
    throw new PaymentAmountInvalidError(amountUgx)
  }

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, totalUgx: true },
    })

    if (!order) {
      throw new OrderNotFoundError(orderId)
    }
    if (order.status === 'cancelled') {
      throw new OrderCancelledError(orderId)
    }

    const currentTotal = await getTotalPaymentAmountsForOrder(tx, orderId)
    const orderTotal = Number(order.totalUgx)
    if (currentTotal + amountUgx > orderTotal) {
      throw new PaymentExceedsOrderTotalError(orderId, orderTotal, currentTotal, amountUgx)
    }

    return tx.payment.create({
      data: {
        orderId,
        amountUgx: new Decimal(amountUgx),
        method,
        status,
        reference: reference ?? undefined,
        createdByStaffId,
      },
    })
  })
}
