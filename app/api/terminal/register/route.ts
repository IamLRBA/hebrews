import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { normalizeTerminalCode } from '@/lib/terminal'
import type { TerminalType } from '@prisma/client'

/**
 * POST /api/terminal/register
 * Registers terminal if unknown; updates lastSeenAt.
 * Body: { terminalId: string (UUID), name?: string, location?: string }
 * No auth required so terminals can register before login.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const terminalId = typeof body?.terminalId === 'string' ? body.terminalId.trim() : null
    if (!terminalId) {
      return NextResponse.json({ error: 'terminalId is required (string)' }, { status: 400 })
    }

    const code = normalizeTerminalCode(terminalId)
    if (!code) {
      return NextResponse.json({ error: 'Invalid terminalId' }, { status: 400 })
    }

    const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 64) : `Terminal ${code.slice(0, 8)}`
    const location = typeof body?.location === 'string' ? body.location.trim().slice(0, 128) : null
    const now = new Date()

    const terminal = await prisma.terminal.upsert({
      where: { code },
      create: {
        code,
        name,
        type: 'POS' as TerminalType,
        location,
        lastSeenAt: now,
      },
      update: {
        lastSeenAt: now,
        ...(name ? { name } : {}),
        ...(location !== undefined ? { location } : {}),
      },
    })

    return NextResponse.json({
      id: terminal.id,
      code: terminal.code,
      name: terminal.name,
      location: terminal.location,
      lastSeenAt: terminal.lastSeenAt?.toISOString(),
    })
  } catch (error) {
    console.error('[terminal/register]', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
