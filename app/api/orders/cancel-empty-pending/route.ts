import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getActiveShift } from '@/lib/staff-session'
import { cancelOrder } from '@/lib/pos-service'
import { toPosApiResponse } from '@/lib/pos-api-errors'
import { getAuthenticatedStaff } from '@/lib/pos-auth'
import { emitToShift, emitTableEvent, emitOrderCountsForShift } from '@/lib/realtime'

/**
 * Cancels all pending orders in the current staff's active shift that have no items.
 * Use when the POS orders page loads so abandoned empty orders (e.g. after refresh) are not left pending.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const auth = await getAuthenticatedStaff(request).catch(() => null)
    const staffId = (body.staffId as string) ?? auth?.staffId
    if (typeof staffId !== 'string' || !staffId) {
      return NextResponse.json({ error: 'staffId is required' }, { status: 400 })
    }

    const shift = await getActiveShift(staffId)
    const pendingOrders = await prisma.order.findMany({
      where: { shiftId: shift.id, status: 'pending' },
      select: { id: true, tableId: true, shiftId: true, updatedAt: true },
    })
    if (pendingOrders.length === 0) {
      return NextResponse.json({ cancelled: 0, orderIds: [] })
    }

    const orderIds = pendingOrders.map((o) => o.id)
    const itemCounts = await prisma.orderItem.groupBy({
      by: ['orderId'],
      where: { orderId: { in: orderIds } },
      _count: { id: true },
    })
    const countByOrderId = new Map(itemCounts.map((r) => [r.orderId, r._count.id]))
    const emptyOrderIds = orderIds.filter((id) => (countByOrderId.get(id) ?? 0) === 0)

    for (const orderId of emptyOrderIds) {
      const order = await cancelOrder({ orderId, cancelledByStaffId: staffId })
      emitToShift(order.shiftId, {
        type: 'ORDER_CANCELLED',
        payload: {
          orderId,
          shiftId: order.shiftId,
          tableId: order.tableId ?? undefined,
          cancelledAt: order.updatedAt.toISOString(),
        },
      })
      if (order.tableId) {
        emitTableEvent({
          type: 'TABLE_RELEASED',
          payload: { tableId: order.tableId, releasedAt: order.updatedAt.toISOString() },
        })
      }
      await emitOrderCountsForShift(order.shiftId)
    }

    return NextResponse.json({ cancelled: emptyOrderIds.length, orderIds: emptyOrderIds })
  } catch (error) {
    return toPosApiResponse(error)
  }
}
