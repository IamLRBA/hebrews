import { NextRequest, NextResponse } from 'next/server'
import { startShift, StaffAlreadyHasActiveShiftError } from '@/lib/shift-lifecycle'
import { getActiveShift } from '@/lib/staff-session'
import { toPosApiResponse } from '@/lib/pos-api-errors'
import { getAuthenticatedStaff } from '@/lib/pos-auth'
import { getTerminalByCode } from '@/lib/terminal'
import { appendAuditLog, AuditActionType, AuditEntityType } from '@/lib/audit-log'
import { logError } from '@/lib/error-logger'

const DEFAULT_TERMINAL_CODE = 'pos-1'

export async function POST(request: NextRequest) {
  try {
    const { staffId } = await getAuthenticatedStaff(request)

    const body = await request.json().catch(() => ({}))
    const terminalCode =
      (typeof body.terminalId === 'string' && body.terminalId.trim()) ||
      request.headers.get('x-terminal-id')?.trim() ||
      DEFAULT_TERMINAL_CODE

    const terminal = await getTerminalByCode(terminalCode)
    if (!terminal || !terminal.isActive) {
      return NextResponse.json(
        { error: terminal ? 'Terminal is inactive' : 'Terminal not found' },
        { status: terminal ? 403 : 404 }
      )
    }

    const shift = await startShift(staffId, terminal.code)

    await appendAuditLog({
      staffId,
      terminalId: terminal.code,
      actionType: AuditActionType.SHIFT_START,
      entityType: AuditEntityType.shift,
      entityId: shift.id,
      newState: { startTime: shift.startTime.toISOString() },
    }).catch((e) => logError(e, { staffId, terminalId: terminal.code, path: request.nextUrl?.pathname }))

    return NextResponse.json({
      shiftId: shift.id,
      staffId: shift.staffId,
      terminalId: shift.terminalId,
      startTime: shift.startTime,
      endTime: shift.endTime,
    })
  } catch (error) {
    if (error instanceof StaffAlreadyHasActiveShiftError) {
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
