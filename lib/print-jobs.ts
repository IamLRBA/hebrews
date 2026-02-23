/**
 * Print job tracking and hardware triggers.
 * Idempotent receipt (one per payment); kitchen first-time + explicit reprints; cash drawer once per transaction.
 */

import { prisma } from '@/lib/db'
import { getProductNameMap } from '@/lib/read-models'
import { getReceiptPrinterService } from '@/lib/hardware/receipt-printer'
import { getKitchenPrinterService } from '@/lib/hardware/kitchen-printer'
import { getCashDrawerService } from '@/lib/hardware/cash-drawer'
import type { ReceiptPayload, KitchenTicketPayload } from '@/lib/hardware/types'
import { appendAuditLog, AuditActionType, AuditEntityType } from '@/lib/audit-log'
import type { PrintJobType } from '@prisma/client'

const CAFE_NAME = process.env.CAFE_NAME ?? 'Café'

// ---------------------------------------------------------------------------
// Receipt: one per payment (idempotent)
// ---------------------------------------------------------------------------

/**
 * Trigger receipt print for a completed payment. Idempotent: only one receipt per payment.
 * Creates PrintJob if none exists; retries if job exists but failed. No-op if already success.
 */
export async function triggerReceiptForPayment(params: {
  paymentId: string
  staffId: string
  terminalId?: string | null
}): Promise<void> {
  const { paymentId, staffId, terminalId } = params

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId, status: 'completed' },
    select: {
      id: true,
      orderId: true,
      amountUgx: true,
      changeUgx: true,
      method: true,
      createdAt: true,
      createdByStaffId: true,
      terminalId: true,
      order: {
        select: {
          orderNumber: true,
          tableId: true,
          table: { select: { code: true } },
          subtotalUgx: true,
          taxUgx: true,
          totalUgx: true,
          orderItems: {
            orderBy: { sortOrder: 'asc' },
            select: {
              quantity: true,
              lineTotalUgx: true,
              productId: true,
              size: true,
              modifier: true,
              notes: true,
            },
          },
        },
      },
    },
  })

  if (!payment?.order) return

  const order = payment.order
  const nameMap = await getProductNameMap()
  const methodLabel =
    payment.method === 'cash'
      ? 'Cash'
      : payment.method === 'mtn_momo'
        ? 'MTN MoMo'
        : payment.method === 'airtel_money'
          ? 'Airtel Money'
          : String(payment.method)
  const amountUgx = Number(payment.amountUgx)
  const changeUgx = payment.changeUgx != null ? Number(payment.changeUgx) : undefined
  const totalUgx = Number(order.totalUgx)
  const tenderedUgx = payment.method === 'cash' ? amountUgx + (changeUgx ?? 0) : undefined

  let job = await prisma.printJob.findUnique({
    where: {
      paymentId_type: { paymentId, type: 'receipt' },
    },
  })

  if (job?.status === 'success') return

  if (!job) {
    try {
      job = await prisma.printJob.create({
        data: {
          orderId: payment.orderId,
          paymentId,
          type: 'receipt',
          terminalId: terminalId ?? payment.terminalId ?? undefined,
          status: 'pending',
        },
      })
    } catch (e) {
      const existing = await prisma.printJob.findUnique({
        where: { paymentId_type: { paymentId, type: 'receipt' } },
      })
      if (existing?.status === 'success') return
      job = existing ?? null
    }
  }

  if (!job) return

  const staff = await prisma.staff.findUnique({
    where: { id: payment.createdByStaffId },
    select: { fullName: true },
  })
  const staffLabel = staff?.fullName ?? payment.createdByStaffId

  const payload: ReceiptPayload = {
    cafeName: CAFE_NAME,
    terminalId: terminalId ?? payment.terminalId ?? 'POS',
    orderNumber: order.orderNumber,
    tableCode: order.table?.code ?? null,
    items: order.orderItems.map((item) => ({
      name: nameMap[item.productId] ?? item.productId,
      quantity: item.quantity,
      unitPriceUgx: Math.round(Number(item.lineTotalUgx) / item.quantity),
      lineTotalUgx: Number(item.lineTotalUgx),
      modifiers: [item.size, item.modifier, item.notes].filter(Boolean) as string[],
    })),
    subtotalUgx: Number(order.subtotalUgx),
    taxUgx: Number(order.taxUgx) || undefined,
    totalUgx,
    paymentMethod: methodLabel,
    amountTenderedUgx: tenderedUgx,
    changeUgx,
    paidAt: payment.createdAt.toISOString(),
    staffNameOrId: staffLabel,
  }

  const printer = getReceiptPrinterService()
  const result = await printer.printReceipt(payload, job.deviceId ?? undefined)

  const now = new Date()
  if (result.ok) {
    await prisma.printJob.update({
      where: { id: job.id },
      data: { status: 'success', completedAt: now },
    })
    await appendAuditLog({
      staffId,
      terminalId: terminalId ?? undefined,
      actionType: AuditActionType.RECEIPT_PRINTED,
      entityType: AuditEntityType.payment,
      entityId: paymentId,
      newState: { orderId: payment.orderId, printJobId: job.id, deviceId: job.deviceId },
    })
  } else {
    await prisma.printJob.update({
      where: { id: job.id },
      data: {
        status: 'failed',
        errorMessage: result.error.slice(0, 512),
        retryCount: job.retryCount + 1,
        completedAt: now,
      },
    })
    await appendAuditLog({
      staffId,
      terminalId: terminalId ?? undefined,
      actionType: AuditActionType.RECEIPT_PRINT_FAILED,
      entityType: AuditEntityType.payment,
      entityId: paymentId,
      newState: { orderId: payment.orderId, printJobId: job.id, error: result.error },
    })
  }
}

