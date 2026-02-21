import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedStaff } from '@/lib/pos-auth'
import { transitionOrderStatus } from '@/lib/pos-service'
import { getOrderDetail } from '@/lib/read-models'
import { toPosApiResponse } from '@/lib/pos-api-errors'

/**
 * Submits order to kitchen: transitions pending → preparing.
 * Sends order to kitchen for preparation.
 * Returns full order detail so frontend can update state without refetch.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const { staffId } = await getAuthenticatedStaff(request)
    const updatedByStaffId = body.updatedByStaffId ?? staffId
    if (typeof updatedByStaffId !== 'string' || !updatedByStaffId) {
      return NextResponse.json({ error: 'updatedByStaffId required' }, { status: 400 })
    }

    await transitionOrderStatus({
      orderId,
      newStatus: 'preparing',
      updatedByStaffId,
    })
    const order = await getOrderDetail(orderId)
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    return NextResponse.json(order)
  } catch (error) {
    return toPosApiResponse(error)
  }
}
