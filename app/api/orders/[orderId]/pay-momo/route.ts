import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { payOrderMomo } from '@/lib/domain/orders'
import { getOrderDetail } from '@/lib/read-models'
import { toPosApiResponse } from '@/lib/pos-api-errors'
import { emitToShift, emitTableEvent, emitOrderCountsForShift } from '@/lib/realtime'
import { triggerReceiptForPayment } from '@/lib/print-jobs'
import { logError } from '@/lib/error-logger'

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
    const { amountUgx, staffId } = body
    if (typeof amountUgx !== 'number' || amountUgx < 0) {
      return NextResponse.json({ error: 'amountUgx is required (number >= 0)' }, { status: 400 })
    }
    if (typeof staffId !== 'string' || !staffId) {
      return NextResponse.json({ error: 'staffId is required (string)' }, { status: 400 })
    }

    await payOrderMomo({ orderId, amountUgx, staffId })

    const latestPayment = await prisma.payment.findFirst({
      where: { orderId, status: 'completed' },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    })
    if (latestPayment) {
      await triggerReceiptForPayment({
        paymentId: latestPayment.id,
        staffId,
        terminalId: null,
      }).catch((e) => logError(e, { path: `pay-momo#triggerReceipt(${orderId})` }))
    }

    const orderRow = await prisma.order.findUnique({
      where: { id: orderId },
      select: { shiftId: true, tableId: true },
    })
    if (orderRow) {
      emitToShift(orderRow.shiftId, {
        type: 'PAYMENT_COMPLETED',
        payload: {
          orderId,
          shiftId: orderRow.shiftId,
          tableId: orderRow.tableId ?? undefined,
          newStatus: 'served',
          amountUgx,
          method: 'mtn_momo',
          completedAt: new Date().toISOString(),
        },
      })
      if (orderRow.tableId) {
        emitTableEvent({
          type: 'TABLE_RELEASED',
          payload: { tableId: orderRow.tableId, releasedAt: new Date().toISOString() },
        })
      }
      await emitOrderCountsForShift(orderRow.shiftId)
    }

    const order = await getOrderDetail(orderId)
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    return NextResponse.json(order)
  } catch (error) {
    return toPosApiResponse(error)
  }
}
