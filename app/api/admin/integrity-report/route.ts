import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedStaff } from '@/lib/pos-auth'
import { assertStaffRole } from '@/lib/domain/role-guard'
import { runIntegrityChecks, groupBySeverity } from '@/lib/integrity/integrity-check'
import { appendAuditLog, AuditActionType, AuditEntityType } from '@/lib/audit-log'
import { toPosApiResponse } from '@/lib/pos-api-errors'

/**
 * GET /api/admin/integrity-report
 * Admin-only. Returns issues categorized by severity.
 */
export async function GET(request: NextRequest) {
  try {
    const { staffId } = await getAuthenticatedStaff(request)
    await assertStaffRole(staffId, ['admin'])

    const issues = await runIntegrityChecks()
    const bySeverity = groupBySeverity(issues)

    await appendAuditLog({
      staffId,
      actionType: AuditActionType.INTEGRITY_CHECK,
      entityType: AuditEntityType.integrity,
      newState: {
        total: issues.length,
        critical: bySeverity.critical.length,
        warning: bySeverity.warning.length,
        info: bySeverity.info.length,
      },
    }).catch(() => {})

    return NextResponse.json({
      at: new Date().toISOString(),
      total: issues.length,
      critical: bySeverity.critical,
      warning: bySeverity.warning,
      info: bySeverity.info,
      issues,
    })
  } catch (error) {
    return toPosApiResponse(error)
  }
}
