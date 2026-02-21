import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedStaff } from '@/lib/pos-auth'
import { assertStaffRole } from '@/lib/domain/role-guard'
import { runFullBackup } from '@/lib/backup/database-backup'
import { appendAuditLog, AuditActionType, AuditEntityType } from '@/lib/audit-log'
import { toPosApiResponse } from '@/lib/pos-api-errors'

/**
 * POST /api/admin/backup/run
 * Admin-only. Triggers immediate full backup. Returns backup metadata.
 */
export async function POST(request: NextRequest) {
  try {
    const { staffId } = await getAuthenticatedStaff(request)
    await assertStaffRole(staffId, ['admin'])

    const result = await runFullBackup()

    await appendAuditLog({
      staffId,
      actionType: AuditActionType.BACKUP_CREATED,
      entityType: AuditEntityType.backup,
      entityId: result.id,
      newState: {
        filename: result.filename,
        type: result.type,
        status: result.status,
        sizeBytes: result.sizeBytes,
      },
    }).catch(() => {})

    return NextResponse.json({
      id: result.id,
      filename: result.filename,
      sizeBytes: result.sizeBytes,
      createdAt: result.createdAt.toISOString(),
      type: result.type,
      status: result.status,
    })
  } catch (error) {
    return toPosApiResponse(error)
  }
}
