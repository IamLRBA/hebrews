import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedStaff } from '@/lib/pos-auth'
import { assertStaffRole } from '@/lib/domain/role-guard'
import { exportFullJSON } from '@/lib/export/data-export'
import { appendAuditLog, AuditActionType, AuditEntityType } from '@/lib/audit-log'
import { toPosApiResponse } from '@/lib/pos-api-errors'

/**
 * GET /api/admin/export/full
 * Admin-only. Full data snapshot as JSON (orders, payments, shifts, staff).
 */
export async function GET(request: NextRequest) {
  try {
    const { staffId } = await getAuthenticatedStaff(request)
    await assertStaffRole(staffId, ['admin'])

    const data = await exportFullJSON()
    await appendAuditLog({
      staffId,
      actionType: AuditActionType.EXPORT_FULL,
      entityType: AuditEntityType.export,
      newState: {
        ordersCount: (data as { orders?: unknown[] }).orders?.length ?? 0,
        paymentsCount: (data as { payments?: unknown[] }).payments?.length ?? 0,
      },
    }).catch(() => {})

    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="full-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    })
  } catch (error) {
    return toPosApiResponse(error)
  }
}
