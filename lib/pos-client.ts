const STAFF_STORAGE_KEY = 'pos_staff_id'

export function getStaffId(): string | null {
  if (typeof window === 'undefined') return null
  const value = localStorage.getItem(STAFF_STORAGE_KEY)
  return value === '' || value == null ? null : value
}

export async function posFetch(url: string, options?: RequestInit): Promise<Response> {
  const staffId = getStaffId()
  const headers = new Headers(options?.headers)
  if (staffId) {
    headers.set('x-staff-id', staffId)
  }
  return fetch(url, { ...options, headers })
}
