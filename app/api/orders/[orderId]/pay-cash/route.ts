import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { payOrderCash } from '@/lib/domain/orders'
import { getOrderDetail } from '@/lib/read-models'
import { toPosApiResponse } from '@/lib/pos-api-errors'
import { getAuthenticatedStaff } from '@/lib/pos-auth'
import { getOptionalTerminal } from '@/lib/terminal'
import { appendAuditLog, AuditActionType, AuditEntityType } from '@/lib/audit-log'
import { logError } from '@/lib/error-logger'
import { emitToShift, emitTableEvent, emitOrderCountsForShift } from '@/lib/realtime'
import { triggerReceiptForPayment, openCashDrawerForPayment } from '@/lib/print-jobs'
import { getOrSetIdempotent } from '@/lib/idempotency'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { staffId } = await getAuthenticatedStaff(request)
    const terminal = await getOptionalTerminal(request).catch(() => null)

    const { orderId } = await params
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    const body = await request.json()
    const amountUgx = body?.amountUgx
    if (typeof amountUgx !== 'number' || amountUgx < 0) {
      return NextResponse.json({ error: 'amountUgx is required (number >= 0)' }, { status: 400 })
    }

    // Use terminal from request header (live) or body (sync); normalize for DB
    const { normalizeTerminalCode } = await import('@/lib/terminal')
    const bodyTerminalId = typeof body?.terminalId === 'string' && body.terminalId.trim() ? body.terminalId.trim() : null
    const terminalCode = terminal?.code ?? (bodyTerminalId ? normalizeTerminalCode(bodyTerminalId) : null)

    const idempotencyKey = typeof body?.clientRequestId === 'string' && body.clientRequestId.trim() ? body.clientRequestId.trim().slice(0, 64) : null
    const runPayment = async () => {
      await payOrderCash({
        orderId,
        amountReceivedUgx: amountUgx,
        staffId,
        terminalId: terminalCode,
      })
      await appendAuditLog({
      staffId,
      terminalId: terminalCode ?? undefined,
      actionType: AuditActionType.PAYMENT,
      entityType: AuditEntityType.payment,
      entityId: orderId,
      newState: { method: 'cash', amountUgx },
    }).catch((e) => logError(e, { staffId, terminalId: terminalCode, path: request.nextUrl?.pathname }))

      const latestPayment = await prisma.payment.findFirst({
        where: { orderId, status: 'completed' },
        orderBy: { createdAt: 'desc' },
        select: { id: true, method: true, terminalId: true },
      })
      if (latestPayment) {
        await triggerReceiptForPayment({
          paymentId: latestPayment.id,
          staffId,
          terminalId: terminalCode ?? null,
        }).catch((e) => logError(e, { path: `pay-cash#triggerReceipt(${orderId})` }))
        // Phase 9: open drawer ONLY when request came from a live terminal (x-terminal-id);
        // sync replay has no header, so we skip drawer to avoid opening on wrong device
        if (terminal) {
          await openCashDrawerForPayment({
            paymentId: latestPayment.id,
            staffId,
            terminalId: terminal.code,
            requestTerminalId: terminal.code,
          }).catch((e) => logError(e, { path: `pay-cash#openDrawer(${orderId})` }))
        }
      }

      const orderRow = await prisma.order.findUnique({
        where: { id: orderId },
        select: { shiftId: true, tableId: true, totalUgx: true },
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
            method: 'cash',
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
      if (!order) throw new Error('Order not found')
      return order
    }

    const order = idempotencyKey
      ? await getOrSetIdempotent(idempotencyKey, 'pay_cash', runPayment)
      : await runPayment()

    return NextResponse.json(order)
  } catch (error) {
    return toPosApiResponse(error)
  }
}
