import { prisma } from '@/lib/db'

const ACTIVE_ORDER_STATUSES = ['pending', 'preparing', 'ready'] as const
const KDS_ORDER_STATUSES = ['preparing', 'ready'] as const

// ---------------------------------------------------------------------------
// Active orders read model (POS)
// ---------------------------------------------------------------------------

export type ActiveOrderForPos = {
  orderId: string
  orderNumber: string
  orderType: 'dine_in' | 'takeaway'
  tableId: string | null
  status: string
  createdAt: Date
  subtotalUgx: number
  taxUgx: number
  totalUgx: number
  totalPaidUgx: number
  isFullyPaid: boolean
  createdByStaffId: string
  terminalId: string
}

/**
 * Returns all active orders for the POS screen.
 * Active = status in (pending, preparing, ready). Served and cancelled are excluded.
 * totalPaidUgx = sum of completed payments only. isFullyPaid = totalPaidUgx >= totalUgx.
 * Read-only; no writes or side effects.
 */
export async function getActiveOrdersForPos(): Promise<ActiveOrderForPos[]> {
  const orders = await prisma.order.findMany({
    where: { status: { in: [...ACTIVE_ORDER_STATUSES] } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      orderNumber: true,
      orderType: true,
      tableId: true,
      status: true,
      createdAt: true,
      subtotalUgx: true,
      taxUgx: true,
      totalUgx: true,
      createdByStaffId: true,
      terminalId: true,
    },
  })

  if (orders.length === 0) {
    return []
  }

  const orderIds = orders.map((o) => o.id)
  const paymentSums = await prisma.payment.groupBy({
    by: ['orderId'],
    where: {
      orderId: { in: orderIds },
      status: 'completed',
    },
    _sum: { amountUgx: true },
  })

  const totalPaidByOrderId = new Map<string, number>()
  for (const row of paymentSums) {
    const sum = row._sum.amountUgx
    totalPaidByOrderId.set(row.orderId, sum != null ? Number(sum) : 0)
  }

  return orders.map((o) => {
    const totalPaidUgx = totalPaidByOrderId.get(o.id) ?? 0
    const totalUgx = Number(o.totalUgx)
    const isFullyPaid = totalPaidUgx >= totalUgx
    return {
      orderId: o.id,
      orderNumber: o.orderNumber,
      orderType: o.orderType,
      tableId: o.tableId,
      status: o.status,
      createdAt: o.createdAt,
      subtotalUgx: Number(o.subtotalUgx),
      taxUgx: Number(o.taxUgx),
      totalUgx,
      totalPaidUgx,
      isFullyPaid,
      createdByStaffId: o.createdByStaffId,
      terminalId: o.terminalId,
    }
  })
}

// ---------------------------------------------------------------------------
// Kitchen Display System (KDS) read model
// ---------------------------------------------------------------------------

export type KdsOrderItem = {
  productName: string
  quantity: number
  size: string | null
  modifier: string | null
  notes: string | null
  sortOrder: number
}

export type KdsOrderForDisplay = {
  orderId: string
  orderNumber: string
  orderType: 'dine_in' | 'takeaway'
  tableId: string | null
  status: string
  createdAt: Date
  items: KdsOrderItem[]
}

/**
 * Returns all KDS-visible orders for the Kitchen Display System.
 * KDS-visible = status in (preparing, ready). Pending, served, and cancelled are excluded.
 * Orders sorted oldest-first (FIFO). No payments, totals, terminals, or staff/shift data.
 * Read-only; no writes or side effects.
 */
export async function getKdsOrders(): Promise<KdsOrderForDisplay[]> {
  const orders = await prisma.order.findMany({
    where: { status: { in: [...KDS_ORDER_STATUSES] } },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      orderNumber: true,
      orderType: true,
      tableId: true,
      status: true,
      createdAt: true,
      orderItems: {
        orderBy: { sortOrder: 'asc' },
        select: {
          quantity: true,
          size: true,
          modifier: true,
          notes: true,
          sortOrder: true,
          product: { select: { name: true } },
        },
      },
    },
  })

  return orders.map((o) => ({
    orderId: o.id,
    orderNumber: o.orderNumber,
    orderType: o.orderType,
    tableId: o.tableId,
    status: o.status,
    createdAt: o.createdAt,
    items: o.orderItems.map((item) => ({
      productName: item.product.name,
      quantity: item.quantity,
      size: item.size,
      modifier: item.modifier,
      notes: item.notes,
      sortOrder: item.sortOrder,
    })),
  }))
}

// ---------------------------------------------------------------------------
// Shift summary read model
// ---------------------------------------------------------------------------

export type ShiftSummary = {
  shiftId: string
  staffId: string
  terminalId: string
  startTime: Date
  endTime: Date | null
  totalOrders: number
  servedOrders: number
  cancelledOrders: number
  grossSalesUgx: number
  totalPaymentsUgx: number
  cashPaymentsUgx: number
  nonCashPaymentsUgx: number
}

/**
 * Returns the financial and operational summary for a single shift.
 * Served orders are the source of truth for gross sales; only completed payments are counted.
 * Active shift (endTime = null) is supported. Read-only; deterministic.
 * Returns null if the shift does not exist.
 */
export async function getShiftSummary(shiftId: string): Promise<ShiftSummary | null> {
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    select: {
      id: true,
      staffId: true,
      terminalId: true,
      startTime: true,
      endTime: true,
    },
  })

  if (!shift) {
    return null
  }

  const orders = await prisma.order.findMany({
    where: { shiftId },
    select: { id: true, status: true, totalUgx: true },
  })

  const orderIds = orders.map((o) => o.id)
  const totalOrders = orders.length
  const servedOrders = orders.filter((o) => o.status === 'served').length
  const cancelledOrders = orders.filter((o) => o.status === 'cancelled').length
  const grossSalesUgx = orders
    .filter((o) => o.status === 'served')
    .reduce((sum, o) => sum + Number(o.totalUgx), 0)

  let totalPaymentsUgx = 0
  let cashPaymentsUgx = 0

  if (orderIds.length > 0) {
    const [totalPaymentsResult, cashPaymentsResult] = await Promise.all([
      prisma.payment.aggregate({
        where: {
          orderId: { in: orderIds },
          status: 'completed',
        },
        _sum: { amountUgx: true },
      }),
      prisma.payment.aggregate({
        where: {
          orderId: { in: orderIds },
          status: 'completed',
          method: 'cash',
        },
        _sum: { amountUgx: true },
      }),
    ])

    totalPaymentsUgx = totalPaymentsResult._sum.amountUgx != null ? Number(totalPaymentsResult._sum.amountUgx) : 0
    cashPaymentsUgx = cashPaymentsResult._sum.amountUgx != null ? Number(cashPaymentsResult._sum.amountUgx) : 0
  }

  const nonCashPaymentsUgx = totalPaymentsUgx - cashPaymentsUgx

  return {
    shiftId: shift.id,
    staffId: shift.staffId,
    terminalId: shift.terminalId,
    startTime: shift.startTime,
    endTime: shift.endTime,
    totalOrders,
    servedOrders,
    cancelledOrders,
    grossSalesUgx,
    totalPaymentsUgx,
    cashPaymentsUgx,
    nonCashPaymentsUgx,
  }
}
