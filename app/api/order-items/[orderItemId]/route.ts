import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { updateOrderItemQuantity, removeOrderItem } from '@/lib/domain/orders'
import { getOrderDetail } from '@/lib/read-models'
import { toPosApiResponse } from '@/lib/pos-api-errors'
import { emitToShift } from '@/lib/realtime'

async function emitOrderUpdated(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { shiftId: true, tableId: true, status: true, updatedAt: true },
  })
  if (order) {
    emitToShift(order.shiftId, {
      type: 'ORDER_UPDATED',
      payload: {
        orderId,
        shiftId: order.shiftId,
        tableId: order.tableId ?? undefined,
        status: order.status as 'pending' | 'preparing' | 'ready' | 'awaiting_payment' | 'served' | 'cancelled',
        updatedAt: order.updatedAt.toISOString(),
        forKitchen: true,
      },
    })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderItemId: string }> }
) {
  try {
    const { orderItemId } = await params
    if (!orderItemId) {
      return NextResponse.json({ error: 'orderItemId is required' }, { status: 400 })
    }

    const body = await request.json()
    const quantity = body.quantity
    if (typeof quantity !== 'number' || quantity < 1) {
      return NextResponse.json({ error: 'quantity is required (number >= 1)' }, { status: 400 })
    }

    const orderId = await updateOrderItemQuantity({ orderItemId, quantity })
    emitOrderUpdated(orderId)
    const order = await getOrderDetail(orderId)
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    return NextResponse.json(order)
  } catch (error) {
    return toPosApiResponse(error)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ orderItemId: string }> }
) {
  try {
    const { orderItemId } = await params
    if (!orderItemId) {
      return NextResponse.json({ error: 'orderItemId is required' }, { status: 400 })
    }

    const orderId = await removeOrderItem({ orderItemId })
    emitOrderUpdated(orderId)
    const order = await getOrderDetail(orderId)
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    return NextResponse.json(order)
  } catch (error) {
    return toPosApiResponse(error)
  }
}
