/**
 * Append-only audit log for critical actions. Do not expose update/delete APIs.
 */

import type { Prisma } from '@prisma/client'
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
  RECEIPT_PRINTED: 'RECEIPT_PRINTED',
  RECEIPT_PRINT_FAILED: 'RECEIPT_PRINT_FAILED',
  KITCHEN_TICKET_PRINTED: 'KITCHEN_TICKET_PRINTED',
  KITCHEN_TICKET_PRINT_FAILED: 'KITCHEN_TICKET_PRINT_FAILED',
  CASH_DRAWER_OPENED: 'CASH_DRAWER_OPENED',
  CASH_DRAWER_MANUAL_OPEN: 'CASH_DRAWER_MANUAL_OPEN',
  CONFLICT_RESOLVED: 'CONFLICT_RESOLVED',
  TABLE_REASSIGNED: 'TABLE_REASSIGNED',
  PAYMENT_ALREADY_PROCESSED: 'PAYMENT_ALREADY_PROCESSED',
  ORDER_ALREADY_CLOSED: 'ORDER_ALREADY_CLOSED',
  BACKUP_CREATED: 'BACKUP_CREATED',
  BACKUP_DELETED: 'BACKUP_DELETED',
  EXPORT_ORDERS: 'EXPORT_ORDERS',
  EXPORT_PAYMENTS: 'EXPORT_PAYMENTS',
  EXPORT_FULL: 'EXPORT_FULL',
  IMPORT_DATA: 'IMPORT_DATA',
  INTEGRITY_CHECK: 'INTEGRITY_CHECK',
  RECOVERY_ACTION: 'RECOVERY_ACTION',
} as const

export const AuditEntityType = {
  order: 'order',
  payment: 'payment',
  table: 'table',
  shift: 'shift',
  auth: 'auth',
  backup: 'backup',
  export: 'export',
  import: 'import',
  integrity: 'integrity',
  config: 'config',
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
      previousState: (params.previousState ?? undefined) as Prisma.InputJsonValue | undefined,
      newState: (params.newState ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  })
}
