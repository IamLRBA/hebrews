/**
 * Phase 9: table ownership — which orders occupy a table (one row per order).
 * Table is "full" when count(TableOccupancy for table) >= RestaurantTable.capacity.
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

export class TableAtCapacityError extends Error {
  readonly code = 'TABLE_AT_CAPACITY' as const
  constructor(
    public readonly tableId: string,
    public readonly capacity: number,
    public readonly currentCount: number
  ) {
    super(`Table ${tableId} is at capacity (${currentCount}/${capacity} seats)`)
    this.name = 'TableAtCapacityError'
    Object.setPrototypeOf(this, TableAtCapacityError.prototype)
  }
}

/**
 * Acquire a seat at the table for an order (dine-in). Creates one TableOccupancy row per order.
 * Fails if table is already at capacity (current occupancy count >= table.capacity).
 * Call after creating the dine-in order.
 */
export async function acquireTableOccupancy(params: {
  tableId: string
  orderId: string
  terminalId: string
  staffId: string
}): Promise<void> {
  const { tableId, orderId, terminalId, staffId } = params

  const table = await prisma.restaurantTable.findUnique({
    where: { id: tableId },
    select: { capacity: true },
  })
  if (!table) return
  const capacity = table.capacity != null && table.capacity >= 1 ? table.capacity : 1

  const currentCount = await prisma.tableOccupancy.count({
    where: { tableId },
  })
  if (currentCount >= capacity) {
    throw new TableAtCapacityError(tableId, capacity, currentCount)
  }

  const now = new Date()
  await prisma.tableOccupancy.create({
    data: {
      tableId,
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

export type TableOccupancyConflict =
  | { atCapacity: true; capacity: number; currentCount: number }
  | { orderId: string; terminalId: string; staffId: string }

/**
 * Throws TableAtCapacityError if table already has capacity-many occupancies.
 * Call before creating a new dine-in order for the table.
 */
export async function checkTableCapacity(tableId: string): Promise<void> {
  const table = await prisma.restaurantTable.findUnique({
    where: { id: tableId },
    select: { capacity: true },
  })
  if (!table) return
  const capacity = table.capacity != null && table.capacity >= 1 ? table.capacity : 1
  const currentCount = await prisma.tableOccupancy.count({ where: { tableId } })
  if (currentCount >= capacity) {
    throw new TableAtCapacityError(tableId, capacity, currentCount)
  }
}

/**
 * Check if we can add this order to the table (for submit / assign table).
 * Returns null if OK; otherwise returns atCapacity info or legacy "occupied by other" (single-order) info.
 * When orderId is provided, occupancies for that order are excluded (so we can re-assign same order to same table).
 */
export async function getTableOccupancyConflict(
  tableId: string,
  excludeOrderId: string
): Promise<TableOccupancyConflict | null> {
  const table = await prisma.restaurantTable.findUnique({
    where: { id: tableId },
    select: { capacity: true },
  })
  if (!table) return null
  const capacity = table.capacity != null && table.capacity >= 1 ? table.capacity : 1

  const currentCount = await prisma.tableOccupancy.count({
    where: {
      tableId,
      orderId: { not: excludeOrderId },
    },
  })
  if (currentCount >= capacity) {
    return { atCapacity: true, capacity, currentCount }
  }
  return null
}
