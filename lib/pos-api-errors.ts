/**
 * Maps POS service domain errors to HTTP responses.
 * Used by API routes only. Does not call domain modules.
 */

import { NextResponse } from 'next/server'
import {
  OrderNotFoundError,
  ProductNotFoundError,
  OrderItemNotFoundError,
  ShiftNotFoundError,
  StaffNotFoundError,
  OrderImmutableError,
  OrderNotReadyForCheckoutError,
  OrderNotFullyPaidError,
  InvalidOrderStatusTransitionError,
  ShiftAlreadyClosedError,
  OrderCancelledError,
  OrderNotTerminalError,
  ProductInactiveError,
  StaffInactiveError,
  NoActiveShiftError,
  TableRequiredForDineInError,
  TableNotAllowedForTakeawayError,
  PaymentAmountInvalidError,
  PaymentExceedsOrderTotalError,
  InvalidQuantityError,
} from '@/lib/pos-service'

const NOT_FOUND_ERRORS = [
  OrderNotFoundError,
  ProductNotFoundError,
  OrderItemNotFoundError,
  ShiftNotFoundError,
  StaffNotFoundError,
]

const INVALID_STATE_ERRORS = [
  OrderImmutableError,
  OrderNotReadyForCheckoutError,
  OrderNotFullyPaidError,
  InvalidOrderStatusTransitionError,
  ShiftAlreadyClosedError,
  OrderCancelledError,
  OrderNotTerminalError,
  ProductInactiveError,
  StaffInactiveError,
  NoActiveShiftError,
]

const VALIDATION_ERRORS = [
  TableRequiredForDineInError,
  TableNotAllowedForTakeawayError,
  PaymentAmountInvalidError,
  PaymentExceedsOrderTotalError,
  InvalidQuantityError,
]

export function toPosApiResponse(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : 'Internal server error'

  if (NOT_FOUND_ERRORS.some((E) => error instanceof E)) {
    return NextResponse.json({ error: message }, { status: 404 })
  }
  if (INVALID_STATE_ERRORS.some((E) => error instanceof E)) {
    return NextResponse.json({ error: message }, { status: 409 })
  }
  if (VALIDATION_ERRORS.some((E) => error instanceof E)) {
    return NextResponse.json({ error: message }, { status: 400 })
  }

  return NextResponse.json({ error: message }, { status: 500 })
}
