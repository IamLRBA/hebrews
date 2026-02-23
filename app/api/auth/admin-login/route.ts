/**
 * Server-side admin login for legacy AuthManager (e.g. fusioncraft admin).
 * Uses ADMIN_USERNAME and ADMIN_PASSWORD_HASH (bcrypt) from env. No plaintext passwords stored.
 * Fails securely if env not configured (503).
 */

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'

const ADMIN_USERNAME_ENV = 'ADMIN_USERNAME'
const ADMIN_PASSWORD_HASH_ENV = 'ADMIN_PASSWORD_HASH'

export async function POST(request: NextRequest) {
  try {
    const username = process.env[ADMIN_USERNAME_ENV]?.trim()
    const passwordHash = process.env[ADMIN_PASSWORD_HASH_ENV]?.trim()

    if (!username || !passwordHash || passwordHash.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Admin login not configured' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { username: givenUsername, password: givenPassword } = body

    if (typeof givenUsername !== 'string' || typeof givenPassword !== 'string') {
      return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 })
    }

    if (givenUsername.trim() !== username) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
    }

    const valid = await bcrypt.compare(givenPassword, passwordHash)
    if (!valid) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}
