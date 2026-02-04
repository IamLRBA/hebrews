import { prisma } from '@/lib/db'
import type { Shift } from '@prisma/client'
import { getStaff, getActiveShift, NoActiveShiftError } from '@/lib/staff-session'

export { NoActiveShiftError }

// ---------------------------------------------------------------------------
// Typed errors for shift lifecycle writes
// ---------------------------------------------------------------------------

export class StaffAlreadyHasActiveShiftError extends Error {
  readonly code = 'STAFF_ALREADY_HAS_ACTIVE_SHIFT' as const
  constructor(public readonly staffId: string) {
    super(`Staff already has an active shift: ${staffId}`)
    this.name = 'StaffAlreadyHasActiveShiftError'
    Object.setPrototypeOf(this, StaffAlreadyHasActiveShiftError.prototype)
  }
}

// ---------------------------------------------------------------------------
// Write utilities (timestamps only; no derived data)
// ---------------------------------------------------------------------------

/**
 * Starts a shift for the given staff at the given terminal.
 * @throws StaffNotFoundError | StaffInactiveError (from getStaff)
 * @throws StaffAlreadyHasActiveShiftError if staff already has an active shift
 */
export async function startShift(staffId: string, terminalId: string): Promise<Shift> {
  await getStaff(staffId)
  const existing = await prisma.shift.findFirst({
    where: { staffId, endTime: null },
  })
  if (existing) {
    throw new StaffAlreadyHasActiveShiftError(staffId)
  }
  return prisma.shift.create({
    data: {
      staffId,
      terminalId,
      startTime: new Date(),
      endTime: null,
    },
  })
}

/**
 * Ends the currently active shift for the given staff.
 * @throws NoActiveShiftError if staff has no active shift
 */
export async function endShift(staffId: string): Promise<Shift> {
  const shift = await getActiveShift(staffId)
  return prisma.shift.update({
    where: { id: shift.id },
    data: { endTime: new Date() },
  })
}
