import { NextRequest, NextResponse } from 'next/server'
import { updateKitchenStatus } from '@/lib/domain/orders'
import { toPosApiResponse } from '@/lib/pos-api-errors'

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
    const { newStatus, staffId } = body

    if (!VALID_STATUSES.includes(newStatus)) {
      return NextResponse.json(
        { error: 'newStatus must be one of: preparing, ready' },
        { status: 400 }
      )
    }

    if (typeof staffId !== 'string' || !staffId) {
      return NextResponse.json({ error: 'staffId is required (string)' }, { status: 400 })
    }

    const updatedOrderId = await updateKitchenStatus({ orderId, newStatus, staffId })
    return NextResponse.json({ orderId: updatedOrderId })
  } catch (error) {
    return toPosApiResponse(error)
  }
}
