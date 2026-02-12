/**
 * Client-side shift storage and guard.
 * Shift ID is stored in localStorage and checked on POS screens.
 */

const SHIFT_STORAGE_KEY = 'pos_shift_id'

export function getShiftId(): string | null {
  if (typeof window === 'undefined') return null
  const value = localStorage.getItem(SHIFT_STORAGE_KEY)
  return value === '' || value == null ? null : value
}

export function setShiftId(shiftId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(SHIFT_STORAGE_KEY, shiftId)
}

export function clearShiftId(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(SHIFT_STORAGE_KEY)
}
