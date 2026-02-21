import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { assertStaffRole } from '@/lib/domain/role-guard'
import { getAuthenticatedStaff } from '@/lib/pos-auth'
import { toPosApiResponse } from '@/lib/pos-api-errors'

/**
 * Admin only. Clears Staff.lockedUntil so the account can log in again immediately.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const { staffId } = await getAuthenticatedStaff(request)
    await assertStaffRole(staffId, ['admin'])

    const { staffId: targetStaffId } = await params

    await prisma.staff.update({
      where: { id: targetStaffId },
      data: { lockedUntil: null },
      select: { id: true, username: true, lockedUntil: true },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return toPosApiResponse(error)
  }
}
