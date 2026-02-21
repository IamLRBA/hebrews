import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedStaff } from '@/lib/pos-auth'
import { assertStaffRole } from '@/lib/domain/role-guard'
import type { Prisma } from '@prisma/client'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const { staffId } = await getAuthenticatedStaff(request)
    await assertStaffRole(staffId, ['admin'])

    const { tableId } = await params
    if (!tableId) return NextResponse.json({ error: 'tableId required' }, { status: 400 })

    const body = await request.json()
    const { code, capacity, images } = body
    const imagesArr = Array.isArray(images)
      ? (images as unknown[]).filter((u): u is string => typeof u === 'string').slice(0, 5)
      : []

    const updateData: Prisma.RestaurantTableUpdateInput = {}
    if (typeof code === 'string' && code.trim()) updateData.code = code.trim().slice(0, 16)
    if (typeof capacity === 'number' && !isNaN(capacity)) updateData.capacity = capacity
    if (capacity === null) updateData.capacity = null
    updateData.images = imagesArr

    const table = await prisma.restaurantTable.update({
      where: { id: tableId },
      data: updateData,
    })
    return NextResponse.json(table)
  } catch (error) {
    console.error('[admin/tables] PUT error:', error)
    const message = error instanceof Error ? error.message : 'Failed to update table'
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const { staffId } = await getAuthenticatedStaff(request)
    await assertStaffRole(staffId, ['admin'])

    const { tableId } = await params
    if (!tableId) return NextResponse.json({ error: 'tableId required' }, { status: 400 })

    await prisma.restaurantTable.update({
      where: { id: tableId },
      data: { isActive: false },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/tables] DELETE error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete table' }, { status: 500 })
  }
}
