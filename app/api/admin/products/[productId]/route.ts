import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { assertStaffRole } from '@/lib/domain/role-guard'

const STAFF_ID_HEADER = 'x-staff-id'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const staffId = request.headers.get(STAFF_ID_HEADER)?.trim()
    if (!staffId) {
      return NextResponse.json({ error: 'Staff session required' }, { status: 401 })
    }
    await assertStaffRole(staffId, ['admin'])

    const { productId } = await params
    if (!productId) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 })
    }

    const body = await request.json()
    const {
      name,
      category,
      section,
      priceUgx,
      sizes,
      images,
      stockQty,
      isActive,
      description,
      sku,
    } = body

    const updateData: Record<string, unknown> = {}
    if (typeof name === 'string' && name.trim()) updateData.name = name.trim()
    if (typeof category === 'string' && category.trim()) updateData.category = category.trim()
    if (typeof section === 'string' && section.trim()) updateData.section = section.trim()
    if (typeof priceUgx === 'number' && !isNaN(priceUgx) && priceUgx >= 0) updateData.priceUgx = priceUgx
    if (Array.isArray(sizes)) updateData.sizes = sizes
    if (Array.isArray(images)) updateData.images = images
    if (typeof stockQty === 'number' && !isNaN(stockQty)) updateData.stockQty = stockQty
    if (typeof isActive === 'boolean') updateData.isActive = isActive
    if (description !== undefined) updateData.description = typeof description === 'string' ? description.trim() || null : null
    if (sku !== undefined) updateData.sku = typeof sku === 'string' && sku.trim() ? sku.trim() : null

    const product = await prisma.product.update({
      where: { id: productId },
      data: updateData,
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error('[admin/products] PUT error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update product' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const staffId = _request.headers.get(STAFF_ID_HEADER)?.trim()
    if (!staffId) {
      return NextResponse.json({ error: 'Staff session required' }, { status: 401 })
    }
    await assertStaffRole(staffId, ['admin'])

    const { productId } = await params
    if (!productId) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 })
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        orderItems: {
          select: { id: true },
        },
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Delete associated order items first (if any)
    if (product.orderItems.length > 0) {
      await prisma.orderItem.deleteMany({
        where: { productId },
      })
    }

    // Then delete the product
    await prisma.product.delete({
      where: { id: productId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/products] DELETE error:', error)
    
    // Handle Prisma foreign key constraint errors
    if (error instanceof Error && error.message.includes('ForeignKeyConstraintError')) {
      return NextResponse.json(
        { error: 'Cannot delete product: it is referenced by existing orders. Please deactivate it instead.' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete product' },
      { status: 500 }
    )
  }
}
