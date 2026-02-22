import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { cancelOrder } from '@/lib/pos-service'
import { toPosApiResponse } from '@/lib/pos-api-errors'
import { getAuthenticatedStaff } from '@/lib/pos-auth'
import { emitToShift, emitTableEvent, emitOrderCountsForShift } from '@/lib/realtime'

/**
 * Cancels an order that is still pending (never sent to kitchen).
 * Any authenticated POS staff can cancel a pending order (e.g. customer changed mind).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const auth = await getAuthenticatedStaff(request).catch(() => null)
    const staffId = (body.staffId as string) ?? auth?.staffId
    if (typeof staffId !== 'string' || !staffId) {
      return NextResponse.json({ error: 'staffId is required' }, { status: 400 })
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, shiftId: true, tableId: true, updatedAt: true },
    })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    if (order.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending orders can be cancelled this way. Order was already sent to kitchen.' },
        { status: 400 }
      )
    }

    const updated = await cancelOrder({ orderId, cancelledByStaffId: staffId })

    emitToShift(updated.shiftId, {
      type: 'ORDER_CANCELLED',
      payload: {
        orderId,
        shiftId: updated.shiftId,
        tableId: updated.tableId ?? undefined,
        cancelledAt: updated.updatedAt.toISOString(),
      },
    })
    if (updated.tableId) {
      emitTableEvent({
        type: 'TABLE_RELEASED',
        payload: { tableId: updated.tableId, releasedAt: updated.updatedAt.toISOString() },
      })
    }
    await emitOrderCountsForShift(updated.shiftId)

    return NextResponse.json(updated)
  } catch (error) {
    return toPosApiResponse(error)
  }
}
