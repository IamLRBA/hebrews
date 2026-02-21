import { NextRequest, NextResponse } from 'next/server'
import { createTakeawayOrder } from '@/lib/pos-service'
import { toPosApiResponse } from '@/lib/pos-api-errors'
import { emitToShift, emitOrderCountsForShift } from '@/lib/realtime'
import { getOrSetIdempotent } from '@/lib/idempotency'

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

    const terminalIdOverride = typeof bodyTerminalId === 'string' && bodyTerminalId.trim() ? bodyTerminalId.trim() : undefined
    const idempotencyKey = typeof clientRequestId === 'string' && clientRequestId.trim() ? clientRequestId.trim().slice(0, 64) : null
    const order = idempotencyKey
      ? await getOrSetIdempotent(idempotencyKey, 'order_create_takeaway', async () => {
          const o = await createTakeawayOrder({ staffId, orderNumber, terminalId: terminalIdOverride })
          emitToShift(o.shiftId, {
            type: 'ORDER_CREATED',
            payload: {
              orderId: o.id,
              shiftId: o.shiftId,
              orderNumber: o.orderNumber,
              status: o.status as 'pending',
              createdAt: o.createdAt.toISOString(),
              forKitchen: true,
            },
          })
          await emitOrderCountsForShift(o.shiftId)
          return o
        })
      : (async () => {
          const o = await createTakeawayOrder({ staffId, orderNumber, terminalId: terminalIdOverride })
          emitToShift(o.shiftId, {
            type: 'ORDER_CREATED',
            payload: {
              orderId: o.id,
              shiftId: o.shiftId,
              orderNumber: o.orderNumber,
              status: o.status as 'pending',
              createdAt: o.createdAt.toISOString(),
              forKitchen: true,
            },
          })
          await emitOrderCountsForShift(o.shiftId)
          return o
        })()

    return NextResponse.json(order)
  } catch (error) {
    return toPosApiResponse(error)
  }
}
