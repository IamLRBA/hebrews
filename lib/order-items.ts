import { prisma } from '@/lib/db'
import type { OrderItem } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

// ---------------------------------------------------------------------------
// Typed errors
// ---------------------------------------------------------------------------

export class OrderNotFoundError extends Error {
  readonly code = 'ORDER_NOT_FOUND' as const
  constructor(public readonly orderId: string) {
    super(`Order not found: ${orderId}`)
    this.name = 'OrderNotFoundError'
    Object.setPrototypeOf(this, OrderNotFoundError.prototype)
  }
}

export class OrderImmutableError extends Error {
  readonly code = 'ORDER_IMMUTABLE' as const
  constructor(public readonly orderId: string, public readonly status: string) {
    super(`Order is ${status}; items cannot be modified: ${orderId}`)
    this.name = 'OrderImmutableError'
    Object.setPrototypeOf(this, OrderImmutableError.prototype)
  }
}

export class ProductNotFoundError extends Error {
  readonly code = 'PRODUCT_NOT_FOUND' as const
  constructor(public readonly productId: string) {
    super(`Product not found: ${productId}`)
    this.name = 'ProductNotFoundError'
    Object.setPrototypeOf(this, ProductNotFoundError.prototype)
  }
}

export class ProductInactiveError extends Error {
  readonly code = 'PRODUCT_INACTIVE' as const
  constructor(public readonly productId: string) {
    super(`Product is inactive: ${productId}`)
    this.name = 'ProductInactiveError'
    Object.setPrototypeOf(this, ProductInactiveError.prototype)
  }
}

export class OrderItemNotFoundError extends Error {
  readonly code = 'ORDER_ITEM_NOT_FOUND' as const
  constructor(public readonly orderItemId: string) {
    super(`Order item not found: ${orderItemId}`)
    this.name = 'OrderItemNotFoundError'
    Object.setPrototypeOf(this, OrderItemNotFoundError.prototype)
  }
}

export class InvalidQuantityError extends Error {
  readonly code = 'INVALID_QUANTITY' as const
  constructor(public readonly quantity: number) {
    super(`Quantity must be >= 1, got: ${quantity}`)
    this.name = 'InvalidQuantityError'
    Object.setPrototypeOf(this, InvalidQuantityError.prototype)
  }
}

// ---------------------------------------------------------------------------
// Helpers (within module)
// ---------------------------------------------------------------------------

const EDITABLE_STATUSES = ['pending', 'preparing'] as const

async function assertOrderEditable(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], orderId: string): Promise<void> {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true },
  })
  if (!order) {
    throw new OrderNotFoundError(orderId)
  }
  if (!EDITABLE_STATUSES.includes(order.status as typeof EDITABLE_STATUSES[number])) {
    throw new OrderImmutableError(orderId, order.status)
  }
}

async function assertProductActive(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], productId: string) {
  const product = await tx.product.findUnique({
    where: { id: productId },
    select: { id: true, isActive: true, priceUgx: true },
  })
  if (!product) {
    throw new ProductNotFoundError(productId)
  }
  if (!product.isActive) {
    throw new ProductInactiveError(productId)
  }
  return product
}

function toDecimal(n: number): Decimal {
  return new Decimal(n)
}

async function recalcAndUpdateOrderTotals(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  orderId: string
): Promise<void> {
  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: { lineTotalUgx: true },
  })
  const subtotal = items.reduce((sum, i) => sum + Number(i.lineTotalUgx), 0)
  const tax = 0
  const total = subtotal + tax
  await tx.order.update({
    where: { id: orderId },
    data: {
      subtotalUgx: toDecimal(subtotal),
      taxUgx: toDecimal(tax),
      totalUgx: toDecimal(total),
    },
  })
}

// ---------------------------------------------------------------------------
// Public write utilities (all transactional)
// ---------------------------------------------------------------------------

export type AddOrderItemParams = {
  orderId: string
  productId: string
  quantity: number
  size?: string | null
  modifier?: string | null
  notes?: string | null
  sortOrder?: number
}

/**
 * Adds an item to an order. Order must exist and be pending or preparing; product must exist and be active; quantity >= 1.
 * Served and cancelled orders are immutable. Recalculates and persists subtotal, tax, total. Transactional.
 */
export async function addOrderItem(params: AddOrderItemParams): Promise<OrderItem> {
  const { orderId, productId, quantity, size, modifier, notes, sortOrder = 0 } = params

  if (quantity < 1) {
    throw new InvalidQuantityError(quantity)
  }

  return prisma.$transaction(async (tx) => {
    await assertOrderEditable(tx, orderId)
    const product = await assertProductActive(tx, productId)
    const unitPrice = Number(product.priceUgx)
    const lineTotal = unitPrice * quantity

    const item = await tx.orderItem.create({
      data: {
        orderId,
        productId,
        quantity,
        unitPriceUgx: toDecimal(unitPrice),
        lineTotalUgx: toDecimal(lineTotal),
        size: size ?? undefined,
        modifier: modifier ?? undefined,
        notes: notes ?? undefined,
        sortOrder,
      },
    })

    await recalcAndUpdateOrderTotals(tx, orderId)
    return item
  })
}

export type UpdateOrderItemQuantityParams = {
  orderId: string
  orderItemId: string
  quantity: number
}

/**
 * Updates an order item's quantity. Order must be pending or preparing; item must exist and belong to order; quantity >= 1.
 * Served and cancelled orders are immutable. Recalculates and persists subtotal, tax, total. Transactional.
 */
export async function updateOrderItemQuantity(params: UpdateOrderItemQuantityParams): Promise<OrderItem> {
  const { orderId, orderItemId, quantity } = params

  if (quantity < 1) {
    throw new InvalidQuantityError(quantity)
  }

  return prisma.$transaction(async (tx) => {
    await assertOrderEditable(tx, orderId)
    const item = await tx.orderItem.findFirst({
      where: { id: orderItemId, orderId },
    })
    if (!item) {
      throw new OrderItemNotFoundError(orderItemId)
    }
    const unitPrice = Number(item.unitPriceUgx)
    const lineTotal = unitPrice * quantity

    const updated = await tx.orderItem.update({
      where: { id: orderItemId },
      data: {
        quantity,
        lineTotalUgx: toDecimal(lineTotal),
      },
    })

    await recalcAndUpdateOrderTotals(tx, orderId)
    return updated
  })
}

export type RemoveOrderItemParams = {
  orderId: string
  orderItemId: string
}

/**
 * Removes an item from an order. Order must be pending or preparing; item must exist and belong to order.
 * Served and cancelled orders are immutable. Recalculates and persists subtotal, tax, total. Transactional.
 */
export async function removeOrderItem(params: RemoveOrderItemParams): Promise<void> {
  const { orderId, orderItemId } = params

  await prisma.$transaction(async (tx) => {
    await assertOrderEditable(tx, orderId)
    const item = await tx.orderItem.findFirst({
      where: { id: orderItemId, orderId },
    })
    if (!item) {
      throw new OrderItemNotFoundError(orderItemId)
    }
    await tx.orderItem.delete({
      where: { id: orderItemId },
    })
    await recalcAndUpdateOrderTotals(tx, orderId)
  })
}
