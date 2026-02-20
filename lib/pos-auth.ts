/**
 * POS staff authentication: JWT issue/verify and request-scoped identity.
 * Token versioning: tokens carry tokenVersion; server rejects if Staff.tokenVersion is higher (revocation).
 */

import { NextRequest } from 'next/server'
import * as jose from 'jose'
import type { StaffRole } from '@prisma/client'
import { prisma } from '@/lib/db'

const JWT_SECRET_ENV = 'POS_JWT_SECRET'
const DEFAULT_EXPIRY = '8h'

export class UnauthorizedError extends Error {
  constructor(message = 'Authentication required') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class InvalidTokenError extends Error {
  constructor(message = 'Invalid or expired token') {
    super(message)
    this.name = 'InvalidTokenError'
  }
}

export interface AuthenticatedStaff {
  staffId: string
  role: StaffRole
}

function getSecret(): Uint8Array {
  const raw = process.env[JWT_SECRET_ENV]
  if (!raw || raw.length < 16) {
    throw new Error(
      JWT_SECRET_ENV + ' must be set and at least 16 characters for JWT signing'
    )
  }
  return new TextEncoder().encode(raw)
}

/** Create a JWT for the given staff. Use after successful login only. Include tokenVersion for revocation. */
export async function createStaffToken(payload: {
  staffId: string
  role: StaffRole
  tokenVersion: number
}): Promise<string> {
  const secret = getSecret()
  const token = await new jose.SignJWT({
    staffId: payload.staffId,
    role: payload.role,
    v: payload.tokenVersion,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(DEFAULT_EXPIRY)
    .sign(secret)
  return token
}

/** Decode and verify JWT signature/expiry only. Does not check tokenVersion or isActive. */
async function decodeToken(token: string): Promise<{
  staffId: string
  role: StaffRole
  v: number
} | null> {
  try {
    const secret = getSecret()
    const { payload } = await jose.jwtVerify(token, secret, {
      algorithms: ['HS256'],
    })
    const staffId = payload.staffId as string
    const role = payload.role as StaffRole
    const v = typeof payload.v === 'number' ? payload.v : 0
    if (!staffId || !role) return null
    return { staffId, role, v }
  } catch {
    return null
  }
}

/**
 * Verify token (signature, expiry, tokenVersion, isActive). Returns null if invalid or revoked.
 */
export async function verifyStaffToken(
  token: string
): Promise<AuthenticatedStaff | null> {
  const decoded = await decodeToken(token)
  if (!decoded) return null

  const staff = await prisma.staff.findUnique({
    where: { id: decoded.staffId },
    select: { id: true, isActive: true, tokenVersion: true },
  })
  if (!staff || !staff.isActive) return null
  if (staff.tokenVersion > decoded.v) return null

  return { staffId: staff.id, role: decoded.role }
}

/** Increment Staff.tokenVersion to revoke all existing tokens (logout all devices, password change, account disable). */
export async function incrementTokenVersion(staffId: string): Promise<void> {
  await prisma.staff.update({
    where: { id: staffId },
    data: { tokenVersion: { increment: 1 } },
  })
}

function getTokenFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) {
    return auth.slice(7).trim() || null
  }
  return null
}

/**
 * Get authenticated staff from request. Throws UnauthorizedError or InvalidTokenError
 * if no token, invalid token, expired, or revoked (version/active). Use in API routes instead of x-staff-id.
 */
export async function getAuthenticatedStaff(
  request: NextRequest
): Promise<AuthenticatedStaff> {
  const token = getTokenFromRequest(request)
  if (!token) {
    throw new UnauthorizedError('Missing or invalid authorization')
  }
  const staff = await verifyStaffToken(token)
  if (!staff) {
    throw new InvalidTokenError('Invalid or expired token')
  }
  return staff
}
