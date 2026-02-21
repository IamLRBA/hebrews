import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedStaff, incrementTokenVersion, setLastForcedLogoutAt } from '@/lib/pos-auth'
import { getOptionalTerminal } from '@/lib/terminal'
import { appendAuditLog, AuditActionType, AuditEntityType } from '@/lib/audit-log'
import { toPosApiResponse } from '@/lib/pos-api-errors'
import { logError } from '@/lib/error-logger'

/**
 * Logout all devices: increment Staff.tokenVersion so all existing JWTs are rejected.
 * Records AUTH_LOGOUT audit with event 'logout_all'. Client should clear local token after calling.
 */
export async function POST(request: NextRequest) {
  try {
    const { staffId } = await getAuthenticatedStaff(request)
    const terminal = await getOptionalTerminal(request).catch(() => null)

    await incrementTokenVersion(staffId)
    await setLastForcedLogoutAt(staffId)

    await appendAuditLog({
      staffId,
      terminalId: terminal?.code ?? undefined,
      actionType: AuditActionType.AUTH_LOGOUT,
      entityType: AuditEntityType.auth,
      entityId: staffId,
      newState: { event: 'logout_all' },
    }).catch((e) => logError(e, { staffId, path: '/api/auth/logout-all' }))

    return NextResponse.json({ ok: true })
  } catch (e) {
    return toPosApiResponse(e)
  }
}
