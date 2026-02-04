import { prisma } from '@/lib/db'
import type { Shift } from '@prisma/client'
import { getShiftSummary, type ShiftSummary } from '@/lib/read-models'

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
  constructor(public readonly shiftId: string, public readonly endTime: Date) {
    super(`Shift already closed at ${endTime.toISOString()}: ${shiftId}`)
    this.name = 'ShiftAlreadyClosedError'
    Object.setPrototypeOf(this, ShiftAlreadyClosedError.prototype)
  }
}

// ---------------------------------------------------------------------------
// Close shift orchestration
// ---------------------------------------------------------------------------

export type CloseShiftParams = {
  shiftId: string
  closedByStaffId: string
  declaredCashUgx?: number
}

export type CloseShiftResult = {
  shift: Shift
  summary: ShiftSummary
  /** Present only when declaredCashUgx was provided. declaredCashUgx - cashPaymentsUgx */
  cashVarianceUgx?: number
}

/**
 * Closes a shift atomically: sets endTime = now, then computes final reconciliation
 * via getShiftSummary. No new orders or payments may attach after closing (shift
 * is no longer active). Optional declaredCashUgx yields cashVarianceUgx in the result.
 * Single authoritative way to close a shift.
 */
export async function closeShift(params: CloseShiftParams): Promise<CloseShiftResult> {
  const { shiftId, closedByStaffId, declaredCashUgx } = params

  const now = new Date()

  const shift = await prisma.$transaction(async (tx) => {
    const existing = await tx.shift.findUnique({
      where: { id: shiftId },
      select: { id: true, endTime: true },
    })

    if (!existing) {
      throw new ShiftNotFoundError(shiftId)
    }
    if (existing.endTime != null) {
      throw new ShiftAlreadyClosedError(shiftId, existing.endTime)
    }

    const updated = await tx.shift.update({
      where: { id: shiftId },
      data: {
        endTime: now,
        // closedByStaffId: schema has no such field; add here when added to schema
      },
    })

    return updated
  })

  const summary = await getShiftSummary(shiftId)
  if (!summary) {
    throw new ShiftNotFoundError(shiftId)
  }

  let cashVarianceUgx: number | undefined
  if (declaredCashUgx !== undefined) {
    cashVarianceUgx = declaredCashUgx - summary.cashPaymentsUgx
  }

  return {
    shift,
    summary,
    cashVarianceUgx,
  }
}
