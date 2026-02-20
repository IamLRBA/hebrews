import { NextRequest, NextResponse } from 'next/server'
import { getKitchenQueueFromAllActiveShifts } from '@/lib/domain/orders'
import { toPosApiResponse } from '@/lib/pos-api-errors'

/**
 * Returns kitchen queue: all pending and preparing orders from any active shift.
 * Kitchen sees all current orders regardless of which cashier/terminal created them.
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
