/**
 * Phase 9: table ownership — which terminal/staff has the table locked for an order.
 * Acquire on dine-in order create; release when order is served or cancelled.
 */

import { prisma } from '@/lib/db'

export class TableOccupiedByOtherError extends Error {
  readonly code = 'TABLE_OCCUPIED_BY_OTHER' as const
  constructor(
    public readonly tableId: string,
    public readonly existingOrderId: string,
    public readonly terminalId: string
  ) {
    super(`Table ${tableId} is already occupied by order ${existingOrderId} (terminal ${terminalId})`)
    this.name = 'TableOccupiedByOtherError'
    Object.setPrototypeOf(this, TableOccupiedByOtherError.prototype)
  }
}

/**
 * Acquire table for an order (dine-in). Creates or updates TableOccupancy.
 * Call after creating the dine-in order.
 */
export async function acquireTableOccupancy(params: {
  tableId: string
  orderId: string
  terminalId: string
  staffId: string
}): Promise<void> {
  const { tableId, orderId, terminalId, staffId } = params
  const now = new Date()
  await prisma.tableOccupancy.upsert({
    where: { tableId },
    create: {
      tableId,
      orderId,
      terminalId,
      staffId,
      lockedAt: now,
    },
    update: {
      orderId,
      terminalId,
      staffId,
      lockedAt: now,
    },
  })
}

/**
 * Release table occupancy when order is served or cancelled.
 * Call from releaseTableForOrder (table-lifecycle).
 */
export async function releaseTableOccupancyForOrder(orderId: string): Promise<void> {
  await prisma.tableOccupancy.deleteMany({
    where: { orderId },
  })
}

/**
 * Check if table is occupied by another order (different orderId).
 * Returns occupancy info if occupied by another; null if free or same order.
 */
export async function getTableOccupancyConflict(
  tableId: string,
  orderId: string
): Promise<{ orderId: string; terminalId: string; staffId: string } | null> {
  const occ = await prisma.tableOccupancy.findUnique({
    where: { tableId },
  })
  if (!occ || occ.orderId === orderId) return null
  return { orderId: occ.orderId, terminalId: occ.terminalId, staffId: occ.staffId }
}
