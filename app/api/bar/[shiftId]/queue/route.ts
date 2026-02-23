import { NextRequest, NextResponse } from 'next/server'
import { getBarQueueFromAllActiveShifts } from '@/lib/domain/orders'
import { toPosApiResponse } from '@/lib/pos-api-errors'

/**
 * Returns bar queue: all pending, preparing, and ready orders from any active shift
 * that were sent to bar (sentToBarAt set).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shiftId: string }> }
) {
  try {
    await params
    const queue = await getBarQueueFromAllActiveShifts()
    return NextResponse.json(queue)
  } catch (error) {
    return toPosApiResponse(error)
  }
}
