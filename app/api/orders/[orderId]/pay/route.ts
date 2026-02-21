import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedStaff } from '@/lib/pos-auth'
import { recordOrderPayment } from '@/lib/payments'
import { toPosApiResponse } from '@/lib/pos-api-errors'

const VALID_PAYMENT_TYPES = ['cash', 'mobile', 'card'] as const

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { staffId } = await getAuthenticatedStaff(request)

    const { orderId } = await params
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    const body = await request.json()
    const { amountUgx, paymentType } = body

    if (typeof amountUgx !== 'number') {
      return NextResponse.json({ error: 'amountUgx is required (number)' }, { status: 400 })
    }
    if (!VALID_PAYMENT_TYPES.includes(paymentType)) {
      return NextResponse.json({ error: 'paymentType must be cash, mobile, or card' }, { status: 400 })
    }

    await recordOrderPayment({
      orderId,
      amountUgx,
      paymentType,
      receivedByStaffId: staffId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return toPosApiResponse(error)
  }
}
