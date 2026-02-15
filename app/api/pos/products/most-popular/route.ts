import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/** Most popular products in the current shift (by order count). */
export async function GET(request: NextRequest) {
  const shiftId = request.nextUrl.searchParams.get('shiftId')
  if (!shiftId) {
    return NextResponse.json({ error: 'shiftId required' }, { status: 400 })
  }

  const orderIds = await prisma.order.findMany({
    where: { shiftId },
    select: { id: true },
  }).then((rows) => rows.map((r) => r.id))

  if (orderIds.length === 0) {
    return NextResponse.json([])
  }

  const counts = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: { orderId: { in: orderIds } },
    _count: { productId: true },
    orderBy: { _count: { productId: 'desc' } },
    take: 4,
  })

  const productIds = counts.map((c) => c.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    select: { id: true, name: true, priceUgx: true, category: true, section: true, images: true, sizes: true, isHappyHour: true },
  })
  const byId = new Map(products.map((p) => [p.id, p]))
  const result = productIds
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((p) => ({
      productId: p!.id,
      name: p!.name,
      priceUgx: Number(p!.priceUgx),
      category: p!.category,
      section: p!.section,
      images: p!.images ?? [],
      sizes: p!.sizes ?? [],
      isHappyHour: p!.isHappyHour ?? false,
    }))
  return NextResponse.json(result)
}
