/**
 * Phase 10: Data export for accountants/auditors (CSV, JSON).
 */

import { prisma } from '@/lib/db'
import { getSystemConfig } from '@/lib/config/system-config'

const DEFAULT_EXPORT_LIMIT = 10_000

async function getExportLimit(key: string): Promise<number> {
  const v = await getSystemConfig(key)
  const n = parseInt(v ?? '', 10)
  return Number.isFinite(n) && n > 0 ? Math.min(n, 100_000) : DEFAULT_EXPORT_LIMIT
}

export async function exportOrdersCSV(params?: { limit?: number; from?: Date; to?: Date }): Promise<string> {
  const limit = params?.limit ?? (await getExportLimit('exportLimitOrders'))
  const where: { createdAt?: { gte?: Date; lte?: Date } } = {}
  if (params?.from) where.createdAt = { ...where.createdAt, gte: params.from }
  if (params?.to) where.createdAt = { ...where.createdAt, lte: params.to }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      createdByStaff: { select: { fullName: true } },
      table: { select: { code: true } },
    },
  })

  const headers = [
    'id',
    'orderNumber',
    'orderType',
    'tableId',
    'tableCode',
    'shiftId',
    'createdByStaffId',
    'staffName',
    'terminalId',
    'status',
    'subtotalUgx',
    'taxUgx',
    'totalUgx',
    'createdAt',
    'updatedAt',
    'servedAt',
  ]
  const rows = orders.map((o) =>
    [
      o.id,
      o.orderNumber,
      o.orderType,
      o.tableId ?? '',
      o.table?.code ?? '',
      o.shiftId,
      o.createdByStaffId,
      (o.createdByStaff?.fullName ?? '').replace(/"/g, '""'),
      o.terminalId ?? '',
      o.status,
      o.subtotalUgx.toString(),
      o.taxUgx.toString(),
      o.totalUgx.toString(),
      o.createdAt.toISOString(),
      o.updatedAt.toISOString(),
      o.servedAt?.toISOString() ?? '',
    ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')
  )
  return [headers.map((h) => `"${h}"`).join(','), ...rows].join('\n')
}

export async function exportPaymentsCSV(params?: { limit?: number; from?: Date; to?: Date }): Promise<string> {
  const limit = params?.limit ?? (await getExportLimit('exportLimitPayments'))
  const where: { createdAt?: { gte?: Date; lte?: Date } } = {}
  if (params?.from) where.createdAt = { ...where.createdAt, gte: params.from }
  if (params?.to) where.createdAt = { ...where.createdAt, lte: params.to }

  const payments = await prisma.payment.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      order: { select: { orderNumber: true, tableId: true } },
      createdByStaff: { select: { fullName: true } },
    },
  })

  const headers = [
    'id',
    'orderId',
    'orderNumber',
    'amountUgx',
    'changeUgx',
    'method',
    'status',
    'reference',
    'externalReference',
    'createdByStaffId',
    'staffName',
    'terminalId',
    'createdAt',
  ]
  const rows = payments.map((p) =>
    [
      p.id,
      p.orderId,
      p.order?.orderNumber ?? '',
      p.amountUgx.toString(),
      p.changeUgx?.toString() ?? '',
      p.method,
      p.status,
      (p.reference ?? '').replace(/"/g, '""'),
      (p.externalReference ?? '').replace(/"/g, '""'),
      p.createdByStaffId,
      (p.createdByStaff?.fullName ?? '').replace(/"/g, '""'),
      p.terminalId ?? '',
      p.createdAt.toISOString(),
    ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')
  )
  return [headers.map((h) => `"${h}"`).join(','), ...rows].join('\n')
}

export async function exportShiftsCSV(params?: { limit?: number }): Promise<string> {
  const limit = params?.limit ?? 1000
  const shifts = await prisma.shift.findMany({
    orderBy: { startTime: 'desc' },
    take: limit,
    include: {
      staff: { select: { fullName: true } },
      closedByStaff: { select: { fullName: true } },
    },
  })
  const headers = [
    'id',
    'staffId',
    'staffName',
    'terminalId',
    'startTime',
    'endTime',
    'totalSales',
    'closedByStaffId',
    'closedByStaffName',
    'countedCashUgx',
    'cashVarianceUgx',
    'createdAt',
  ]
  const rows = shifts.map((s) =>
    [
      s.id,
      s.staffId,
      (s.staff?.fullName ?? '').replace(/"/g, '""'),
      s.terminalId,
      s.startTime.toISOString(),
      s.endTime?.toISOString() ?? '',
      s.totalSales.toString(),
      s.closedByStaffId ?? '',
      (s.closedByStaff?.fullName ?? '').replace(/"/g, '""'),
      s.countedCashUgx?.toString() ?? '',
      s.cashVarianceUgx?.toString() ?? '',
      s.createdAt.toISOString(),
    ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')
  )
  return [headers.map((h) => `"${h}"`).join(','), ...rows].join('\n')
}

export async function exportFullJSON(params?: { ordersLimit?: number; paymentsLimit?: number }): Promise<object> {
  const ordersLimit = params?.ordersLimit ?? (await getExportLimit('exportLimitOrders'))
  const paymentsLimit = params?.paymentsLimit ?? (await getExportLimit('exportLimitPayments'))

  const [orders, payments, shifts, staff] = await Promise.all([
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: ordersLimit,
      include: {
        orderItems: true,
        createdByStaff: { select: { fullName: true, role: true } },
        table: { select: { code: true } },
      },
    }),
    prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: paymentsLimit,
      include: {
        createdByStaff: { select: { fullName: true } },
      },
    }),
    prisma.shift.findMany({
      orderBy: { startTime: 'desc' },
      take: 500,
      include: { staff: { select: { fullName: true } }, closedByStaff: { select: { fullName: true } } },
    }),
    prisma.staff.findMany({ select: { id: true, fullName: true, role: true, isActive: true } }),
  ])

  const serialize = (obj: unknown) => JSON.parse(JSON.stringify(obj))
  return {
    exportedAt: new Date().toISOString(),
    orders: serialize(orders),
    payments: serialize(payments),
    shifts: serialize(shifts),
    staff: serialize(staff),
  }
}
