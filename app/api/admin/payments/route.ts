import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { assertStaffRole } from '@/lib/domain/role-guard'

const STAFF_ID_HEADER = 'x-staff-id'

export async function GET(request: NextRequest) {
  try {
    const staffId = request.headers.get(STAFF_ID_HEADER)?.trim()
    if (!staffId) {
      return NextResponse.json({ error: 'Staff session required' }, { status: 401 })
    }

    await assertStaffRole(staffId, ['admin', 'manager'])

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'completed' | 'pending' | 'failed' | 'all'
    const method = searchParams.get('method') // 'cash' | 'card' | 'mtn_momo' | 'airtel_money' | 'all'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    if (status && status !== 'all') {
      where.status = status
    }
    if (method && method !== 'all') {
      where.method = method
    }
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.createdAt.lte = end
      }
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              orderType: true,
            },
          },
          createdByStaff: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      }),
      prisma.payment.count({ where }),
    ])

    return NextResponse.json({
      payments: payments.map((payment) => ({
        id: payment.id,
        orderId: payment.orderId,
        orderNumber: payment.order.orderNumber,
        orderStatus: payment.order.status,
        orderType: payment.order.orderType,
        amountUgx: Number(payment.amountUgx),
        method: payment.method,
        status: payment.status,
        reference: payment.reference,
        createdAt: payment.createdAt,
        createdByStaffId: payment.createdByStaffId,
        createdByStaffName: payment.createdByStaff?.fullName || 'Unknown',
      })),
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('[admin/payments] GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}
