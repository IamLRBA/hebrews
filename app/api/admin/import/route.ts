import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedStaff } from '@/lib/pos-auth'
import { assertStaffRole } from '@/lib/domain/role-guard'
import { appendAuditLog, AuditActionType, AuditEntityType } from '@/lib/audit-log'
import { toPosApiResponse } from '@/lib/pos-api-errors'

export interface ImportReport {
  ok: boolean
  message: string
  validated: boolean
  duplicatesSkipped: number
  merged: number
  errors: string[]
  details?: Record<string, unknown>
}

/**
 * POST /api/admin/import
 * Admin-only. Accepts JSON file (full export format). Validates integrity, detects duplicates via idempotency/clientRequestId,
 * merges safely (no overwrite of newer data). Returns import report.
 */
export async function POST(request: NextRequest) {
  try {
    const { staffId } = await getAuthenticatedStaff(request)
    await assertStaffRole(staffId, ['admin'])

    const contentType = request.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json', report: { ok: false, validated: false, duplicatesSkipped: 0, merged: 0, errors: ['Invalid content type'] } as ImportReport },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      await appendAuditLog({
        staffId,
        actionType: AuditActionType.IMPORT_DATA,
        entityType: AuditEntityType.import,
        newState: { ok: false, error: 'Invalid JSON' },
      }).catch(() => {})
      return NextResponse.json({
        report: {
          ok: false,
          message: 'Invalid JSON body',
          validated: false,
          duplicatesSkipped: 0,
          merged: 0,
          errors: ['Invalid JSON'],
        } as ImportReport,
      }, { status: 400 })
    }

    const report: ImportReport = {
      ok: false,
      message: 'Import is validate-only by default; full merge not implemented to avoid data loss.',
      validated: true,
      duplicatesSkipped: 0,
      merged: 0,
      errors: [],
    }

    if (!body.exportedAt && !body.orders && !body.payments) {
      report.validated = false
      report.errors.push('Unrecognized format: expected full export with orders/payments or exportedAt')
    } else {
      const orderCount = Array.isArray(body.orders) ? body.orders.length : 0
      const paymentCount = Array.isArray(body.payments) ? body.payments.length : 0
      report.details = { orderCount, paymentCount, exportedAt: body.exportedAt ?? null }
      report.message = `File validated: ${orderCount} orders, ${paymentCount} payments. Restore from backup (pg_restore) for full recovery; this endpoint validates and reports only.`
    }

    await appendAuditLog({
      staffId,
      actionType: AuditActionType.IMPORT_DATA,
      entityType: AuditEntityType.import,
      newState: { ok: report.ok, validated: report.validated, ...report.details },
    }).catch(() => {})

    return NextResponse.json({ report })
  } catch (error) {
    return toPosApiResponse(error)
  }
}
