import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { assertStaffRole } from '@/lib/domain/role-guard'
import bcrypt from 'bcrypt'

const STAFF_ID_HEADER = 'x-staff-id'

export async function GET(request: NextRequest) {
  try {
    const staffId = request.headers.get(STAFF_ID_HEADER)?.trim()
    if (!staffId) {
      return NextResponse.json({ error: 'Staff session required' }, { status: 401 })
    }

    // Check if admin (for full list) or return active staff only
    try {
      await assertStaffRole(staffId, ['admin'])
      // Admin: return all staff
      const staff = await prisma.staff.findMany({
        orderBy: { fullName: 'asc' },
        select: {
          id: true,
          username: true,
          fullName: true,
          role: true,
          isActive: true,
        },
      })
      return NextResponse.json(staff)
    } catch {
      // Non-admin: return active staff only
      const staff = await prisma.staff.findMany({
        where: { isActive: true },
        orderBy: { fullName: 'asc' },
        select: {
          id: true,
          username: true,
          fullName: true,
          role: true,
          isActive: true,
        },
      })
      return NextResponse.json(staff)
    }
  } catch (error) {
    console.error('[staff] GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch staff' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const staffId = request.headers.get(STAFF_ID_HEADER)?.trim()
    if (!staffId) {
      return NextResponse.json({ error: 'Staff session required' }, { status: 401 })
    }

    await assertStaffRole(staffId, ['admin'])

    const body = await request.json()
    const { username, fullName, role, password, isActive } = body

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'username is required (string)' }, { status: 400 })
    }
    if (!fullName || typeof fullName !== 'string') {
      return NextResponse.json({ error: 'fullName is required (string)' }, { status: 400 })
    }
    if (!role || !['admin', 'manager', 'cashier', 'kitchen'].includes(role)) {
      return NextResponse.json({ error: 'role must be admin, manager, cashier, or kitchen' }, { status: 400 })
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'password is required (string, min 6 characters)' }, { status: 400 })
    }

    // Check if username already exists
    const existing = await prisma.staff.findUnique({
      where: { username: username.toLowerCase().trim() },
    })
    if (existing) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const newStaff = await prisma.staff.create({
      data: {
        username: username.toLowerCase().trim(),
        fullName: fullName.trim(),
        role: role,
        passwordHash,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
      },
    })

    return NextResponse.json(newStaff, { status: 201 })
  } catch (error) {
    console.error('[staff] POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create staff' },
      { status: 500 }
    )
  }
}
