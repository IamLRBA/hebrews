/**
 * Kitchen ticket printer service. ESC/POS-compatible.
 */

import type { KitchenTicketPayload, PrintResult } from './types'

export interface KitchenPrinterService {
  printKitchenTicket(payload: KitchenTicketPayload, deviceId?: string): Promise<PrintResult>
}

function buildEscPosKitchenTicket(payload: KitchenTicketPayload): string {
  const lines: string[] = []
  const add = (s: string) => lines.push(s)
  const center = (s: string) => add(`\x1B\x61\x01${s}\x1B\x61\x00`)
  const bold = (s: string) => add(`\x1B\x45\x01${s}\x1B\x45\x00`)
  const cut = () => add('\x1D\x56\x00')

  center('*** KITCHEN ***')
  add('')
  bold(`Order: ${payload.orderNumber}`)
  if (payload.tableCode) add(`Table: ${payload.tableCode}`)
  add(`Time: ${payload.sentAt}`)
  add(`Staff: ${payload.staffId}`)
  add('--------------------------------')
  payload.items.forEach((item) => {
    add(`${item.quantity} x ${item.name}`)
    if (item.modifiers?.length) item.modifiers.forEach((m) => add(`   + ${m}`))
    if (item.notes) add(`   Note: ${item.notes}`)
  })
  add('--------------------------------')
  add('')
  cut()
  return lines.join('\n')
}

export const mockKitchenPrinterService: KitchenPrinterService = {
  async printKitchenTicket(payload: KitchenTicketPayload, deviceId?: string): Promise<PrintResult> {
    const raw = buildEscPosKitchenTicket(payload)
    if (process.env.NODE_ENV === 'development') {
      console.log('[KitchenPrinter mock]', deviceId ?? 'default', '\n', raw.slice(0, 400) + (raw.length > 400 ? '...' : ''))
    }
    return { ok: true }
  },
}

let defaultKitchenPrinter: KitchenPrinterService = mockKitchenPrinterService

export function setKitchenPrinterService(service: KitchenPrinterService): void {
  defaultKitchenPrinter = service
}

export function getKitchenPrinterService(): KitchenPrinterService {
  return defaultKitchenPrinter
}
