import { NextRequest, NextResponse } from 'next/server'
import { getActiveShift } from '@/lib/staff-session'

const STAFF_ID_HEADER = 'x-staff-id'

export async function GET(request: NextRequest) {
  try {
    const staffId = request.headers.get(STAFF_ID_HEADER)?.trim()
    if (!staffId) {
      return NextResponse.json({ error: 'Staff session required' }, { status: 400 })
    }

    const shift = await getActiveShift(staffId)

    return NextResponse.json({
      shiftId: shift.id,
      staffId: shift.staffId,
      terminalId: shift.terminalId,
      startTime: shift.startTime,
      endTime: shift.endTime,
    })
  } catch (error: unknown) {
    const err = error as { code?: string }
    if (err.code === 'NO_ACTIVE_SHIFT' || err.code === 'STAFF_NOT_FOUND' || err.code === 'STAFF_INACTIVE') {
      return NextResponse.json({ error: err instanceof Error ? err.message : 'No active shift' }, { status: 404 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch active shift' },
      { status: 500 }
    )
  }
}
