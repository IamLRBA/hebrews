import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedStaff } from '@/lib/pos-auth'
import { assertStaffRole } from '@/lib/domain/role-guard'
import { toPosApiResponse } from '@/lib/pos-api-errors'

/**
 * GET /api/shifts/[shiftId]/terminal-cash
 * Returns TerminalCashSummary for the shift (cash per terminal). Manager/admin or shift owner.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shiftId: string }> }
) {
  try {
    const { staffId, role } = await getAuthenticatedStaff(request)
    const { shiftId } = await params
    if (!shiftId) {
      return NextResponse.json({ error: 'shiftId is required' }, { status: 400 })
    }

    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      select: { id: true, staffId: true },
    })
    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }
    const canAccess = shift.staffId === staffId || role === 'manager' || role === 'admin'
    if (!canAccess) {
      return NextResponse.json({ error: 'Access denied to this shift' }, { status: 403 })
    }

    const summaries = await prisma.terminalCashSummary.findMany({
      where: { shiftId },
      orderBy: { terminalId: 'asc' },
    })

    return NextResponse.json({
      shiftId,
      terminals: summaries.map((s) => ({
        terminalId: s.terminalId,
        cashSalesUgx: Number(s.cashSalesUgx),
        dropsUgx: Number(s.dropsUgx),
        adjustmentsUgx: Number(s.adjustmentsUgx),
        expectedBalanceUgx: Number(s.expectedBalanceUgx),
      })),
    })
  } catch (error) {
    return toPosApiResponse(error)
  }
}
