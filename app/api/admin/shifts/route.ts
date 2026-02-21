import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedStaff } from '@/lib/pos-auth'
import { assertStaffRole } from '@/lib/domain/role-guard'

export async function GET(request: NextRequest) {
  try {
    const { staffId } = await getAuthenticatedStaff(request)
    await assertStaffRole(staffId, ['admin'])

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'active' | 'closed' | 'all'
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    if (status === 'active') {
      where.endTime = null
    } else if (status === 'closed') {
      where.endTime = { not: null }
    }

    const [shifts, total] = await Promise.all([
      prisma.shift.findMany({
        where,
        orderBy: { startTime: 'desc' },
        take: limit,
        skip: offset,
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
      }),
      prisma.shift.count({ where }),
    ])

    return NextResponse.json({
      shifts: shifts.map((shift) => ({
        id: shift.id,
        staffId: shift.staffId,
        staffName: shift.staff.fullName,
        staffRole: shift.staff.role,
        terminalId: shift.terminalId,
        startTime: shift.startTime,
        endTime: shift.endTime,
        countedCashUgx: shift.countedCashUgx ? Number(shift.countedCashUgx) : null,
        cashVarianceUgx: shift.cashVarianceUgx ? Number(shift.cashVarianceUgx) : null,
        closedByStaffId: shift.closedByStaffId,
        isActive: shift.endTime === null,
      })),
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('[admin/shifts] GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch shifts' },
      { status: 500 }
    )
  }
}
