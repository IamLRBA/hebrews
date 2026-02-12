import { NextRequest, NextResponse } from 'next/server'
import { getKitchenQueue } from '@/lib/domain/orders'
import { toPosApiResponse } from '@/lib/pos-api-errors'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shiftId: string }> }
) {
  try {
    const { shiftId } = await params
    if (!shiftId) {
      return NextResponse.json({ error: 'shiftId is required' }, { status: 400 })
    }

    const queue = await getKitchenQueue(shiftId)
    return NextResponse.json(queue)
  } catch (error) {
    return toPosApiResponse(error)
  }
}
