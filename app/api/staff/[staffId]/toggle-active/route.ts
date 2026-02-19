import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { assertStaffRole } from '@/lib/domain/role-guard'

const STAFF_ID_HEADER = 'x-staff-id'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const staffId = request.headers.get(STAFF_ID_HEADER)?.trim()
    if (!staffId) {
      return NextResponse.json({ error: 'Staff session required' }, { status: 401 })
    }

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

    return NextResponse.json(updatedStaff)
  } catch (error) {
    console.error('[staff/toggle-active] POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update staff status' },
      { status: 500 }
    )
  }
}
