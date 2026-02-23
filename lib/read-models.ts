import { prisma } from '@/lib/db'

const ACTIVE_ORDER_STATUSES = ['pending', 'preparing', 'ready', 'awaiting_payment'] as const
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
 * Active = status in (pending, preparing, ready, awaiting_payment). Served and cancelled are excluded.
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

/**
 * Returns active orders for a specific shift. Same shape as getActiveOrdersForPos.
 * Active = status in (pending, preparing, ready, awaiting_payment). Read-only.
 * Returns [] if shift has no active orders.
 */
export async function getActiveOrdersForShift(shiftId: string): Promise<ActiveOrderForPos[]> {
  const orders = await prisma.order.findMany({
    where: {
      shiftId,
      status: { in: [...ACTIVE_ORDER_STATUSES] },
    },
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
  imageUrl: string | null
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
          product: { select: { name: true, images: true } },
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
      imageUrl: item.product?.images?.[0] ?? null,
      quantity: item.quantity,
      size: item.size,
      modifier: item.modifier,
      notes: item.notes,
      sortOrder: item.sortOrder,
    })),
  }))
}

// ---------------------------------------------------------------------------
// Order detail read model (single order with items and payments)
// ---------------------------------------------------------------------------

export type OrderDetailItem = {
  id: string
  productId: string
  productName: string
  category: string | null
  imageUrl: string | null
  quantity: number
  size: string | null
  modifier: string | null
  notes: string | null
  subtotalUgx: number
}

export type OrderDetailPayment = {
  method: string
  amountUgx: number
}

export type OrderDetail = {
  orderId: string
  orderNumber: string
  orderType: 'dine_in' | 'takeaway'
  tableId: string | null
  tableCode: string | null
  status: string
  totalUgx: number
  createdAt: Date
  sentToKitchenAt?: Date | null
  sentToBarAt?: Date | null
  preparationNotes?: string | null
  items: OrderDetailItem[]
  payments: OrderDetailPayment[]
}

/**
 * Returns a single order with items and payments. Read-only.
 * subtotalUgx comes from order item lineTotalUgx.
 * Returns null if the order does not exist.
 */
export async function getOrderDetail(orderId: string): Promise<OrderDetail | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      orderType: true,
      tableId: true,
      table: { select: { code: true } },
      status: true,
      totalUgx: true,
      createdAt: true,
      sentToKitchenAt: true,
      sentToBarAt: true,
      preparationNotes: true,
      orderItems: {
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          productId: true,
          quantity: true,
          size: true,
          modifier: true,
          notes: true,
          lineTotalUgx: true,
          product: { select: { images: true, category: true } },
        },
      },
      payments: {
        where: { status: 'completed' },
        select: {
          amountUgx: true,
          method: true,
        },
      },
    },
  })

  if (!order) {
    return null
  }

  const nameMap = await getProductNameMap()

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    tableId: order.tableId,
    tableCode: order.table?.code ?? null,
    status: order.status,
    totalUgx: Number(order.totalUgx),
    createdAt: order.createdAt,
    sentToKitchenAt: order.sentToKitchenAt ?? undefined,
    sentToBarAt: (order as { sentToBarAt?: Date | null }).sentToBarAt ?? undefined,
    preparationNotes: (order as { preparationNotes?: string | null }).preparationNotes ?? undefined,
    items: order.orderItems.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: nameMap[item.productId] ?? item.productId,
      category: item.product?.category ?? null,
      imageUrl: item.product?.images?.[0] ?? null,
      quantity: item.quantity,
      size: item.size,
      modifier: item.modifier,
      notes: item.notes,
      subtotalUgx: Number(item.lineTotalUgx),
    })),
    payments: order.payments.map((p) => ({
      method: p.method,
      amountUgx: Number(p.amountUgx),
    })),
  }
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

// ---------------------------------------------------------------------------
// Shift payment summary read model (by method, before closing)
// ---------------------------------------------------------------------------

export type ShiftPaymentSummary = {
  cashTotalUgx: number
  momoTotalUgx: number
  cardTotalUgx: number
  grandTotalUgx: number
}

/**
 * Returns payment totals for a shift grouped by method (cash, momo, card).
 * Completed payments only. Momo = mtn_momo + airtel_money. Read-only.
 * Returns zero totals if shift has no orders or no completed payments.
 */
