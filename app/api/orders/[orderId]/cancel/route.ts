import { NextRequest, NextResponse } from 'next/server'
import { cancelOrder } from '@/lib/pos-service'
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
    const { cancelledByStaffId } = body

    if (typeof cancelledByStaffId !== 'string' || !cancelledByStaffId) {
      return NextResponse.json({ error: 'cancelledByStaffId is required (string)' }, { status: 400 })
    }

    const order = await cancelOrder({ orderId, cancelledByStaffId })
    return NextResponse.json(order)
  } catch (error) {
    return toPosApiResponse(error)
  }
}
