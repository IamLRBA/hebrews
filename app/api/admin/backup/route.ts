import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedStaff } from '@/lib/pos-auth'
import { assertStaffRole } from '@/lib/domain/role-guard'
import { listBackups } from '@/lib/backup/database-backup'
import { toPosApiResponse } from '@/lib/pos-api-errors'

/**
 * GET /api/admin/backup
 * Admin-only. List recent backups (metadata from DatabaseBackup).
 */
export async function GET(request: NextRequest) {
  try {
    const { staffId } = await getAuthenticatedStaff(request)
    await assertStaffRole(staffId, ['admin'])

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const type = searchParams.get('type') === 'INCREMENTAL' ? 'INCREMENTAL' : undefined

    const backups = await listBackups({ limit, type })
    return NextResponse.json({
      backups: backups.map((b) => ({
        id: b.id,
        filename: b.filename,
        sizeBytes: b.sizeBytes,
        createdAt: b.createdAt.toISOString(),
        type: b.type,
        status: b.status,
      })),
    })
  } catch (error) {
    return toPosApiResponse(error)
  }
}
