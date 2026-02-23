import { NextRequest, NextResponse } from 'next/server'
import { createTakeawayOrder } from '@/lib/pos-service'
import { toPosApiResponse } from '@/lib/pos-api-errors'
import { emitToShift, emitOrderCountsForShift } from '@/lib/realtime'
import { getOrSetIdempotent } from '@/lib/idempotency'
import { uniqueOrderNumberForTakeaway } from '@/lib/pos-order-number'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { staffId, orderNumber, clientRequestId, terminalId: bodyTerminalId } = body

    if (typeof staffId !== 'string' || !staffId) {
      return NextResponse.json({ error: 'staffId is required (string)' }, { status: 400 })
    }
    if (typeof orderNumber !== 'string' || !orderNumber) {
      return NextResponse.json({ error: 'orderNumber is required (string)' }, { status: 400 })
    }

    const { unique: uniqueOrderNumber, display: displayName } = uniqueOrderNumberForTakeaway(orderNumber)

    const terminalIdOverride = typeof bodyTerminalId === 'string' && bodyTerminalId.trim() ? bodyTerminalId.trim() : undefined
    const idempotencyKey = typeof clientRequestId === 'string' && clientRequestId.trim() ? clientRequestId.trim().slice(0, 64) : null

    const createAndEmit = async () => {
      const o = await createTakeawayOrder({ staffId, orderNumber: uniqueOrderNumber, terminalId: terminalIdOverride })
      try {
        await emitOrderCountsForShift(o.shiftId)
      } catch (_) {
        // Realtime is best-effort; never fail the request
      }
      return o
    }

    const order = idempotencyKey
      ? await getOrSetIdempotent(idempotencyKey, 'order_create_takeaway', createAndEmit)
      : await createAndEmit()

    const id = String(order.id)
    const statusStr = String(order.status)
    return NextResponse.json({
      id,
      orderId: id,
      orderNumber: order.orderNumber,
      displayOrderNumber: displayName,
      status: statusStr,
      totalUgx: 0,
    })
  } catch (error) {
    return toPosApiResponse(error)
  }
}
