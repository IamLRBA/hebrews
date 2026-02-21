const STAFF_STORAGE_KEY = 'pos_staff_id'
const STAFF_ROLE_KEY = 'pos_staff_role'
const TOKEN_STORAGE_KEY = 'pos_token'

export function getStaffId(): string | null {
  if (typeof window === 'undefined') return null
  const value = localStorage.getItem(STAFF_STORAGE_KEY)
  return value === '' || value == null ? null : value
}

export function getStaffRole(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STAFF_ROLE_KEY)
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  const value = localStorage.getItem(TOKEN_STORAGE_KEY)
  return value === '' || value == null ? null : value
}

export function setStaffRole(role: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STAFF_ROLE_KEY, role)
}

/** Store JWT after successful login. Also set staffId/role for display. */
export function setStaffSession(token: string, staffId: string, role: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
  localStorage.setItem(STAFF_STORAGE_KEY, staffId)
  localStorage.setItem(STAFF_ROLE_KEY, role)
}

export function clearStaffSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  localStorage.removeItem(STAFF_STORAGE_KEY)
  localStorage.removeItem(STAFF_ROLE_KEY)
}

/**
 * Logout: notify server for audit (AUTH_LOGOUT) then clear local session.
 * Call before redirecting to login. Ignores API errors so UI always clears.
 */
export async function logout(): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    await posFetch('/api/auth/logout', { method: 'POST' })
  } catch {
    // Ignore so we always clear local session
  }
  clearStaffSession()
}

export async function posFetch(url: string, options?: RequestInit): Promise<Response> {
  const headers = new Headers(options?.headers)
  const token = getToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (typeof window !== 'undefined') {
    try {
      const { getTerminalId } = await import('@/lib/terminal/terminal')
      const terminalId = await getTerminalId()
      if (terminalId) headers.set('x-terminal-id', terminalId)
    } catch {
      // terminal identity optional
    }
  }
  try {
    const res = await fetch(url, { ...options, headers })
    if (res.status >= 500 || res.type === 'error') {
      if (typeof window !== 'undefined') {
        import('@/lib/offline/connection').then((m) => m.reportFailedRequest())
      }
    }
    return res
  } catch (e) {
    if (typeof window !== 'undefined') {
      import('@/lib/offline/connection').then((m) => m.reportFailedRequest())
    }
    throw e
  }
}
