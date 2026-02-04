import { prisma } from '@/lib/db'
import type { Staff, Shift } from '@prisma/client'

// ---------------------------------------------------------------------------
// Typed errors (callers can catch by code or instanceof)
// ---------------------------------------------------------------------------

export class StaffNotFoundError extends Error {
  readonly code = 'STAFF_NOT_FOUND' as const
  constructor(public readonly staffId: string) {
    super(`Staff not found: ${staffId}`)
    this.name = 'StaffNotFoundError'
    Object.setPrototypeOf(this, StaffNotFoundError.prototype)
  }
}

export class StaffInactiveError extends Error {
  readonly code = 'STAFF_INACTIVE' as const
  constructor(public readonly staffId: string) {
    super(`Staff is inactive: ${staffId}`)
    this.name = 'StaffInactiveError'
    Object.setPrototypeOf(this, StaffInactiveError.prototype)
  }
}

export class NoActiveShiftError extends Error {
  readonly code = 'NO_ACTIVE_SHIFT' as const
  constructor(public readonly staffId: string) {
    super(`No active shift for staff: ${staffId}`)
    this.name = 'NoActiveShiftError'
    Object.setPrototypeOf(this, NoActiveShiftError.prototype)
  }
}

// ---------------------------------------------------------------------------
// Read-only utilities (caller provides staff_id; session handling is later)
// ---------------------------------------------------------------------------

/**
 * Resolves the current staff by id. Read-only.
 * @throws StaffNotFoundError if no staff with that id
 * @throws StaffInactiveError if staff exists but isActive is false
 */
export async function getStaff(staffId: string): Promise<Staff> {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
  })
  if (!staff) {
    throw new StaffNotFoundError(staffId)
  }
  if (!staff.isActive) {
    throw new StaffInactiveError(staffId)
  }
  return staff
}

/**
 * Returns the active shift for the given staff. Read-only.
 * Active = shift with endTime null for this staff.
 * @throws NoActiveShiftError if no such shift exists
 */
export async function getActiveShift(staffId: string): Promise<Shift> {
  const shift = await prisma.shift.findFirst({
    where: {
      staffId,
      endTime: null,
    },
    orderBy: { startTime: 'desc' },
  })
  if (!shift) {
    throw new NoActiveShiftError(staffId)
  }
  return shift
}
