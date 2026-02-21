import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedStaff } from '@/lib/pos-auth'
import { assertStaffRole } from '@/lib/domain/role-guard'
import { exportOrdersCSV } from '@/lib/export/data-export'
import { appendAuditLog, AuditActionType, AuditEntityType } from '@/lib/audit-log'
import { toPosApiResponse } from '@/lib/pos-api-errors'

/**
 * GET /api/admin/export/orders?format=csv|json&limit=...&from=...&to=...
 * Admin-only. CSV or JSON export of orders with staff/terminal attribution.
 */
export async function GET(request: NextRequest) {
  try {
    const { staffId } = await getAuthenticatedStaff(request)
    await assertStaffRole(staffId, ['admin'])

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv'
    const limit = parseInt(searchParams.get('limit') || '0', 10)
    const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined
    const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined

    if (format === 'json') {
      const { prisma } = await import('@/lib/db')
      const orders = await prisma.order.findMany({
        where: {
          ...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit > 0 ? Math.min(limit, 10000) : 10000,
        include: {
          createdByStaff: { select: { fullName: true } },
          table: { select: { code: true } },
          orderItems: true,
        },
      })
      await appendAuditLog({
        staffId,
        actionType: AuditActionType.EXPORT_ORDERS,
        entityType: AuditEntityType.export,
        newState: { format: 'json', count: orders.length },
      }).catch(() => {})
      return NextResponse.json(orders)
    }

    const csv = await exportOrdersCSV({ limit: limit > 0 ? limit : undefined, from, to })
    await appendAuditLog({
      staffId,
      actionType: AuditActionType.EXPORT_ORDERS,
      entityType: AuditEntityType.export,
      newState: { format: 'csv', rows: csv.split('\n').length - 1 },
    }).catch(() => {})

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch (error) {
    return toPosApiResponse(error)
  }
}
