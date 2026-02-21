/**
 * Payload types for hardware services. ESC/POS-compatible content is built by services.
 */

export interface ReceiptLineItem {
  name: string
  quantity: number
  unitPriceUgx: number
  lineTotalUgx: number
  modifiers?: string[]
}

export interface ReceiptPayload {
  cafeName: string
  terminalId: string
  terminalName?: string
  orderNumber: string
  tableCode?: string | null
  items: ReceiptLineItem[]
  subtotalUgx: number
  taxUgx?: number
  totalUgx: number
  paymentMethod: string
  amountTenderedUgx?: number
  changeUgx?: number
  paidAt: string
  staffNameOrId: string
}

export interface KitchenTicketLineItem {
  name: string
  quantity: number
  modifiers?: string[]
  notes?: string
}

export interface KitchenTicketPayload {
  orderNumber: string
  tableCode?: string | null
  items: KitchenTicketLineItem[]
  sentAt: string
  staffId: string
}

export type PrintResult = { ok: true } | { ok: false; error: string }
