import { NextRequest, NextResponse } from 'next/server'
import { checkoutOrder } from '@/lib/pos-service'
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
    const { updatedByStaffId } = body

    if (typeof updatedByStaffId !== 'string' || !updatedByStaffId) {
      return NextResponse.json({ error: 'updatedByStaffId is required (string)' }, { status: 400 })
    }

    const order = await checkoutOrder({ orderId, updatedByStaffId })
    return NextResponse.json(order)
  } catch (error) {
    return toPosApiResponse(error)
  }
}