export async function getShiftPaymentSummary(shiftId: string): Promise<ShiftPaymentSummary> {
  const orders = await prisma.order.findMany({
    where: { shiftId },
    select: { id: true },
  })
  const orderIds = orders.map((o) => o.id)

  if (orderIds.length === 0) {
    return { cashTotalUgx: 0, momoTotalUgx: 0, cardTotalUgx: 0, grandTotalUgx: 0 }
  }

  const baseWhere = {
    orderId: { in: orderIds },
    status: 'completed' as const,
  }

  const [cashResult, cardResult, momoResult, totalResult] = await Promise.all([
    prisma.payment.aggregate({
      where: { ...baseWhere, method: 'cash' },
      _sum: { amountUgx: true },
    }),
    prisma.payment.aggregate({
      where: { ...baseWhere, method: 'card' },
      _sum: { amountUgx: true },
    }),
    prisma.payment.aggregate({
      where: { ...baseWhere, method: { in: ['mtn_momo', 'airtel_money'] } },
      _sum: { amountUgx: true },
    }),
    prisma.payment.aggregate({
      where: baseWhere,
      _sum: { amountUgx: true },
    }),
  ])

  const cashTotalUgx = cashResult._sum.amountUgx != null ? Number(cashResult._sum.amountUgx) : 0
  const cardTotalUgx = cardResult._sum.amountUgx != null ? Number(cardResult._sum.amountUgx) : 0
  const momoTotalUgx = momoResult._sum.amountUgx != null ? Number(momoResult._sum.amountUgx) : 0
  const grandTotalUgx = totalResult._sum.amountUgx != null ? Number(totalResult._sum.amountUgx) : 0

  return {
    cashTotalUgx,
    momoTotalUgx,
    cardTotalUgx,
    grandTotalUgx,
  }
}

// ---------------------------------------------------------------------------
// Table statuses read model (POS tables screen)
// ---------------------------------------------------------------------------

export type TableStatus = {
  tableId: string
  tableCode: string
  capacity: number | null
  hasActiveOrder: boolean
  orderId: string | null
  orderNumber: string | null
}

/**
 * Returns status for all tables: whether they have an active order in the given shift.
 * Active order = status in (pending, preparing, ready, awaiting_payment). Read-only. Sorted by table code.
 */
export async function getTableStatuses(shiftId: string): Promise<TableStatus[]> {
  const [tables, orders] = await Promise.all([
    prisma.restaurantTable.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
      select: { id: true, code: true, capacity: true },
    }),
    prisma.order.findMany({
      where: {
        shiftId,
        status: { in: [...ACTIVE_ORDER_STATUSES] },
        tableId: { not: null },
      },
      select: { id: true, orderNumber: true, tableId: true },
    }),
  ])

  const orderByTableId = new Map<string, { id: string; orderNumber: string }>()
  for (const o of orders) {
    if (o.tableId) orderByTableId.set(o.tableId, { id: o.id, orderNumber: o.orderNumber })
  }

  const result = tables.map((t) => {
    const order = orderByTableId.get(t.id)
    return {
      tableId: t.id,
      tableCode: t.code,
      capacity: t.capacity,
      hasActiveOrder: !!order,
      orderId: order?.id ?? null,
      orderNumber: order?.orderNumber ?? null,
    }
  })

  result.sort((a, b) => {
    const isBooth = (c: string) => c.toLowerCase().startsWith('booth')
    const aBooth = isBooth(a.tableCode)
    const bBooth = isBooth(b.tableCode)
    if (aBooth && !bBooth) return -1
    if (!aBooth && bBooth) return 1
    if (aBooth && bBooth) return a.tableCode.localeCompare(b.tableCode)
    const aNum = parseInt(a.tableCode.replace(/\D/g, ''), 10) || 0
    const bNum = parseInt(b.tableCode.replace(/\D/g, ''), 10) || 0
    return aNum - bNum
  })
  return result
}

// ---------------------------------------------------------------------------
// Active products read model (POS menu)
// ---------------------------------------------------------------------------

export type ProductForPos = {
  id: string
  name: string
  priceUgx: number
  isActive: boolean
}

/**
 * Returns active products for POS product selection. Read-only.
 * Only products with isActive = true. Sorted by name ascending.
 */
export async function getActiveProductsForPos(): Promise<ProductForPos[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      priceUgx: true,
      isActive: true,
    },
  })

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    priceUgx: Number(p.priceUgx),
    isActive: p.isActive,
  }))
}

