import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedStaff } from '@/lib/pos-auth'
import { closeShift } from '@/lib/domain/shifts'
import { appendAuditLog, AuditActionType, AuditEntityType } from '@/lib/audit-log'
import { toPosApiResponse } from '@/lib/pos-api-errors'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shiftId: string }> }
) {
  try {
    const { staffId } = await getAuthenticatedStaff(request)
    const { shiftId } = await params
    if (!shiftId) {
      return NextResponse.json({ error: 'shiftId is required' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const { closedByStaffId, countedCashUgx, managerApprovalStaffId } = body

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
      managerApprovalStaffId:
        typeof managerApprovalStaffId === 'string' && managerApprovalStaffId.trim()
          ? managerApprovalStaffId.trim()
          : undefined,
    })

    await appendAuditLog({
      staffId,
      actionType: AuditActionType.SHIFT_CLOSE,
      entityType: AuditEntityType.shift,
      entityId: shiftId,
      newState: {
        expectedCash: result.expectedCash,
        countedCashUgx: result.countedCashUgx,
        variance: result.variance,
        managerApprovalRequired: result.managerApprovalRequired,
        managerApprovalStaffId: result.managerApprovalStaffId,
      },
    }).catch(() => {})

    return NextResponse.json(result)
  } catch (error) {
    return toPosApiResponse(error)
  }
}
