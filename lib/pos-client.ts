const STAFF_STORAGE_KEY = 'pos_staff_id'
const STAFF_ROLE_KEY = 'pos_staff_role'

export function getStaffId(): string | null {
  if (typeof window === 'undefined') return null
  const value = localStorage.getItem(STAFF_STORAGE_KEY)
  return value === '' || value == null ? null : value
}

export function getStaffRole(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STAFF_ROLE_KEY)
}

export function setStaffRole(role: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STAFF_ROLE_KEY, role)
}

export function clearStaffSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STAFF_STORAGE_KEY)
  localStorage.removeItem(STAFF_ROLE_KEY)
}

export async function posFetch(url: string, options?: RequestInit): Promise<Response> {
  const staffId = getStaffId()
  const headers = new Headers(options?.headers)
  if (staffId) {
    headers.set('x-staff-id', staffId)
  }
  return fetch(url, { ...options, headers })
}
