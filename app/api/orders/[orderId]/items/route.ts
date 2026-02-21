import { NextRequest, NextResponse } from 'next/server'
import { addItemToOrder } from '@/lib/domain/orders'
import { getOrderDetail } from '@/lib/read-models'
import { toPosApiResponse } from '@/lib/pos-api-errors'
import { getOrSetIdempotent } from '@/lib/idempotency'

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
    const { productId, quantity = 1, size, modifier, notes, clientRequestId } = body

    if (typeof productId !== 'string' || !productId) {
      return NextResponse.json({ error: 'productId is required (string)' }, { status: 400 })
    }
    if (typeof quantity !== 'number' || quantity < 1) {
      return NextResponse.json({ error: 'quantity is required (number >= 1)' }, { status: 400 })
    }

    const idempotencyKey = typeof clientRequestId === 'string' && clientRequestId.trim() ? clientRequestId.trim().slice(0, 64) : null
    const order = idempotencyKey
      ? await getOrSetIdempotent(idempotencyKey, 'add_item', async () => {
          await addItemToOrder({
            orderId,
            productId,
            quantity,
            size: size ?? null,
            modifier: modifier ?? null,
            notes: notes ?? null,
          })
          const detail = await getOrderDetail(orderId)
          if (!detail) throw new Error('Order not found')
          return detail
        })
      : (async () => {
          await addItemToOrder({
            orderId,
            productId,
            quantity,
            size: size ?? null,
            modifier: modifier ?? null,
            notes: notes ?? null,
          })
          const detail = await getOrderDetail(orderId)
          if (!detail) throw new Error('Order not found')
          return detail
        })()

    return NextResponse.json(order)
  } catch (error) {
    return toPosApiResponse(error)
  }
}
