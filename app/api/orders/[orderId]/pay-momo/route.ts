import { NextRequest, NextResponse } from 'next/server'
import { payOrderMomo } from '@/lib/domain/orders'
import { getOrderDetail } from '@/lib/read-models'
import { toPosApiResponse } from '@/lib/pos-api-errors'

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
    const order = await getOrderDetail(orderId)
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    return NextResponse.json(order)
  } catch (error) {
    return toPosApiResponse(error)
  }
}
