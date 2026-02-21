/**
 * Cash drawer service. Opens drawer (e.g. via ESC/POS pulse on RJ12 or shared with receipt printer).
 */

export interface CashDrawerService {
  open(deviceId?: string): Promise<{ ok: true } | { ok: false; error: string }>
}

/**
 * Mock: log only. Real implementation would send open pulse to device.
 */
export const mockCashDrawerService: CashDrawerService = {
  async open(deviceId?: string): Promise<{ ok: true } | { ok: false; error: string }> {
    if (process.env.NODE_ENV === 'development') {
      console.log('[CashDrawer mock] open', deviceId ?? 'default')
    }
    return { ok: true }
  },
}

let defaultCashDrawer: CashDrawerService = mockCashDrawerService

export function setCashDrawerService(service: CashDrawerService): void {
  defaultCashDrawer = service
}

export function getCashDrawerService(): CashDrawerService {
  return defaultCashDrawer
}
