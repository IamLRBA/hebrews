import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { assertStaffRole } from '@/lib/domain/role-guard'
import bcrypt from 'bcrypt'

const STAFF_ID_HEADER = 'x-staff-id'

export async function PUT(
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
    const { username, fullName, role, password, isActive } = body

    const existingStaff = await prisma.staff.findUnique({
      where: { id: targetStaffId },
    })

    if (!existingStaff) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
    }

    const updateData: any = {}
    if (username !== undefined) {
      if (typeof username !== 'string') {
        return NextResponse.json({ error: 'username must be a string' }, { status: 400 })
      }
      // Check if username is taken by another staff
      const usernameTaken = await prisma.staff.findFirst({
        where: {
          username: username.toLowerCase().trim(),
          id: { not: targetStaffId },
        },
      })
      if (usernameTaken) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 400 })
      }
      updateData.username = username.toLowerCase().trim()
    }
    if (fullName !== undefined) {
      if (typeof fullName !== 'string') {
        return NextResponse.json({ error: 'fullName must be a string' }, { status: 400 })
      }
      updateData.fullName = fullName.trim()
    }
    if (role !== undefined) {
      if (!['admin', 'manager', 'cashier', 'kitchen'].includes(role)) {
        return NextResponse.json({ error: 'role must be admin, manager, cashier, or kitchen' }, { status: 400 })
      }
      updateData.role = role
    }
    if (password !== undefined && password !== '') {
      if (typeof password !== 'string' || password.length < 6) {
        return NextResponse.json({ error: 'password must be a string with at least 6 characters' }, { status: 400 })
      }
      updateData.passwordHash = await bcrypt.hash(password, 10)
    }
    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive)
    }

    const updatedStaff = await prisma.staff.update({
      where: { id: targetStaffId },
      data: updateData,
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
    console.error('[staff] PUT error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update staff' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const staffId = _request.headers.get(STAFF_ID_HEADER)?.trim()
    if (!staffId) {
      return NextResponse.json({ error: 'Staff session required' }, { status: 401 })
    }

    await assertStaffRole(staffId, ['admin'])

    const { staffId: targetStaffId } = await params
    const existingStaff = await prisma.staff.findUnique({
      where: { id: targetStaffId },
    })

    if (!existingStaff) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
    }

    await prisma.staff.delete({
      where: { id: targetStaffId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[staff] DELETE error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete staff' },
      { status: 500 }
    )
  }
}
