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
import {
  PaymentInsufficientError,
  InvalidKitchenStatusTransitionError,
  OrderHasNoItemsError,
  DuplicatePaymentError,
  PaymentOrderCancelledError,
  PaymentZeroAmountError,
  ExternalPaymentAmountMismatchError,
  UnauthorizedWaiterActionError,
  OrderNotEditableError,
  OrderNotReadyForPaymentError,
} from '@/lib/domain/orders'
import { ShiftHasUnfinishedOrdersError, ManagerApprovalRequiredForCloseError } from '@/lib/domain/shifts'
import { UnauthorizedRoleError, StaffNotFoundError as RoleGuardStaffNotFoundError } from '@/lib/domain/role-guard'
import { UnauthorizedError, InvalidTokenError } from '@/lib/pos-auth'
import { TerminalNotFoundError, TerminalInactiveError } from '@/lib/terminal'
import { TableOccupiedByOtherError, TableAtCapacityError } from '@/lib/table-occupancy'

const NOT_FOUND_ERRORS = [
  TerminalNotFoundError,
  RoleGuardStaffNotFoundError,
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
  InvalidKitchenStatusTransitionError,
  ShiftAlreadyClosedError,
  ShiftHasUnfinishedOrdersError,
  OrderCancelledError,
  OrderNotTerminalError,
  ProductInactiveError,
  StaffInactiveError,
  NoActiveShiftError,
  DuplicatePaymentError,
  PaymentOrderCancelledError,
  UnauthorizedWaiterActionError,
  OrderNotEditableError,
  OrderNotReadyForPaymentError,
]

const VALIDATION_ERRORS = [
  TableRequiredForDineInError,
  TableNotAllowedForTakeawayError,
  PaymentAmountInvalidError,
  PaymentExceedsOrderTotalError,
  InvalidQuantityError,
  PaymentInsufficientError,
  OrderHasNoItemsError,
  PaymentZeroAmountError,
  ExternalPaymentAmountMismatchError,
]

const UNAUTHORIZED_ERRORS = [UnauthorizedRoleError]
const AUTH_ERRORS = [UnauthorizedError, InvalidTokenError]
const TERMINAL_STATE_ERRORS = [TerminalInactiveError]

export function toPosApiResponse(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : 'Internal server error'

  if (NOT_FOUND_ERRORS.some((E) => error instanceof E)) {
    return NextResponse.json({ error: message }, { status: 404 })
  }
  if (AUTH_ERRORS.some((E) => error instanceof E)) {
    return NextResponse.json({ error: message }, { status: 401 })
  }
  if (UNAUTHORIZED_ERRORS.some((E) => error instanceof E)) {
    return NextResponse.json({ error: message }, { status: 403 })
  }
  if (TERMINAL_STATE_ERRORS.some((E) => error instanceof E)) {
    return NextResponse.json({ error: message }, { status: 403 })
  }
  if (error instanceof TableOccupiedByOtherError) {
    return NextResponse.json(
      {
        error: message,
        conflict: 'TABLE_OCCUPIED',
        tableId: error.tableId,
        existingOrderId: error.existingOrderId,
        terminalId: error.terminalId,
      },
      { status: 409 }
    )
  }
  if (error instanceof TableAtCapacityError) {
    return NextResponse.json(
      {
        error: message,
        conflict: 'TABLE_AT_CAPACITY',
        tableId: error.tableId,
        capacity: error.capacity,
        currentCount: error.currentCount,
      },
      { status: 409 }
    )
  }
  if (error instanceof ManagerApprovalRequiredForCloseError) {
    return NextResponse.json(
      {
        error: message,
        code: 'MANAGER_APPROVAL_REQUIRED',
        varianceUgx: error.varianceUgx,
        thresholdUgx: error.thresholdUgx,
      },
      { status: 403 }
    )
  }
  if (INVALID_STATE_ERRORS.some((E) => error instanceof E)) {
    return NextResponse.json({ error: message }, { status: 409 })
  }
  if (VALIDATION_ERRORS.some((E) => error instanceof E)) {
    return NextResponse.json({ error: message }, { status: 400 })
  }

  return NextResponse.json({ error: message }, { status: 500 })
}
