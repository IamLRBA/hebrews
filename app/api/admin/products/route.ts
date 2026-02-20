import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { assertStaffRole } from '@/lib/domain/role-guard'

const STAFF_ID_HEADER = 'x-staff-id'

export async function GET(request: NextRequest) {
  try {
    const staffId = request.headers.get(STAFF_ID_HEADER)?.trim()
    if (!staffId) return NextResponse.json({ error: 'Staff session required' }, { status: 401 })
    await assertStaffRole(staffId, ['admin'])

    const products = await prisma.product.findMany({
      orderBy: [{ category: 'asc' }, { section: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        priceUgx: true,
        category: true,
        section: true,
        images: true,
        stockQty: true,
        isActive: true,
      },
    })
    return NextResponse.json(
      products.map((p) => ({
        productId: p.id,
        id: p.id,
        name: p.name,
        priceUgx: Number(p.priceUgx),
        category: p.category,
        section: p.section,
        images: p.images ?? [],
        stockQty: p.stockQty ?? 0,
        isActive: p.isActive,
      }))
    )
  } catch (error) {
    console.error('[admin/products] GET error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const staffId = request.headers.get(STAFF_ID_HEADER)?.trim()
    if (!staffId) return NextResponse.json({ error: 'Staff session required' }, { status: 401 })
    await assertStaffRole(staffId, ['admin'])

    const body = await request.json()
    const { name, category, section, priceUgx, sizes, images, stockQty, isActive, description, sku } = body

    if (typeof name !== 'string' || !name.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })
    if (typeof category !== 'string' || !category.trim()) return NextResponse.json({ error: 'category is required' }, { status: 400 })
    if (typeof section !== 'string' || !section.trim()) return NextResponse.json({ error: 'section is required' }, { status: 400 })
    const price = Number(priceUgx)
    if (typeof price !== 'number' || isNaN(price) || price < 0) return NextResponse.json({ error: 'priceUgx must be a non-negative number' }, { status: 400 })

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        category: category.trim(),
        section: section.trim(),
        priceUgx: price,
        sizes: Array.isArray(sizes) ? sizes : [],
        images: Array.isArray(images) ? images : [],
        stockQty: typeof stockQty === 'number' && !isNaN(stockQty) ? stockQty : 0,
        isActive: isActive !== false,
        description: typeof description === 'string' ? description.trim() || null : null,
        sku: typeof sku === 'string' && sku.trim() ? sku.trim() : null,
      },
    })
    return NextResponse.json(product)
  } catch (error) {
    console.error('[admin/products] POST error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create product' }, { status: 500 })
  }
}
