import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedStaff } from '@/lib/pos-auth'
import { getActiveShift } from '@/lib/staff-session'

export async function GET(request: NextRequest) {
  try {
    const { staffId } = await getAuthenticatedStaff(request)
    const shift = await getActiveShift(staffId)

    return NextResponse.json({
      shiftId: shift.id,
      staffId: shift.staffId,
      terminalId: shift.terminalId,
      startTime: shift.startTime,
      endTime: shift.endTime,
    })
  } catch (error: unknown) {
    const err = error as { code?: string; name?: string }
    if (err.name === 'UnauthorizedError' || err.name === 'InvalidTokenError') {
      return NextResponse.json({ error: err instanceof Error ? err.message : 'Unauthorized' }, { status: 401 })
    }
    if (err.code === 'NO_ACTIVE_SHIFT' || err.code === 'STAFF_NOT_FOUND' || err.code === 'STAFF_INACTIVE') {
      return NextResponse.json({ error: err instanceof Error ? err.message : 'No active shift' }, { status: 404 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch active shift' },
      { status: 500 }
    )
  }
}
