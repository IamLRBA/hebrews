/**
 * Phase 10: Integrity checks to detect corruption or inconsistencies.
 */

import { prisma } from '@/lib/db'

export type Severity = 'critical' | 'warning' | 'info'

export interface IntegrityIssue {
  code: string
  severity: Severity
  message: string
  entityType?: string
  entityId?: string
  details?: Record<string, unknown>
}

export async function runIntegrityChecks(): Promise<IntegrityIssue[]> {
  const issues: IntegrityIssue[] = []

  // Orders marked served but no completed payment
  const servedOrders = await prisma.order.findMany({
    where: { status: 'served' },
    select: { id: true, orderNumber: true, totalUgx: true },
  })
  for (const order of servedOrders) {
    const completedPayment = await prisma.payment.findFirst({
      where: { orderId: order.id, status: 'completed' },
    })
    if (!completedPayment) {
      issues.push({
        code: 'ORDER_SERVED_WITHOUT_PAYMENT',
        severity: 'critical',
        message: `Order ${order.orderNumber} is served but has no completed payment`,
        entityType: 'order',
        entityId: order.id,
        details: { orderNumber: order.orderNumber, totalUgx: Number(order.totalUgx) },
      })
    }
  }

  // Payments without valid order (orphan)
  const payments = await prisma.payment.findMany({
    select: { id: true, orderId: true, amountUgx: true, createdAt: true },
  })
  for (const p of payments) {
    const order = await prisma.order.findUnique({
      where: { id: p.orderId },
      select: { id: true },
    })
    if (!order) {
      issues.push({
        code: 'PAYMENT_WITHOUT_ORDER',
        severity: 'critical',
        message: `Payment ${p.id} references non-existent order ${p.orderId}`,
        entityType: 'payment',
        entityId: p.id,
        details: { orderId: p.orderId, amountUgx: Number(p.amountUgx) },
      })
    }
  }

  // Multiple completed payments for same order; or total payments exceed order total
  const orderIds = Array.from(new Set(payments.map((p) => p.orderId)))
  for (const orderId of orderIds) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { totalUgx: true, orderNumber: true },
    })
    if (!order) continue
    const completedPayments = await prisma.payment.findMany({
      where: { orderId, status: 'completed' },
      select: { id: true, amountUgx: true, method: true },
    })
    const totalPaid = completedPayments.reduce((s, p) => s + Number(p.amountUgx), 0)
    const orderTotal = Number(order.totalUgx)
    if (totalPaid > orderTotal + 0.01) {
      issues.push({
        code: 'PAYMENTS_EXCEED_ORDER_TOTAL',
        severity: 'critical',
        message: `Order ${order.orderNumber} has completed payments (${totalPaid}) exceeding order total (${orderTotal})`,
        entityType: 'order',
        entityId: orderId,
        details: { orderNumber: order.orderNumber, totalPaid, orderTotal },
      })
    }
    if (completedPayments.length > 1 && totalPaid <= orderTotal + 0.01) {
      issues.push({
        code: 'MULTIPLE_COMPLETED_PAYMENTS',
        severity: 'warning',
        message: `Order ${orderId} has ${completedPayments.length} completed payments`,
        entityType: 'order',
        entityId: orderId,
        details: { count: completedPayments.length },
      })
    }
  }

  // Cash sale outside active shift (payment recorded after shift closed)
  const cashPayments = await prisma.payment.findMany({
    where: { method: 'cash', status: 'completed' },
    select: {
      id: true,
      orderId: true,
      amountUgx: true,
      createdAt: true,
      order: { select: { shiftId: true, shift: { select: { endTime: true } } } },
    },
  })
  for (const p of cashPayments) {
    if (p.order?.shift?.endTime != null) {
      issues.push({
        code: 'CASH_SALE_OUTSIDE_ACTIVE_SHIFT',
        severity: 'warning',
        message: `Cash payment ${p.id} is for order in closed shift ${p.order.shiftId}`,
        entityType: 'payment',
        entityId: p.id,
        details: { orderId: p.orderId, shiftId: p.order.shiftId, amountUgx: Number(p.amountUgx) },
      })
    }
  }

  // OrderItems with missing order
  const orderItems = await prisma.orderItem.findMany({
    select: { id: true, orderId: true },
  })
  for (const oi of orderItems) {
    const order = await prisma.order.findUnique({
      where: { id: oi.orderId },
      select: { id: true },
    })
    if (!order) {
      issues.push({
        code: 'ORDER_ITEM_WITHOUT_ORDER',
        severity: 'critical',
        message: `OrderItem ${oi.id} references non-existent order ${oi.orderId}`,
        entityType: 'orderItem',
        entityId: oi.id,
        details: { orderId: oi.orderId },
      })
    }
  }

  // Shifts with missing staff
  const shifts = await prisma.shift.findMany({
    select: { id: true, staffId: true, startTime: true },
  })
  for (const s of shifts) {
    const staff = await prisma.staff.findUnique({
      where: { id: s.staffId },
      select: { id: true },
    })
    if (!staff) {
      issues.push({
        code: 'SHIFT_WITHOUT_STAFF',
        severity: 'warning',
        message: `Shift ${s.id} references non-existent staff ${s.staffId}`,
        entityType: 'shift',
        entityId: s.id,
        details: { staffId: s.staffId },
      })
    }
  }

  return issues
}

export function groupBySeverity(issues: IntegrityIssue[]): { critical: IntegrityIssue[]; warning: IntegrityIssue[]; info: IntegrityIssue[] } {
  const critical: IntegrityIssue[] = []
  const warning: IntegrityIssue[] = []
  const info: IntegrityIssue[] = []
  for (const i of issues) {
    if (i.severity === 'critical') critical.push(i)
    else if (i.severity === 'warning') warning.push(i)
    else info.push(i)
  }
  return { critical, warning, info }
}
