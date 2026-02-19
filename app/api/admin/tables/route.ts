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

    await assertStaffRole(staffId, ['admin'])

    const tables = await prisma.restaurantTable.findMany({
      where: {
        isActive: true,
      },
      orderBy: { code: 'asc' },
      include: {
        orders: {
          where: {
            status: {
              in: ['pending', 'preparing', 'ready'],
            },
          },
          select: {
            id: true,
            orderNumber: true,
            status: true,
          },
          take: 1,
        },
      },
    })

    return NextResponse.json({
      tables: tables.map((table) => ({
        id: table.id,
        tableId: table.id,
        code: table.code,
        tableCode: table.code,
        capacity: table.capacity,
        status: table.orders.length > 0 ? 'occupied' : 'available',
        hasActiveOrder: table.orders.length > 0,
        orderId: table.orders[0]?.id || null,
        orderNumber: table.orders[0]?.orderNumber || null,
      })),
    })
  } catch (error) {
    console.error('[admin/tables] GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch tables' },
      { status: 500 }
    )
  }
}
