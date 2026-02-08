import { NextRequest, NextResponse } from 'next/server'
import { closeShift } from '@/lib/pos-service'
import { toPosApiResponse } from '@/lib/pos-api-errors'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shiftId: string }> }
) {
  try {
    const { shiftId } = await params
    if (!shiftId) {
      return NextResponse.json({ error: 'Missing shiftId' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const { closedByStaffId, declaredCashUgx } = body

    if (typeof closedByStaffId !== 'string' || !closedByStaffId) {
      return NextResponse.json({ error: 'closedByStaffId is required (string)' }, { status: 400 })
    }

    const result = await closeShift({
      shiftId,
      closedByStaffId,
      declaredCashUgx: typeof declaredCashUgx === 'number' ? declaredCashUgx : undefined,
    })
    return NextResponse.json(result)
  } catch (error) {
    return toPosApiResponse(error)
  }
}
