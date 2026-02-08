import { NextRequest, NextResponse } from 'next/server'
import { recordPayment } from '@/lib/pos-service'
import { toPosApiResponse } from '@/lib/pos-api-errors'

const VALID_METHODS = ['cash', 'card', 'mtn_momo', 'airtel_money'] as const
const VALID_STATUSES = ['pending', 'completed', 'failed'] as const

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
    const { amountUgx, method, status, createdByStaffId, reference } = body

    if (typeof amountUgx !== 'number') {
      return NextResponse.json({ error: 'amountUgx is required (number)' }, { status: 400 })
    }
    if (!VALID_METHODS.includes(method)) {
      return NextResponse.json({ error: 'method must be cash, card, mtn_momo, or airtel_money' }, { status: 400 })
    }
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'status must be pending, completed, or failed' }, { status: 400 })
    }
    if (typeof createdByStaffId !== 'string' || !createdByStaffId) {
      return NextResponse.json({ error: 'createdByStaffId is required (string)' }, { status: 400 })
    }

    const payment = await recordPayment({
      orderId,
      amountUgx,
      method,
      status,
      createdByStaffId,
      reference: reference ?? null,
    })
    return NextResponse.json(payment)
  } catch (error) {
    return toPosApiResponse(error)
  }
}
