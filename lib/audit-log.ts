/**
 * Append-only audit log for critical actions. Do not expose update/delete APIs.
 */

import { prisma } from '@/lib/db'

export const AuditActionType = {
  ORDER_CREATE: 'ORDER_CREATE',
  ORDER_UPDATE: 'ORDER_UPDATE',
  ORDER_STATUS: 'ORDER_STATUS',
  ORDER_CANCEL: 'ORDER_CANCEL',
  PAYMENT: 'PAYMENT',
  PAYMENT_EXTERNAL: 'PAYMENT_EXTERNAL',
  TABLE_RELEASE: 'TABLE_RELEASE',
  SHIFT_START: 'SHIFT_START',
  SHIFT_CLOSE: 'SHIFT_CLOSE',
  AUTH_LOGIN: 'AUTH_LOGIN',
  AUTH_LOGOUT: 'AUTH_LOGOUT',
} as const

export const AuditEntityType = {
  order: 'order',
  payment: 'payment',
  table: 'table',
  shift: 'shift',
  auth: 'auth',
} as const

export type AuditActionTypeValue = (typeof AuditActionType)[keyof typeof AuditActionType]
export type AuditEntityTypeValue = (typeof AuditEntityType)[keyof typeof AuditEntityType]

export interface AppendAuditParams {
  staffId?: string | null
  terminalId?: string | null
  actionType: string
  entityType: string
  entityId?: string | null
  previousState?: Record<string, unknown> | null
  newState?: Record<string, unknown> | null
}

/**
 * Append a single audit record. Never update or delete audit rows from application code.
 */
export async function appendAuditLog(params: AppendAuditParams): Promise<void> {
  await prisma.auditLog.create({
    data: {
      staffId: params.staffId ?? undefined,
      terminalId: params.terminalId ?? undefined,
      actionType: params.actionType,
      entityType: params.entityType,
      entityId: params.entityId ?? undefined,
      previousState: params.previousState ?? undefined,
      newState: params.newState ?? undefined,
    },
  })
}
