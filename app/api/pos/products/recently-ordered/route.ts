import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/** Products from recent orders in the current shift (last 20 orders). */
export async function GET(request: NextRequest) {
  const shiftId = request.nextUrl.searchParams.get('shiftId')
  if (!shiftId) {
    return NextResponse.json({ error: 'shiftId required' }, { status: 400 })
  }

  const recentOrders = await prisma.order.findMany({
    where: { shiftId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true },
  })
  const orderIds = recentOrders.map((o) => o.id)

  if (orderIds.length === 0) {
    return NextResponse.json([])
  }

  const items = await prisma.orderItem.findMany({
    where: { orderId: { in: orderIds } },
    select: {
      productId: true,
      product: { select: { id: true, name: true, priceUgx: true, category: true, section: true, images: true, sizes: true, isHappyHour: true } },
      order: { select: { createdAt: true } },
    },
    orderBy: { order: { createdAt: 'desc' } },
  })

  const seen = new Set<string>()
  const products: Array<{
    productId: string
    name: string
    priceUgx: number
    category: string | null
    section: string | null
    images: string[]
    sizes: string[]
    isHappyHour: boolean
  }> = []
  for (const item of items) {
    if (seen.has(item.productId)) continue
    seen.add(item.productId)
    products.push({
      productId: item.product.id,
      name: item.product.name,
      priceUgx: Number(item.product.priceUgx),
      category: item.product.category,
      section: item.product.section,
      images: item.product.images ?? [],
      sizes: item.product.sizes ?? [],
      isHappyHour: item.product.isHappyHour ?? false,
    })
  }
  return NextResponse.json(products)
}
