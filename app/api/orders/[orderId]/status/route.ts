import { NextRequest, NextResponse } from 'next/server'
import { transitionOrderStatus } from '@/lib/pos-service'
import { toPosApiResponse } from '@/lib/pos-api-errors'

// SECURITY: 'served' is NOT allowed here - only checkout/payment flows can mark orders as served
// 'awaiting_payment' is also NOT allowed here - only kitchen can transition ready → awaiting_payment
const VALID_STATUSES = ['pending', 'preparing', 'ready', 'cancelled'] as const

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    const body = await request.json()
    const { newStatus, updatedByStaffId } = body

    if (!VALID_STATUSES.includes(newStatus)) {
      return NextResponse.json({ error: 'newStatus must be one of: pending, preparing, ready, cancelled. Use /checkout to mark as served.' }, { status: 400 })
    }
    if (typeof updatedByStaffId !== 'string' || !updatedByStaffId) {
      return NextResponse.json({ error: 'updatedByStaffId is required (string)' }, { status: 400 })
    }

    const order = await transitionOrderStatus({ orderId, newStatus, updatedByStaffId })
    return NextResponse.json(order)
  } catch (error) {
    return toPosApiResponse(error)
  }
}