// ---------------------------------------------------------------------------
// Kitchen ticket: first time on preparing; reprints explicit
// ---------------------------------------------------------------------------

/**
 * Trigger kitchen ticket when order goes to preparing. First-time only (no duplicate auto-print).
 * Creates one PrintJob per order for type kitchen_ticket; if a successful job already exists, skip.
 */
export async function triggerKitchenTicketForOrder(params: {
  orderId: string
  staffId: string
  terminalId?: string | null
  isReprint?: boolean
}): Promise<void> {
  const { orderId, staffId, terminalId, isReprint = false } = params

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      tableId: true,
      table: { select: { code: true } },
      orderItems: {
        orderBy: { sortOrder: 'asc' },
        select: {
          quantity: true,
          productId: true,
          modifier: true,
          notes: true,
        },
      },
    },
  })
  if (!order) return

  if (!isReprint) {
    const existingSuccess = await prisma.printJob.findFirst({
      where: { orderId, type: 'kitchen_ticket', status: 'success' },
    })
    if (existingSuccess) return
  }

  const job = await prisma.printJob.create({
    data: {
      orderId,
      type: 'kitchen_ticket',
      terminalId: terminalId ?? undefined,
      status: 'pending',
    },
  })

  const nameMap = await getProductNameMap()
  const payload: KitchenTicketPayload = {
    orderNumber: order.orderNumber,
    tableCode: order.table?.code ?? null,
    items: order.orderItems.map((item) => ({
      name: nameMap[item.productId] ?? item.productId,
      quantity: item.quantity,
      modifiers: [item.modifier].filter(Boolean) as string[],
      notes: item.notes ?? undefined,
    })),
    sentAt: new Date().toISOString(),
    staffId,
  }

  const printer = getKitchenPrinterService()
  const result = await printer.printKitchenTicket(payload, job.deviceId ?? undefined)

  const now = new Date()
  if (result.ok) {
    await prisma.printJob.update({
      where: { id: job.id },
      data: { status: 'success', completedAt: now },
    })
    await appendAuditLog({
      staffId,
      terminalId: terminalId ?? undefined,
      actionType: AuditActionType.KITCHEN_TICKET_PRINTED,
      entityType: AuditEntityType.order,
      entityId: orderId,
      newState: { printJobId: job.id, isReprint },
    })
  } else {
    await prisma.printJob.update({
      where: { id: job.id },
      data: {
        status: 'failed',
        errorMessage: result.error.slice(0, 512),
        retryCount: job.retryCount + 1,
        completedAt: now,
      },
    })
    await appendAuditLog({
      staffId,
      terminalId: terminalId ?? undefined,
      actionType: AuditActionType.KITCHEN_TICKET_PRINT_FAILED,
      entityType: AuditEntityType.order,
      entityId: orderId,
      newState: { printJobId: job.id, error: result.error },
    })
  }
}

// ---------------------------------------------------------------------------
// Cash drawer: once per cash payment; manual override separate
// ---------------------------------------------------------------------------

/**
 * Open cash drawer for a completed cash payment. No duplicate open for same payment.
 * Phase 9: only opens when requestTerminalId matches the payment's terminalId (drawer opens on terminal that processed payment).
 */
export async function openCashDrawerForPayment(params: {
  paymentId: string
  staffId: string
  terminalId?: string | null
  /** When provided, drawer opens only if this matches the payment's terminalId. */
  requestTerminalId?: string | null
  deviceId?: string | null
}): Promise<void> {
  const { paymentId, staffId, terminalId, requestTerminalId, deviceId } = params

  const existing = await prisma.auditLog.findFirst({
    where: {
      actionType: AuditActionType.CASH_DRAWER_OPENED,
      entityType: AuditEntityType.payment,
      entityId: paymentId,
    },
  })
  if (existing) return

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { method: true, terminalId: true },
  })
  if (!payment || payment.method !== 'cash') return

  if (requestTerminalId != null && requestTerminalId !== '') {
    const payTerminal = payment.terminalId ?? null
    const reqNorm = requestTerminalId.trim().replace(/-/g, '').slice(0, 32)
    const payNorm = payTerminal ? payTerminal.replace(/-/g, '').slice(0, 32) : ''
    if (payNorm && reqNorm !== payNorm) return
  }

  const drawer = getCashDrawerService()
  const result = await drawer.open(deviceId ?? undefined)

  await appendAuditLog({
    staffId,
    terminalId: terminalId ?? undefined,
    actionType: AuditActionType.CASH_DRAWER_OPENED,
    entityType: AuditEntityType.payment,
    entityId: paymentId,
    newState: { result: result.ok ? 'success' : 'failure', error: result.ok ? undefined : result.error },
  })
}

/**
 * Manual cash drawer open (manager-only). Caller must enforce role; we only log.
 */
export async function openCashDrawerManual(params: {
  staffId: string
  terminalId?: string | null
  deviceId?: string | null
}): Promise<{ ok: boolean; error?: string }> {
  const { staffId, terminalId, deviceId } = params
  const drawer = getCashDrawerService()
  const result = await drawer.open(deviceId ?? undefined)

  await appendAuditLog({
    staffId,
    terminalId: terminalId ?? undefined,
    actionType: AuditActionType.CASH_DRAWER_MANUAL_OPEN,
    entityType: AuditEntityType.auth,
    newState: { result: result.ok ? 'success' : 'failure', error: result.ok ? undefined : result.error },
  })

  return result.ok ? { ok: true } : { ok: false, error: result.error }
}
