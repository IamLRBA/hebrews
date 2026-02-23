import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedStaff } from '@/lib/pos-auth'
import { getOrderDetail } from '@/lib/read-models'
import { toPosApiResponse } from '@/lib/pos-api-errors'
import { acquireTableOccupancy, getTableOccupancyConflict } from '@/lib/table-occupancy'
import { emitToShift, emitOrderCountsForShift } from '@/lib/realtime'
import { triggerKitchenTicketForOrder } from '@/lib/print-jobs'
import { logError } from '@/lib/error-logger'

/**
 * Submits order to kitchen: marks order as sent (sentToKitchenAt) but keeps status pending.
 * Kitchen staff then clicks "Start Preparing" to transition pending → preparing.
 * Optionally sets orderType and tableId (for dine-in). If dine-in with tableId, acquires table occupancy.
 * Returns full order detail so frontend can update state without refetch.
 * Rejects if order has no items.
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
    const { staffId } = await getAuthenticatedStaff(request)
    const updatedByStaffId = body.updatedByStaffId ?? staffId
    if (typeof updatedByStaffId !== 'string' || !updatedByStaffId) {
      return NextResponse.json({ error: 'updatedByStaffId required' }, { status: 400 })
    }

    const orderType = body.orderType === 'dine_in' || body.orderType === 'takeaway' ? body.orderType : undefined
    const tableId = typeof body.tableId === 'string' && body.tableId.trim() ? body.tableId.trim() : null
    const destination = body.destination === 'bar' ? 'bar' : 'kitchen'
    const preparationNotes = typeof body.preparationNotes === 'string' ? body.preparationNotes.trim() || null : null

    const itemCount = await prisma.orderItem.count({ where: { orderId } })
    if (itemCount === 0) {
      return NextResponse.json(
        { error: 'Order has no items. Add at least one product before sending to kitchen.' },
        { status: 400 }
      )
    }

    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      select: { terminalId: true, orderType: true, tableId: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (orderType === 'dine_in' && tableId) {
      const conflict = await getTableOccupancyConflict(tableId, orderId)
      if (conflict) {
        return NextResponse.json(
          { error: `Table is already occupied by another order (terminal ${conflict.terminalId}).` },
          { status: 409 }
        )
      }
    }

    if (orderType !== undefined) {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          orderType,
          ...(orderType === 'dine_in' && tableId && { tableId }),
          ...(orderType === 'takeaway' && { tableId: null }),
        },
      })
    } else if (tableId) {
      await prisma.order.update({
        where: { id: orderId },
        data: { tableId },
      })
    }

    if (orderType === 'dine_in' && tableId) {
      const terminalId = existing.terminalId ?? 'pos'
      await acquireTableOccupancy({
        tableId,
        orderId,
        terminalId,
        staffId: updatedByStaffId,
      })
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        ...(destination === 'kitchen' ? { sentToKitchenAt: new Date() } : { sentToBarAt: new Date() }),
        preparationNotes,
        updatedByStaffId,
      },
      select: { shiftId: true, tableId: true, status: true, updatedAt: true },
    })

    if (destination === 'kitchen') {
      await triggerKitchenTicketForOrder({
        orderId,
        staffId: updatedByStaffId,
        terminalId: existing.terminalId ?? null,
        isReprint: false,
      }).catch((e) => logError(e, { path: `orders/submit#triggerKitchenTicket(${orderId})` }))
    }

    const order = await getOrderDetail(orderId)
    emitToShift(updated.shiftId, {
      type: destination === 'bar' ? 'ORDER_SENT_TO_BAR' : 'ORDER_SENT_TO_KITCHEN',
      payload: {
        orderId,
        shiftId: updated.shiftId,
        tableId: updated.tableId ?? undefined,
        status: updated.status,
        updatedAt: updated.updatedAt.toISOString(),
        forKitchen: destination === 'kitchen',
        forBar: destination === 'bar',
        orderNumber: order?.orderNumber,
      },
    })
    await emitOrderCountsForShift(updated.shiftId)
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    return NextResponse.json(order)
  } catch (error) {
    return toPosApiResponse(error)
  }
}
