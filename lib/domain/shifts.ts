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

export class ManagerApprovalRequiredForCloseError extends Error {
  readonly code = 'MANAGER_APPROVAL_REQUIRED' as const
  constructor(
    public readonly shiftId: string,
    public readonly varianceUgx: number,
    public readonly thresholdUgx: number
  ) {
    super(
      `Cash variance UGX ${varianceUgx} exceeds threshold UGX ${thresholdUgx}. Manager or admin approval required to close.`
    )
    this.name = 'ManagerApprovalRequiredForCloseError'
    Object.setPrototypeOf(this, ManagerApprovalRequiredForCloseError.prototype)
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
  managerApprovalRequired?: boolean
  managerApprovalStaffId?: string | null
}

/**
 * Get cash sales per terminal for a shift (for TerminalCashSummary).
 */
async function getCashSalesByTerminal(shiftId: string): Promise<Array<{ terminalId: string; cashSalesUgx: number }>> {
  const payments = await prisma.payment.findMany({
    where: {
      order: { shiftId, status: 'served' },
      status: 'completed',
      method: 'cash',
    },
    select: { terminalId: true, amountUgx: true },
  })
  const byTerminal = new Map<string, number>()
  for (const p of payments) {
    const tid = p.terminalId ?? 'unknown'
    byTerminal.set(tid, (byTerminal.get(tid) ?? 0) + Number(p.amountUgx))
  }
  return Array.from(byTerminal.entries()).map(([terminalId, cashSalesUgx]) => ({ terminalId, cashSalesUgx }))
}

/**
 * Closes a shift: reconciliation required (staff enters counted cash).
 * System computes discrepancy; manager approval required if discrepancy exceeds threshold.
 * Generates ShiftFinancialSummary and TerminalCashSummary; locks shift from further mutations.
 * Requires role: manager or admin. When variance exceeds threshold, managerApprovalStaffId must be provided (manager/admin).
 */
export async function closeShift(params: {
  shiftId: string
  countedCashUgx: number
  closedByStaffId: string
  managerApprovalStaffId?: string | null
}): Promise<CloseShiftResult> {
  const { shiftId, countedCashUgx, closedByStaffId, managerApprovalStaffId } = params

  await assertStaffRole(closedByStaffId, [...CLOSE_SHIFT_ROLES])

  const thresholdUgx = await getCashVarianceThresholdUgx()

  const unfinishedCount = await prisma.order.count({
    where: {
      shiftId,
      status: { in: ['pending', 'preparing'] },
    },
  })
  if (unfinishedCount > 0) {
    throw new ShiftHasUnfinishedOrdersError(shiftId, unfinishedCount)
  }

  const summary = await getShiftSummary(shiftId)
  const expectedCash = summary.cashSales
  const variance = countedCashUgx - expectedCash
  const exceedsThreshold = Math.abs(variance) > thresholdUgx

  if (exceedsThreshold && !managerApprovalStaffId) {
    throw new ManagerApprovalRequiredForCloseError(shiftId, variance, thresholdUgx)
  }
  if (exceedsThreshold && managerApprovalStaffId) {
    await assertStaffRole(managerApprovalStaffId, [...CLOSE_SHIFT_ROLES])
  }

  const cashByTerminal = await getCashSalesByTerminal(shiftId)
  const now = new Date()

  await prisma.$transaction(async (tx) => {
    const shift = await tx.shift.findUnique({
      where: { id: shiftId },
      select: { id: true, endTime: true },
    })

    if (!shift) throw new ShiftNotFoundError(shiftId)
    if (shift.endTime !== null) throw new ShiftAlreadyClosedError(shiftId)

    await tx.shift.update({
      where: { id: shiftId },
      data: {
        endTime: now,
        closedByStaffId,
        countedCashUgx: new Decimal(countedCashUgx),
        cashVarianceUgx: new Decimal(variance),
        managerApprovalStaffId: exceedsThreshold ? managerApprovalStaffId ?? null : null,
      },
    })

    await tx.shiftFinancialSummary.create({
      data: {
        shiftId,
        expectedCashUgx: new Decimal(expectedCash),
        countedCashUgx: new Decimal(countedCashUgx),
        varianceUgx: new Decimal(variance),
        managerApprovalStaffId: exceedsThreshold ? managerApprovalStaffId ?? null : null,
        closedAt: now,
      },
    })

    for (const { terminalId, cashSalesUgx } of cashByTerminal) {
      await tx.terminalCashSummary.create({
        data: {
          shiftId,
          terminalId,
          cashSalesUgx: new Decimal(cashSalesUgx),
          dropsUgx: new Decimal(0),
          adjustmentsUgx: new Decimal(0),
          expectedBalanceUgx: new Decimal(cashSalesUgx),
        },
      })
    }
  })

  return {
    shiftId,
    expectedCash,
    countedCashUgx,
    variance,
    managerApprovalRequired: exceedsThreshold,
    managerApprovalStaffId: exceedsThreshold ? managerApprovalStaffId ?? null : null,
  }
}

async function getCashVarianceThresholdUgx(): Promise<number> {
  try {
    const { getSystemConfig } = await import('@/lib/config/system-config')
    const v = await getSystemConfig('cashVarianceThresholdUgx')
    const n = parseInt(v ?? '', 10)
    return Number.isFinite(n) && n >= 0 ? n : 5000
  } catch {
    return 5000
  }
}
