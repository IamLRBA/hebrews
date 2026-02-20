import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { assertStaffRole } from '@/lib/domain/role-guard'
import { getAuthenticatedStaff } from '@/lib/pos-auth'
import { incrementTokenVersion } from '@/lib/pos-auth'
import { toPosApiResponse } from '@/lib/pos-api-errors'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const { staffId } = await getAuthenticatedStaff(request)
    await assertStaffRole(staffId, ['admin'])

    const { staffId: targetStaffId } = await params
    const body = await request.json()
    const { isActive } = body

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive must be a boolean' }, { status: 400 })
    }

    const updatedStaff = await prisma.staff.update({
      where: { id: targetStaffId },
      data: { isActive },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
      },
    })

    if (!isActive) {
      await incrementTokenVersion(targetStaffId)
    }

    return NextResponse.json(updatedStaff)
  } catch (error) {
    return toPosApiResponse(error)
  }
}
