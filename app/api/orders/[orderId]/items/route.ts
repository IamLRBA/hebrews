import { NextRequest, NextResponse } from 'next/server'
import { addItemToOrder } from '@/lib/pos-service'
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
    const { productId, quantity, size, modifier, notes, sortOrder } = body

    if (typeof productId !== 'string' || !productId) {
      return NextResponse.json({ error: 'productId is required (string)' }, { status: 400 })
    }
    if (typeof quantity !== 'number' || quantity < 1) {
      return NextResponse.json({ error: 'quantity is required (number >= 1)' }, { status: 400 })
    }

    const item = await addItemToOrder({
      orderId,
      productId,
      quantity,
      size: size ?? null,
      modifier: modifier ?? null,
      notes: notes ?? null,
      sortOrder: typeof sortOrder === 'number' ? sortOrder : undefined,
    })
    return NextResponse.json(item)
  } catch (error) {
    return toPosApiResponse(error)
  }
}
