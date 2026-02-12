/**
 * Domain: Role-based access control
 */

import { prisma } from '@/lib/db'
import type { StaffRole } from '@prisma/client'

// ---------------------------------------------------------------------------
// Typed errors
// ---------------------------------------------------------------------------

export class StaffNotFoundError extends Error {
  readonly code = 'STAFF_NOT_FOUND' as const
  constructor(public readonly staffId: string) {
    super(`Staff not found: ${staffId}`)
    this.name = 'StaffNotFoundError'
    Object.setPrototypeOf(this, StaffNotFoundError.prototype)
  }
}

export class UnauthorizedRoleError extends Error {
  readonly code = 'UNAUTHORIZED_ROLE' as const
  constructor(
    public readonly staffId: string,
    public readonly staffRole: StaffRole,
    public readonly requiredRoles: StaffRole[]
  ) {
    super(
      `Staff ${staffId} with role ${staffRole} is not authorized. Required: ${requiredRoles.join(', ')}`
    )
    this.name = 'UnauthorizedRoleError'
    Object.setPrototypeOf(this, UnauthorizedRoleError.prototype)
  }
}

// ---------------------------------------------------------------------------
// Role guard
// ---------------------------------------------------------------------------

/**
 * Asserts that the staff member has one of the allowed roles.
 * Loads staff by ID, checks role is in allowedRoles.
 * Throws StaffNotFoundError if staff doesn't exist.
 * Throws UnauthorizedRoleError if role not allowed.
 */
export async function assertStaffRole(
  staffId: string,
  allowedRoles: StaffRole[]
): Promise<void> {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { id: true, role: true },
  })

  if (!staff) {
    throw new StaffNotFoundError(staffId)
  }

  if (!allowedRoles.includes(staff.role)) {
    throw new UnauthorizedRoleError(staffId, staff.role, allowedRoles)
  }
}
