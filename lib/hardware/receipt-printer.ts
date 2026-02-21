/**
 * Receipt printer service (customer receipts). ESC/POS-compatible.
 * Implementations: mock for dev, real driver for USB/LAN when configured.
 */

import type { ReceiptPayload, PrintResult } from './types'

export interface PrinterService {
  printReceipt(payload: ReceiptPayload, deviceId?: string): Promise<PrintResult>
}

/**
 * Builds ESC/POS-style raw content. Real hardware would send this to the device.
 */
function buildEscPosReceipt(payload: ReceiptPayload): string {
  const lines: string[] = []
  const add = (s: string) => lines.push(s)
  const center = (s: string) => add(`\x1B\x61\x01${s}\x1B\x61\x00`) // ESC a 1 = center
  const bold = (s: string) => add(`\x1B\x45\x01${s}\x1B\x45\x00`)   // ESC E 1 = bold
  const cut = () => add('\x1D\x56\x00') // GS V 0 = full cut

  center(payload.cafeName)
  add('')
  add(`Order: ${payload.orderNumber}`)
  if (payload.tableCode) add(`Table: ${payload.tableCode}`)
  add(`Terminal: ${payload.terminalName ?? payload.terminalId}`)
  add('')
  add('--------------------------------')
  payload.items.forEach((item) => {
    add(`${item.quantity} x ${item.name}  ${item.lineTotalUgx} UGX`)
    if (item.modifiers?.length) item.modifiers.forEach((m) => add(`   + ${m}`))
  })
  add('--------------------------------')
  add(`Subtotal: ${payload.subtotalUgx} UGX`)
  if (payload.taxUgx != null && payload.taxUgx > 0) add(`Tax: ${payload.taxUgx} UGX`)
  bold(`Total: ${payload.totalUgx} UGX`)
  add('')
  add(`Payment: ${payload.paymentMethod}`)
  if (payload.amountTenderedUgx != null) add(`Tendered: ${payload.amountTenderedUgx} UGX`)
  if (payload.changeUgx != null && payload.changeUgx > 0) add(`Change: ${payload.changeUgx} UGX`)
  add('')
  add(`Date: ${payload.paidAt}`)
  add(`Staff: ${payload.staffNameOrId}`)
  add('')
  add('Thank you!')
  add('')
  cut()
  return lines.join('\n')
}

/**
 * Mock implementation: log and return success. Replace with real driver (e.g. node-escpos, network socket).
 */
export const mockPrinterService: PrinterService = {
  async printReceipt(payload: ReceiptPayload, deviceId?: string): Promise<PrintResult> {
    const raw = buildEscPosReceipt(payload)
    if (process.env.NODE_ENV === 'development') {
      console.log('[ReceiptPrinter mock]', deviceId ?? 'default', '\n', raw.slice(0, 500) + (raw.length > 500 ? '...' : ''))
    }
    return { ok: true }
  },
}

let defaultReceiptPrinter: PrinterService = mockPrinterService

export function setReceiptPrinterService(service: PrinterService): void {
  defaultReceiptPrinter = service
}

export function getReceiptPrinterService(): PrinterService {
  return defaultReceiptPrinter
}
