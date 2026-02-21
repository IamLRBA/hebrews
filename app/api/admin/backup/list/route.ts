import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedStaff } from '@/lib/pos-auth'
import { assertStaffRole } from '@/lib/domain/role-guard'
import { listBackups } from '@/lib/backup/database-backup'
import { toPosApiResponse } from '@/lib/pos-api-errors'

/**
 * GET /api/admin/backup/list?type=FULL|INCREMENTAL&status=SUCCESS|FAILED&limit=50
 * Admin-only. Returns backup metadata list.
 */
export async function GET(request: NextRequest) {
  try {
    const { staffId } = await getAuthenticatedStaff(request)
    await assertStaffRole(staffId, ['admin'])

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as 'FULL' | 'INCREMENTAL' | undefined
    const status = searchParams.get('status') as 'SUCCESS' | 'FAILED' | undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50

    const backups = await listBackups({ type, status, limit })
    return NextResponse.json(backups)
  } catch (error) {
    return toPosApiResponse(error)
  }
}
