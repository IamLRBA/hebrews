import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcrypt'
import { createStaffToken } from '@/lib/pos-auth'
import { appendAuditLog, AuditActionType, AuditEntityType } from '@/lib/audit-log'
import { logError } from '@/lib/error-logger'

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
      select: { id: true, passwordHash: true, fullName: true, role: true, isActive: true, tokenVersion: true },
    })

    if (!staff || !staff.isActive) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
    }

    if (!staff.passwordHash || staff.passwordHash.length < 10) {
      console.error('[auth/login] Staff has invalid or missing password hash:', staff.id)
      return NextResponse.json({
        error: 'Account not set up. Run: npx prisma db seed',
      }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, staff.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
    }

    const token = await createStaffToken({
      staffId: staff.id,
      role: staff.role,
      tokenVersion: staff.tokenVersion ?? 0,
    })

    await appendAuditLog({
      staffId: staff.id,
      actionType: AuditActionType.AUTH_LOGIN,
      entityType: AuditEntityType.auth,
      entityId: staff.id,
      newState: { username: username.trim() },
    }).catch((e) => logError(e, { path: '/api/auth/login' }))

    return NextResponse.json({
      token,
      staffId: staff.id,
      role: staff.role,
      fullName: staff.fullName,
    })
  } catch (e) {
    logError(e, { path: '/api/auth/login' })
    const message = process.env.NODE_ENV === 'development' && e instanceof Error
      ? `Login failed: ${e.message}`
      : 'Login failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
