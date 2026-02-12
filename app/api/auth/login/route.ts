import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcrypt'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body
    if (typeof username !== 'string' || !username.trim()) {
      return NextResponse.json({ error: 'username is required' }, { status: 400 })
    }
    if (typeof password !== 'string' || !password) {
      return NextResponse.json({ error: 'password is required' }, { status: 400 })
    }

    const staff = await prisma.staff.findUnique({
      where: { username: username.trim() },
      select: { id: true, passwordHash: true, fullName: true, role: true, isActive: true },
    })

    if (!staff || !staff.isActive) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, staff.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
    }

    return NextResponse.json({
      staffId: staff.id,
      role: staff.role,
      fullName: staff.fullName,
    })
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
