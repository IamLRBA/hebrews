import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcrypt'
import { createStaffToken } from '@/lib/pos-auth'
import { appendAuditLog, AuditActionType, AuditEntityType } from '@/lib/audit-log'
import { logError } from '@/lib/error-logger'
import {
  isRateLimited,
  recordFailedLogin,
  clearFailedLogins,
  LOGIN_RATE_LIMIT,
} from '@/lib/login-rate-limit'

function getClientIp(request: NextRequest): string | null {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    null
  )
}

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

    const usernameNorm = username.trim()
    if (isRateLimited(usernameNorm)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Try again later.' },
        { status: 429 }
      )
    }

    const staff = await prisma.staff.findUnique({
      where: { username: usernameNorm },
      select: {
        id: true,
        passwordHash: true,
        fullName: true,
        role: true,
        isActive: true,
        tokenVersion: true,
        lockedUntil: true,
      },
    })

    if (!staff || !staff.isActive) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
    }

    if (staff.lockedUntil && new Date() < staff.lockedUntil) {
      const mins = Math.ceil((staff.lockedUntil.getTime() - Date.now()) / 60000)
      return NextResponse.json(
        { error: `Account temporarily locked. Try again in ${mins} minute(s).` },
        { status: 423 }
      )
    }

    if (!staff.passwordHash || staff.passwordHash.length < 10) {
      console.error('[auth/login] Staff has invalid or missing password hash:', staff.id)
      return NextResponse.json({
        error: 'Account not set up. Run: npx prisma db seed',
      }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, staff.passwordHash)
    if (!valid) {
      const count = recordFailedLogin(usernameNorm)
      console.warn(
        '[auth/login] Failed login',
        JSON.stringify({ username: usernameNorm, attempt: count, ip: getClientIp(request) })
      )
      if (count >= LOGIN_RATE_LIMIT.maxAttempts) {
        const lockedUntil = new Date(Date.now() + LOGIN_RATE_LIMIT.lockoutMinutes * 60 * 1000)
        await prisma.staff.update({
          where: { id: staff.id },
          data: { lockedUntil },
        })
        return NextResponse.json(
          { error: `Too many failed attempts. Account locked for ${LOGIN_RATE_LIMIT.lockoutMinutes} minutes.` },
          { status: 423 }
        )
      }
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
    }

    clearFailedLogins(usernameNorm)
    if (staff.lockedUntil) {
      await prisma.staff.update({
        where: { id: staff.id },
        data: { lockedUntil: null },
      })
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
