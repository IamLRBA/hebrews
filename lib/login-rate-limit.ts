/**
 * Login rate limiting and account lockout.
 * In-memory store per process; for multi-instance production use Redis or DB.
 */

const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const MAX_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15

interface Entry {
  count: number
  windowStart: number
}

const byUsername = new Map<string, Entry>()

function now(): number {
  return Date.now()
}

/** Returns true if this username is within the rate-limit window and has exceeded max attempts. */
export function isRateLimited(username: string): boolean {
  const key = username.toLowerCase().trim()
  const entry = byUsername.get(key)
  if (!entry) return false
  if (now() - entry.windowStart >= WINDOW_MS) {
    byUsername.delete(key)
    return false
  }
  return entry.count >= MAX_ATTEMPTS
}

/** Record a failed login. Call after invalid credentials. Returns new failure count in this window. */
export function recordFailedLogin(username: string): number {
  const key = username.toLowerCase().trim()
  const n = now()
  let entry = byUsername.get(key)
  if (!entry || n - entry.windowStart >= WINDOW_MS) {
    entry = { count: 0, windowStart: n }
    byUsername.set(key, entry)
  }
  entry.count += 1
  return entry.count
}

/** Clear failure count for username (e.g. after successful login). */
export function clearFailedLogins(username: string): void {
  byUsername.delete(username.toLowerCase().trim())
}

export const LOGIN_RATE_LIMIT = {
  windowMs: WINDOW_MS,
  maxAttempts: MAX_ATTEMPTS,
  lockoutMinutes: LOCKOUT_MINUTES,
} as const