export type PosProduct = {
  productId: string
  name: string
  priceUgx: number
  category?: string | null
  section?: string | null
  images?: string[]
  sizes?: string[]
  isHappyHour?: boolean
}

/**
 * Returns active products for POS catalog (tap-to-add). Read-only. Sorted by category, section, then name.
 */
export async function getPosProducts(): Promise<PosProduct[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: [{ category: 'asc' }, { section: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      priceUgx: true,
      category: true,
      section: true,
      images: true,
      sizes: true,
      isHappyHour: true,
    },
  })
  return products.map((p) => ({
    productId: p.id,
    name: p.name,
    priceUgx: Number(p.priceUgx),
    category: p.category ?? null,
    section: p.section ?? null,
    images: p.images ?? [],
    sizes: p.sizes ?? [],
    isHappyHour: p.isHappyHour ?? false,
  }))
}

/**
 * Returns a map of product id to product name for all active products.
 * Used to enrich order items with productName in KDS, ready orders, and order detail.
 */
export async function getProductNameMap(): Promise<Record<string, string>> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  })
  const map: Record<string, string> = {}
  for (const p of products) {
    map[p.id] = p.name
  }
  return map
}

// ---------------------------------------------------------------------------
// Active staff read model (POS login)
// ---------------------------------------------------------------------------

export type ActiveStaffMember = {
  id: string
  name: string
}

/**
 * Returns all active staff for POS login dropdown.
 * Read-only; no schema changes. Sorted by name ascending.
 */
export async function getActiveStaff(): Promise<ActiveStaffMember[]> {
  const staff = await prisma.staff.findMany({
    where: { isActive: true },
    orderBy: { fullName: 'asc' },
    select: { id: true, fullName: true },
  })
  return staff.map((s) => ({ id: s.id, name: s.fullName }))
}

// ---------------------------------------------------------------------------
// Ready orders read model (POS handover)
// ---------------------------------------------------------------------------

export type ReadyOrderItem = {
  productId: string
  productName: string
  imageUrl: string | null
  quantity: number
}

export type ReadyOrder = {
  orderId: string
  orderNumber: string
  orderType: string
  tableId: string | null
  status: string
  createdAt: Date
  totalUgx: number
  totalPaidUgx: number
  isFullyPaid: boolean
  items: ReadyOrderItem[]
}

/**
 * Returns orders with status 'ready' or 'awaiting_payment' for POS handover screen.
 * Read-only. Sorted by createdAt ascending (oldest first). Includes totalUgx, totalPaidUgx, isFullyPaid.
 */
export async function getReadyOrders(): Promise<ReadyOrder[]> {
  const orders = await prisma.order.findMany({
    where: { status: { in: ['ready', 'awaiting_payment'] } },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      orderNumber: true,
      orderType: true,
      tableId: true,
      status: true,
      totalUgx: true,
      createdAt: true,
      orderItems: {
        select: {
          productId: true,
          quantity: true,
          product: { select: { images: true } },
        },
      },
    },
  })
  if (orders.length === 0) return []
  const orderIds = orders.map((o) => o.id)
  const paymentSums = await prisma.payment.groupBy({
    by: ['orderId'],
    where: { orderId: { in: orderIds }, status: 'completed' },
    _sum: { amountUgx: true },
  })
  const totalPaidByOrderId = new Map<string, number>()
  for (const row of paymentSums) {
    totalPaidByOrderId.set(row.orderId, row._sum.amountUgx != null ? Number(row._sum.amountUgx) : 0)
  }
  const nameMap = await getProductNameMap()
  return orders.map((o) => {
    const totalUgx = Number(o.totalUgx)
    const totalPaidUgx = totalPaidByOrderId.get(o.id) ?? 0
    const isFullyPaid = totalPaidUgx >= totalUgx
    return {
      orderId: o.id,
      orderNumber: o.orderNumber,
      orderType: o.orderType,
      tableId: o.tableId,
      status: o.status,
      createdAt: o.createdAt,
      totalUgx,
      totalPaidUgx,
      isFullyPaid,
      items: o.orderItems.map((item) => ({
        productId: item.productId,
        productName: nameMap[item.productId] ?? item.productId,
        imageUrl: item.product?.images?.[0] ?? null,
        quantity: item.quantity,
      })),
    }
  })
}
