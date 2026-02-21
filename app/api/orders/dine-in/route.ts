import { NextRequest, NextResponse } from 'next/server'
import { createDineInOrder } from '@/lib/domain/orders'
import { toPosApiResponse } from '@/lib/pos-api-errors'
import { emitToShift, emitTableEvent, emitOrderCountsForShift } from '@/lib/realtime'
import { getOrSetIdempotent } from '@/lib/idempotency'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tableId, createdByStaffId, orderNumber, clientRequestId, terminalId: bodyTerminalId } = body

    if (typeof tableId !== 'string' || !tableId) {
      return NextResponse.json({ error: 'tableId is required (string)' }, { status: 400 })
    }
    if (typeof createdByStaffId !== 'string' || !createdByStaffId) {
      return NextResponse.json({ error: 'createdByStaffId is required (string)' }, { status: 400 })
    }

    const terminalIdOverride = typeof bodyTerminalId === 'string' && bodyTerminalId.trim() ? bodyTerminalId.trim() : undefined
    const idempotencyKey = typeof clientRequestId === 'string' && clientRequestId.trim() ? clientRequestId.trim().slice(0, 64) : null
    const order = idempotencyKey
      ? await getOrSetIdempotent(idempotencyKey, 'order_create_dine_in', async () => {
          const o = await createDineInOrder({
            tableId,
            createdByStaffId,
            ...(typeof orderNumber === 'string' && orderNumber.trim() ? { orderNumber: orderNumber.trim() } : {}),
            ...(terminalIdOverride ? { terminalId: terminalIdOverride } : {}),
          })
          emitToShift(o.shiftId, {
            type: 'ORDER_CREATED',
            payload: {
              orderId: o.id,
              shiftId: o.shiftId,
              tableId: o.tableId ?? undefined,
              orderNumber: o.orderNumber,
              status: o.status as 'pending',
              assignedWaiterId: o.assignedWaiterId ?? undefined,
              createdAt: o.createdAt.toISOString(),
              forKitchen: true,
            },
          })
          if (o.tableId) {
            emitTableEvent({
              type: 'TABLE_OCCUPIED',
              payload: { tableId: o.tableId, orderId: o.id, at: o.createdAt.toISOString() },
            })
          }
          await emitOrderCountsForShift(o.shiftId)
          return o
        })
      : (async () => {
          const o = await createDineInOrder({
            tableId,
            createdByStaffId,
            ...(typeof orderNumber === 'string' && orderNumber.trim() ? { orderNumber: orderNumber.trim() } : {}),
            ...(terminalIdOverride ? { terminalId: terminalIdOverride } : {}),
          })
          emitToShift(o.shiftId, {
            type: 'ORDER_CREATED',
            payload: {
              orderId: o.id,
              shiftId: o.shiftId,
              tableId: o.tableId ?? undefined,
              orderNumber: o.orderNumber,
              status: o.status as 'pending',
              assignedWaiterId: o.assignedWaiterId ?? undefined,
              createdAt: o.createdAt.toISOString(),
              forKitchen: true,
            },
          })
          if (o.tableId) {
            emitTableEvent({
              type: 'TABLE_OCCUPIED',
              payload: { tableId: o.tableId, orderId: o.id, at: o.createdAt.toISOString() },
            })
          }
          await emitOrderCountsForShift(o.shiftId)
          return o
        })()

    return NextResponse.json(order)
  } catch (error) {
    return toPosApiResponse(error)
  }
}
