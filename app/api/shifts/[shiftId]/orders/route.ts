import { NextRequest, NextResponse } from 'next/server'
import { getActiveOrdersForShift } from '@/lib/read-models'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shiftId: string }> }
) {
  try {
    const { shiftId } = await params
    if (!shiftId) {
      return NextResponse.json({ error: 'shiftId is required' }, { status: 400 })
    }

    const orders = await getActiveOrdersForShift(shiftId)
    return NextResponse.json(orders)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
