import { NextRequest, NextResponse } from 'next/server'
import { updateOrderItemQuantity, removeOrderItem } from '@/lib/domain/orders'
import { getOrderDetail } from '@/lib/read-models'
import { toPosApiResponse } from '@/lib/pos-api-errors'

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
    const order = await getOrderDetail(orderId)
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    return NextResponse.json(order)
  } catch (error) {
    return toPosApiResponse(error)
  }
}
