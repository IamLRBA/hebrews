import { NextRequest, NextResponse } from 'next/server'
import { payOrderCash } from '@/lib/domain/orders'
import { getOrderDetail } from '@/lib/read-models'
import { toPosApiResponse } from '@/lib/pos-api-errors'
import { getAuthenticatedStaff } from '@/lib/pos-auth'
import { getOptionalTerminal } from '@/lib/terminal'
import { appendAuditLog, AuditActionType, AuditEntityType } from '@/lib/audit-log'
import { logError } from '@/lib/error-logger'

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

    await payOrderCash({
      orderId,
      amountReceivedUgx: amountUgx,
      staffId,
      terminalId: terminal?.code ?? null,
    })
    await appendAuditLog({
      staffId,
      terminalId: terminal?.code ?? undefined,
      actionType: AuditActionType.PAYMENT,
      entityType: AuditEntityType.payment,
      entityId: orderId,
      newState: { method: 'cash', amountUgx },
    }).catch((e) => logError(e, { staffId, terminalId: terminal?.code, path: request.nextUrl?.pathname }))

    const order = await getOrderDetail(orderId)
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    return NextResponse.json(order)
  } catch (error) {
    return toPosApiResponse(error)
  }
}
