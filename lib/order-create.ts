import { prisma } from '@/lib/db'
import type { Order } from '@prisma/client'
import { getStaff, getActiveShift } from '@/lib/staff-session'

// ---------------------------------------------------------------------------
// Typed errors for order creation
// ---------------------------------------------------------------------------

export class TableRequiredForDineInError extends Error {
  readonly code = 'TABLE_REQUIRED_FOR_DINE_IN' as const
  constructor() {
    super('Dine-in orders require a tableId')
    this.name = 'TableRequiredForDineInError'
    Object.setPrototypeOf(this, TableRequiredForDineInError.prototype)
  }
}

export class TableNotAllowedForTakeawayError extends Error {
  readonly code = 'TABLE_NOT_ALLOWED_FOR_TAKEAWAY' as const
  constructor() {
    super('Takeaway orders must not have a tableId')
    this.name = 'TableNotAllowedForTakeawayError'
    Object.setPrototypeOf(this, TableNotAllowedForTakeawayError.prototype)
  }
}

// ---------------------------------------------------------------------------
// Order shell creation (no items, no payments)
// ---------------------------------------------------------------------------

export type CreateOrderParams = {
  staffId: string
  orderType: 'dine_in' | 'takeaway'
  tableId?: string | null
  orderNumber: string
  assignedWaiterId?: string | null
  /** When provided (e.g. sync), overrides shift.terminalId for audit. */
  terminalId?: string | null
}

/**
 * Creates a new order shell (status pending, no items). Write.
 * Enforces: staff exists and active, staff has active shift, dine_in has tableId, takeaway has no tableId.
 * @throws StaffNotFoundError | StaffInactiveError | NoActiveShiftError (from staff-session)
 * @throws TableRequiredForDineInError | TableNotAllowedForTakeawayError
 */
export async function createOrder(params: CreateOrderParams): Promise<Order> {
  const { staffId, orderType, tableId, orderNumber, assignedWaiterId, terminalId: overrideTerminalId } = params

  await getStaff(staffId)
  const shift = await getActiveShift(staffId)

  if (orderType === 'dine_in') {
    if (tableId == null || tableId === '') {
      throw new TableRequiredForDineInError()
    }
  } else {
    if (tableId != null && tableId !== '') {
      throw new TableNotAllowedForTakeawayError()
    }
  }

  const terminalIdToUse = overrideTerminalId != null && overrideTerminalId !== '' ? overrideTerminalId : shift.terminalId
  return prisma.order.create({
    data: {
      orderNumber,
      orderType,
      tableId: orderType === 'dine_in' ? tableId! : null,
      shiftId: shift.id,
      createdByStaffId: staffId,
      assignedWaiterId: assignedWaiterId ?? undefined,
      terminalId: terminalIdToUse,
      status: 'pending',
      subtotalUgx: 0,
      taxUgx: 0,
      totalUgx: 0,
    },
  })
}
