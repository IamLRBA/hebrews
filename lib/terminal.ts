/**
 * Terminal (device) identity: validate terminalId against DB and return metadata.
 * Requests that require terminal context should call requireTerminalId(request).
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import type { TerminalType } from '@prisma/client'

export const TERMINAL_ID_HEADER = 'x-terminal-id'

export class TerminalNotFoundError extends Error {
  constructor(terminalId: string) {
    super(`Terminal not found: ${terminalId}`)
    this.name = 'TerminalNotFoundError'
  }
}

export class TerminalInactiveError extends Error {
  constructor(terminalId: string) {
    super(`Terminal is inactive: ${terminalId}`)
    this.name = 'TerminalInactiveError'
  }
}

export interface TerminalInfo {
  id: string
  code: string
  name: string
  type: TerminalType
  location: string | null
  isActive: boolean
}

/**
 * Fetch terminal by code (used in requests as terminalId). Returns null if not found.
 */
export async function getTerminalByCode(
  code: string
): Promise<TerminalInfo | null> {
  const t = await prisma.terminal.findUnique({
    where: { code: code.trim() },
  })
  if (!t) return null
  return {
    id: t.id,
    code: t.code,
    name: t.name,
    type: t.type,
    location: t.location,
    isActive: t.isActive,
  }
}

/**
 * Require a valid, active terminal from request (header x-terminal-id).
 * Throws TerminalNotFoundError or TerminalInactiveError if invalid.
 */
export async function requireTerminalId(
  request: NextRequest
): Promise<TerminalInfo> {
  const raw = request.headers.get(TERMINAL_ID_HEADER)?.trim()
  if (!raw) {
    throw new TerminalNotFoundError('')
  }
  const terminal = await getTerminalByCode(raw)
  if (!terminal) {
    throw new TerminalNotFoundError(raw)
  }
  if (!terminal.isActive) {
    throw new TerminalInactiveError(terminal.code)
  }
  return terminal
}

/**
 * Optional terminal: returns null if header missing; otherwise validates and returns
 * terminal or throws.
 */
export async function getOptionalTerminal(
  request: NextRequest
): Promise<TerminalInfo | null> {
  const raw = request.headers.get(TERMINAL_ID_HEADER)?.trim()
  if (!raw) return null
  const terminal = await getTerminalByCode(raw)
  if (!terminal) throw new TerminalNotFoundError(raw)
  if (!terminal.isActive) throw new TerminalInactiveError(terminal.code)
  return terminal
}
