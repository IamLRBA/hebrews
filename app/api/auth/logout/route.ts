import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedStaff } from '@/lib/pos-auth'
import { getOptionalTerminal } from '@/lib/terminal'
import { appendAuditLog, AuditActionType, AuditEntityType } from '@/lib/audit-log'
import { toPosApiResponse } from '@/lib/pos-api-errors'
import { logError } from '@/lib/error-logger'

/**
 * Explicit logout: record AUTH_LOGOUT in audit for shift/security tracking.
 * Client should clear token after calling. Token remains valid until expiry unless logout-all was used.
 */
export async function POST(request: NextRequest) {
  try {
    const { staffId } = await getAuthenticatedStaff(request)
    const terminal = await getOptionalTerminal(request).catch(() => null)

    await appendAuditLog({
      staffId,
      terminalId: terminal?.code ?? undefined,
      actionType: AuditActionType.AUTH_LOGOUT,
      entityType: AuditEntityType.auth,
      entityId: staffId,
      newState: { event: 'logout' },
    }).catch((e) => logError(e, { staffId, path: '/api/auth/logout' }))

    return NextResponse.json({ ok: true })
  } catch (e) {
    return toPosApiResponse(e)
  }
}
