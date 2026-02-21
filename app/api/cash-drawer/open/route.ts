import { NextRequest, NextResponse } from 'next/server'
import { openCashDrawerManual } from '@/lib/print-jobs'
import { toPosApiResponse } from '@/lib/pos-api-errors'
import { getAuthenticatedStaff } from '@/lib/pos-auth'
import { getOptionalTerminal } from '@/lib/terminal'
import { assertStaffRole } from '@/lib/domain/role-guard'

const MANUAL_DRAWER_ROLES = ['manager', 'admin'] as const

/**
 * POST /api/cash-drawer/open
 * Manual cash drawer open. Manager or admin only. Audited as CASH_DRAWER_MANUAL_OPEN.
 */
export async function POST(request: NextRequest) {
  try {
    const { staffId } = await getAuthenticatedStaff(request)
    await assertStaffRole(staffId, [...MANUAL_DRAWER_ROLES])

    const terminal = await getOptionalTerminal(request).catch(() => null)
    const body = await request.json().catch(() => ({}))
    const deviceId = typeof body?.deviceId === 'string' ? body.deviceId : undefined

    const result = await openCashDrawerManual({
      staffId,
      terminalId: terminal?.code ?? null,
      deviceId: deviceId ?? null,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? 'Drawer open failed' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    return toPosApiResponse(error)
  }
}
