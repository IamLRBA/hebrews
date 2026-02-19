import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { assertStaffRole } from '@/lib/domain/role-guard'

const STAFF_ID_HEADER = 'x-staff-id'

export async function GET(request: NextRequest) {
  try {
    const staffId = request.headers.get(STAFF_ID_HEADER)?.trim()
    if (!staffId) {
      return NextResponse.json({ error: 'Staff session required' }, { status: 401 })
    }

    // Kitchen staff can view any active shift
    await assertStaffRole(staffId, ['kitchen', 'manager', 'admin'])

    const shifts = await prisma.shift.findMany({
      where: {
        endTime: null, // Active shifts only
      },
      orderBy: { startTime: 'desc' },
      take: 10,
      include: {
        staff: {
          select: {
            id: true,
            username: true,
            fullName: true,
            role: true,
          },
        },
      },
    })

    return NextResponse.json({
      shifts: shifts.map((shift) => ({
        id: shift.id,
        staffName: shift.staff.fullName,
        terminalId: shift.terminalId,
        startTime: shift.startTime,
      })),
    })
  } catch (error) {
    console.error('[kitchen/shifts] GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch shifts' },
      { status: 500 }
    )
  }
}
