import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedStaff } from '@/lib/pos-auth'
import { assertStaffRole } from '@/lib/domain/role-guard'

export async function GET(request: NextRequest) {
  try {
    const { staffId } = await getAuthenticatedStaff(request)
    await assertStaffRole(staffId, ['admin', 'manager'])

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
        images: (table as { images?: string[] }).images ?? [],
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

export async function POST(request: NextRequest) {
  try {
    const { staffId } = await getAuthenticatedStaff(request)
    await assertStaffRole(staffId, ['admin', 'manager'])
    const body = await request.json()
    const { code, capacity, images } = body
    if (typeof code !== 'string' || !code.trim()) return NextResponse.json({ error: 'code is required' }, { status: 400 })
    const imagesArr = Array.isArray(images) ? images.filter((u: unknown) => typeof u === 'string').slice(0, 5) : []
    const table = await prisma.restaurantTable.create({
      data: {
        code: code.trim().slice(0, 16),
        capacity: typeof capacity === 'number' && !isNaN(capacity) ? capacity : null,
        images: imagesArr,
      },
    })
    return NextResponse.json(table)
  } catch (error) {
    console.error('[admin/tables] POST error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create table'
    if (message.includes('Unknown argument') && message.includes('images')) {
      return NextResponse.json(
        {
          error:
            'Table images are not yet in the database. Stop the dev server, run: npx prisma generate && npx prisma db push, then restart.',
        },
        { status: 500 }
      )
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
