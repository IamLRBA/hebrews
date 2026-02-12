import { NextRequest, NextResponse } from 'next/server'
import { closeShift } from '@/lib/domain/shifts'
import { toPosApiResponse } from '@/lib/pos-api-errors'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shiftId: string }> }
) {
  try {
    const { shiftId } = await params
    if (!shiftId) {
      return NextResponse.json({ error: 'shiftId is required' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const { closedByStaffId, countedCashUgx } = body

    if (typeof closedByStaffId !== 'string' || !closedByStaffId) {
      return NextResponse.json({ error: 'closedByStaffId is required (string)' }, { status: 400 })
    }

    if (typeof countedCashUgx !== 'number') {
      return NextResponse.json({ error: 'countedCashUgx is required (number)' }, { status: 400 })
    }

    const result = await closeShift({
      shiftId,
      closedByStaffId,
      countedCashUgx,
    })
    return NextResponse.json(result)
  } catch (error) {
    return toPosApiResponse(error)
  }
}
