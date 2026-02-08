/**
 * POS Application Service — single server-side entry point for POS actions.
 * Composes domain utilities; no new business logic. Thin orchestration only.
 */

import { createOrder } from '@/lib/order-create'
import { addOrderItem } from '@/lib/order-items'
import { recordPayment as domainRecordPayment } from '@/lib/payments'
import { checkoutOrder as domainCheckoutOrder } from '@/lib/checkout'
import { setOrderStatus } from '@/lib/order-status'
import { releaseTableForOrder } from '@/lib/table-lifecycle'
import { closeShift as domainCloseShift } from '@/lib/shift-close'
import type { PaymentMethod, PaymentStatus } from '@prisma/client'

// ---------------------------------------------------------------------------
// Re-export domain errors for callers (no wrapping)
// ---------------------------------------------------------------------------

export {
  StaffNotFoundError,
  StaffInactiveError,
  NoActiveShiftError,
} from '@/lib/staff-session'

export {
  TableRequiredForDineInError,
  TableNotAllowedForTakeawayError,
} from '@/lib/order-create'

export {
  OrderNotFoundError,
  OrderImmutableError,
  ProductNotFoundError,
  ProductInactiveError,
  OrderItemNotFoundError,
  InvalidQuantityError,
} from '@/lib/order-items'

export {
  OrderCancelledError,
  PaymentAmountInvalidError,
  PaymentExceedsOrderTotalError,
} from '@/lib/payments'

export {
  OrderNotReadyForCheckoutError,
  OrderNotFullyPaidError,
} from '@/lib/checkout'

export { InvalidOrderStatusTransitionError } from '@/lib/order-status'
export { OrderNotTerminalError } from '@/lib/table-lifecycle'
export { ShiftNotFoundError, ShiftAlreadyClosedError } from '@/lib/shift-close'

// ---------------------------------------------------------------------------
// POS Operations
// ---------------------------------------------------------------------------

export type CreateDineInOrderParams = {
  staffId: string
  tableId: string
  orderNumber: string
}

export type CreateTakeawayOrderParams = {
  staffId: string
  orderNumber: string
}

export type AddItemToOrderParams = {
  orderId: string
  productId: string
  quantity: number
  size?: string | null
  modifier?: string | null
  notes?: string | null
  sortOrder?: number
}

export type RecordPaymentParams = {
  orderId: string
  amountUgx: number
  method: PaymentMethod
  status: PaymentStatus
  createdByStaffId: string
  reference?: string | null
}

export type CheckoutOrderParams = {
  orderId: string
  updatedByStaffId: string
}

export type CancelOrderParams = {
  orderId: string
  cancelledByStaffId: string
}

export type CloseShiftParams = {
  shiftId: string
  closedByStaffId: string
  declaredCashUgx?: number
}

/** Creates a dine-in order. Requires tableId. */
export async function createDineInOrder(params: CreateDineInOrderParams) {
  return createOrder({
    staffId: params.staffId,
    orderType: 'dine_in',
    tableId: params.tableId,
    orderNumber: params.orderNumber,
  })
}

/** Creates a takeaway order. No tableId. */
export async function createTakeawayOrder(params: CreateTakeawayOrderParams) {
  return createOrder({
    staffId: params.staffId,
    orderType: 'takeaway',
    tableId: null,
    orderNumber: params.orderNumber,
  })
}

/** Adds an item to an order. Order must be pending or preparing. */
export async function addItemToOrder(params: AddItemToOrderParams) {
  return addOrderItem({
    orderId: params.orderId,
    productId: params.productId,
    quantity: params.quantity,
    size: params.size,
    modifier: params.modifier,
    notes: params.notes,
    sortOrder: params.sortOrder,
  })
}

/** Records a payment against an order. */
export async function recordPayment(params: RecordPaymentParams) {
  return domainRecordPayment({
    orderId: params.orderId,
    amountUgx: params.amountUgx,
    method: params.method,
    status: params.status,
    createdByStaffId: params.createdByStaffId,
    reference: params.reference,
  })
}

/** Finalizes order: validates payment, transitions to served, releases table if dine-in. */
export async function checkoutOrder(params: CheckoutOrderParams) {
  return domainCheckoutOrder(params)
}

/** Cancels an order. Transitions to cancelled and releases table if dine-in. */
export async function cancelOrder(params: CancelOrderParams) {
  const order = await setOrderStatus({
    orderId: params.orderId,
    newStatus: 'cancelled',
    updatedByStaffId: params.cancelledByStaffId,
  })
  await releaseTableForOrder(params.orderId)
  return order
}

/** Closes a shift. Sets endTime, returns reconciliation summary. */
export async function closeShift(params: CloseShiftParams) {
  return domainCloseShift(params)
}
