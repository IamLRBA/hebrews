import { NextRequest, NextResponse } from 'next/server'
import { startShift, StaffAlreadyHasActiveShiftError } from '@/lib/shift-lifecycle'
import { getActiveShift } from '@/lib/staff-session'
import { toPosApiResponse } from '@/lib/pos-api-errors'

const STAFF_ID_HEADER = 'x-staff-id'
const DEFAULT_TERMINAL_ID = 'pos-1'

export async function POST(request: NextRequest) {
  try {
    const staffId = request.headers.get(STAFF_ID_HEADER)?.trim()
    if (!staffId) {
      return NextResponse.json({ error: 'Staff session required (x-staff-id)' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const terminalId =
      typeof body.terminalId === 'string' && body.terminalId.trim()
        ? body.terminalId.trim()
        : DEFAULT_TERMINAL_ID

    const shift = await startShift(staffId, terminalId)

    return NextResponse.json({
      shiftId: shift.id,
      staffId: shift.staffId,
      terminalId: shift.terminalId,
      startTime: shift.startTime,
      endTime: shift.endTime,
    })
  } catch (error) {
    if (error instanceof StaffAlreadyHasActiveShiftError) {
      // Staff already has an active shift — return it so the client can continue
      const shift = await getActiveShift(error.staffId)
      return NextResponse.json({
        shiftId: shift.id,
        staffId: shift.staffId,
        terminalId: shift.terminalId,
        startTime: shift.startTime,
        endTime: shift.endTime,
      })
    }
    return toPosApiResponse(error)
  }
}
