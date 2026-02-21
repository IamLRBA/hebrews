import { NextRequest, NextResponse } from 'next/server'
import { cancelOrder } from '@/lib/pos-service'
import { toPosApiResponse } from '@/lib/pos-api-errors'
import { assertStaffRole } from '@/lib/domain/role-guard'
import { emitToShift, emitTableEvent, emitOrderCountsForShift } from '@/lib/realtime'

const CANCEL_ORDER_ROLES = ['manager', 'admin'] as const

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    const body = await request.json()
    const { cancelledByStaffId } = body

    if (typeof cancelledByStaffId !== 'string' || !cancelledByStaffId) {
      return NextResponse.json({ error: 'cancelledByStaffId is required (string)' }, { status: 400 })
    }

    await assertStaffRole(cancelledByStaffId, [...CANCEL_ORDER_ROLES])
    const order = await cancelOrder({ orderId, cancelledByStaffId })

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

    return NextResponse.json(order)
  } catch (error) {
    return toPosApiResponse(error)
  }
}
