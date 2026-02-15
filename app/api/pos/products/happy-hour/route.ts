import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/** Products marked as Happy Hour. */
export async function GET() {
  const products = await prisma.product.findMany({
    where: { isActive: true, isHappyHour: true },
    orderBy: [{ category: 'asc' }, { section: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, priceUgx: true, category: true, section: true, images: true, sizes: true },
  })
  return NextResponse.json(
    products.map((p) => ({
      productId: p.id,
      name: p.name,
      priceUgx: Number(p.priceUgx),
      category: p.category,
      section: p.section,
      images: p.images ?? [],
      sizes: p.sizes ?? [],
      isHappyHour: true,
    }))
  )
}
