/**
 * Domain: Shift management (summary and closing)
 */

import { prisma } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'
import { assertStaffRole } from '@/lib/domain/role-guard'

const CLOSE_SHIFT_ROLES = ['manager', 'admin'] as const

// ---------------------------------------------------------------------------
// Typed errors
// ---------------------------------------------------------------------------

export class ShiftNotFoundError extends Error {
  readonly code = 'SHIFT_NOT_FOUND' as const
  constructor(public readonly shiftId: string) {
    super(`Shift not found: ${shiftId}`)
    this.name = 'ShiftNotFoundError'
    Object.setPrototypeOf(this, ShiftNotFoundError.prototype)
  }
}

export class ShiftAlreadyClosedError extends Error {
  readonly code = 'SHIFT_ALREADY_CLOSED' as const
  constructor(public readonly shiftId: string) {
    super(`Shift already closed: ${shiftId}`)
    this.name = 'ShiftAlreadyClosedError'
    Object.setPrototypeOf(this, ShiftAlreadyClosedError.prototype)
  }
}

export class ShiftHasUnfinishedOrdersError extends Error {
  readonly code = 'SHIFT_HAS_UNFINISHED_ORDERS' as const
  constructor(public readonly shiftId: string, public readonly pendingCount: number) {
    super(
      `Cannot close shift: there are ${pendingCount} order(s) still pending or preparing. Complete or cancel them first.`
    )
    this.name = 'ShiftHasUnfinishedOrdersError'
    Object.setPrototypeOf(this, ShiftHasUnfinishedOrdersError.prototype)
  }
}

// ---------------------------------------------------------------------------
// Shift summary (read-only)
// ---------------------------------------------------------------------------

export type ShiftSummary = {
  shiftId: string
  ordersServed: number
  totalSales: number
  cashSales: number
  mtnMomoSales: number
  airtelSales: number
  cardSales: number
}

/**
 * Computes shift summary: orders served and payments grouped by method.
 * Only served orders and completed payments are counted.
 * Read-only, no side effects.
 */
export async function getShiftSummary(shiftId: string): Promise<ShiftSummary> {
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    select: { id: true },
  })

  if (!shift) {
    throw new ShiftNotFoundError(shiftId)
  }

  // Count served orders
  const ordersServed = await prisma.order.count({
    where: {
      shiftId,
      status: 'served',
    },
  })

  // Sum payments by method (only completed payments)
  const payments = await prisma.payment.findMany({
    where: {
      order: {
        shiftId,
        status: 'served',
      },
      status: 'completed',
    },
    select: {
      method: true,
      amountUgx: true,
    },
  })

  let cashSales = 0
  let mtnMomoSales = 0
  let airtelSales = 0
  let cardSales = 0

  for (const payment of payments) {
    const amount = Number(payment.amountUgx)
    switch (payment.method) {
      case 'cash':
        cashSales += amount
        break
      case 'mtn_momo':
        mtnMomoSales += amount
        break
      case 'airtel_money':
        airtelSales += amount
        break
      case 'card':
        cardSales += amount
        break
    }
  }

  const totalSales = cashSales + mtnMomoSales + airtelSales + cardSales

  return {
    shiftId,
    ordersServed,
    totalSales,
    cashSales,
    mtnMomoSales,
    airtelSales,
    cardSales,
  }
}

// ---------------------------------------------------------------------------
// Close shift
// ---------------------------------------------------------------------------

export type CloseShiftResult = {
  shiftId: string
  expectedCash: number
  countedCashUgx: number
  variance: number
}

/**
 * Closes a shift: validates not already closed, computes cash variance,
 * updates shift with close metadata.
 * Requires role: manager or admin.
 * Returns reconciliation summary.
 */
export async function closeShift(params: {
  shiftId: string
  countedCashUgx: number
  closedByStaffId: string
}): Promise<CloseShiftResult> {
  const { shiftId, countedCashUgx, closedByStaffId } = params

  await assertStaffRole(closedByStaffId, [...CLOSE_SHIFT_ROLES])

  // Prevent close if there are pending or preparing orders
  const unfinishedCount = await prisma.order.count({
    where: {
      shiftId,
      status: { in: ['pending', 'preparing'] },
    },
  })
  if (unfinishedCount > 0) {
    throw new ShiftHasUnfinishedOrdersError(shiftId, unfinishedCount)
  }

  // Get shift summary first
  const summary = await getShiftSummary(shiftId)
  const expectedCash = summary.cashSales
  const variance = countedCashUgx - expectedCash

  // Update shift in transaction
  await prisma.$transaction(async (tx) => {
    const shift = await tx.shift.findUnique({
      where: { id: shiftId },
      select: { id: true, endTime: true },
    })

    if (!shift) {
      throw new ShiftNotFoundError(shiftId)
    }

    if (shift.endTime !== null) {
      throw new ShiftAlreadyClosedError(shiftId)
    }

    await tx.shift.update({
      where: { id: shiftId },
      data: {
        endTime: new Date(),
        closedByStaffId,
        countedCashUgx: new Decimal(countedCashUgx),
        cashVarianceUgx: new Decimal(variance),
      },
    })
  })

  return {
    shiftId,
    expectedCash,
    countedCashUgx,
    variance,
  }
}
