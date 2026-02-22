import { NextRequest, NextResponse } from 'next/server'
import { getKitchenQueueFromAllActiveShifts } from '@/lib/domain/orders'
import { toPosApiResponse } from '@/lib/pos-api-errors'

/**
 * Returns kitchen queue: all preparing and ready orders from any active shift.
 * Only orders that have been sent to kitchen (via "Send to Kitchen") appear here.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shiftId: string }> }
) {
  try {
    await params
    const queue = await getKitchenQueueFromAllActiveShifts()
    return NextResponse.json(queue)
  } catch (error) {
    return toPosApiResponse(error)
  }
}
