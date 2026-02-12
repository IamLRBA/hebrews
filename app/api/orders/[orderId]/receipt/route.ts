import { NextRequest, NextResponse } from 'next/server'
import { getOrderReceipt } from '@/lib/domain/orders'
import { toPosApiResponse } from '@/lib/pos-api-errors'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    const receipt = await getOrderReceipt(orderId)
    return NextResponse.json(receipt)
  } catch (error) {
    return toPosApiResponse(error)
  }
}
