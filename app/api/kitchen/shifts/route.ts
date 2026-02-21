import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedStaff } from '@/lib/pos-auth'
import { assertStaffRole } from '@/lib/domain/role-guard'

export async function GET(request: NextRequest) {
  try {
    const { staffId } = await getAuthenticatedStaff(request)
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
