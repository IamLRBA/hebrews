import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { triggerKitchenTicketForOrder } from '@/lib/print-jobs'
import { toPosApiResponse } from '@/lib/pos-api-errors'
import { getAuthenticatedStaff } from '@/lib/pos-auth'
import { getOptionalTerminal } from '@/lib/terminal'
import { assertStaffRole } from '@/lib/domain/role-guard'

const REPRINT_ROLES = ['kitchen', 'cashier', 'manager', 'admin'] as const

/**
 * POST /api/orders/[orderId]/reprint-kitchen
 * Explicit reprint of kitchen ticket. Requires auth and role kitchen, cashier, manager, or admin.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { staffId } = await getAuthenticatedStaff(request)
    await assertStaffRole(staffId, [...REPRINT_ROLES])

    const terminal = await getOptionalTerminal(request).catch(() => null)
    const { orderId } = await params
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true },
    })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    await triggerKitchenTicketForOrder({
      orderId,
      staffId,
      terminalId: terminal?.code ?? null,
      isReprint: true,
    })

    return NextResponse.json({ ok: true, orderId })
  } catch (error) {
    return toPosApiResponse(error)
  }
}
