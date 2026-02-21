import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { updateKitchenStatus } from '@/lib/domain/orders'
import { toPosApiResponse } from '@/lib/pos-api-errors'
import { emitToShift, emitOrderCountsForShift } from '@/lib/realtime'
import { triggerKitchenTicketForOrder } from '@/lib/print-jobs'
import { logError } from '@/lib/error-logger'
import { getOrSetIdempotent } from '@/lib/idempotency'

const VALID_STATUSES = ['preparing', 'ready'] as const

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
    const { newStatus, staffId, clientRequestId } = body

    if (!VALID_STATUSES.includes(newStatus)) {
      return NextResponse.json(
        { error: 'newStatus must be one of: preparing, ready' },
        { status: 400 }
      )
    }

    if (typeof staffId !== 'string' || !staffId) {
      return NextResponse.json({ error: 'staffId is required (string)' }, { status: 400 })
    }

    const idempotencyKey = typeof clientRequestId === 'string' && clientRequestId.trim() ? clientRequestId.trim().slice(0, 64) : null
    const result = idempotencyKey
      ? await getOrSetIdempotent(idempotencyKey, 'kitchen_status', async () => {
          await updateKitchenStatus({ orderId, newStatus, staffId })
          if (newStatus === 'preparing') {
            await triggerKitchenTicketForOrder({
              orderId,
              staffId,
              terminalId: null,
              isReprint: false,
            }).catch((e) => logError(e, { path: `kitchen/status#triggerKitchenTicket(${orderId})` }))
          }
          const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: { shiftId: true, tableId: true, status: true, updatedAt: true },
          })
          if (order) {
            const previousStatus = newStatus === 'preparing' ? 'pending' : 'preparing'
            const newStatusValue = newStatus === 'ready' ? 'awaiting_payment' : newStatus
            emitToShift(order.shiftId, {
              type: 'ORDER_STATUS_CHANGED',
              payload: {
                orderId,
                shiftId: order.shiftId,
                tableId: order.tableId ?? undefined,
                previousStatus,
                newStatus: newStatusValue as 'preparing' | 'awaiting_payment',
                updatedAt: order.updatedAt.toISOString(),
                forKitchen: true,
              },
            })
            await emitOrderCountsForShift(order.shiftId)
          }
          return { orderId }
        })
      : (async () => {
          await updateKitchenStatus({ orderId, newStatus, staffId })
          if (newStatus === 'preparing') {
            await triggerKitchenTicketForOrder({
              orderId,
              staffId,
              terminalId: null,
              isReprint: false,
            }).catch((e) => logError(e, { path: `kitchen/status#triggerKitchenTicket(${orderId})` }))
          }
          const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: { shiftId: true, tableId: true, status: true, updatedAt: true },
          })
          if (order) {
            const previousStatus = newStatus === 'preparing' ? 'pending' : 'preparing'
            const newStatusValue = newStatus === 'ready' ? 'awaiting_payment' : newStatus
            emitToShift(order.shiftId, {
              type: 'ORDER_STATUS_CHANGED',
              payload: {
                orderId,
                shiftId: order.shiftId,
                tableId: order.tableId ?? undefined,
                previousStatus,
                newStatus: newStatusValue as 'preparing' | 'awaiting_payment',
                updatedAt: order.updatedAt.toISOString(),
                forKitchen: true,
              },
            })
            await emitOrderCountsForShift(order.shiftId)
          }
          return { orderId }
        })()

    return NextResponse.json(result)
  } catch (error) {
    return toPosApiResponse(error)
  }
}
